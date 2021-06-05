const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const AppError = require('./app-error');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, sensors) {
	const app = express();
	app.locals.port = port;
	app.locals.sensors = sensors;
	setupRoutes(app);
	app.listen(port, function() {
		console.log(`listening on port ${port}`);
	});
}

module.exports = { serve };

function setupRoutes(app) {
	const sensors = app.locals.sensors;
	app.use(cors());
	app.use(bodyParser.json());
	app.get('/sensor-types', doList(app, 'sensorTypes'));
	app.get('/sensors', doList(app, 'sensors'));

	app.post('/sensor-types', doCreate(app, 'sensorTypes'));
	app.post('/sensors', doCreate(app, 'sensors'));
	app.post('/sensor-data/:sensorId', doCreate(app, 'sensorData'));

	app.get('/sensor-types/:id', doGet(app, 'sensorTypes'));
	app.get('/sensors/:id', doGet(app, 'sensors'));
	app.get('/sensor-data/:sensorId', doGet(app, 'sensorData'));
	app.get('/sensor-data/:sensorId/:timestamp', doGetTs(app));
	app.use(doErrors()); 
}


function doList(app, col_name) {
	return errorWrap(async function(req, res) {
		const q = req.query || {};
		try {
			let results = {};
			if('sensorTypes' === col_name) {
				results = await app.locals.sensors.findSensorTypes(q);
			} else if('sensors' === col_name) {
				results = await app.locals.sensors.findSensors(q);
			}

			for (const obj of results.data) {
				obj.self = req.protocol + '://' + req.get('host') + req.path + '/' + obj.id;
			}
			results.self = req.protocol + '://' + req.get('host') + req.originalUrl;

			var index = 0, quest = 0;
			if(req.query._index) {
				index = results.self.indexOf("_index") + 7;
			}
			quest = results.self.indexOf("?");
			if(results.nextIndex > 0 && index) { 
				results.next = results.self.substr(0, index) + results.nextIndex + results.self.substr(index + 1);
			} else if(results.nextIndex > 0) {
				if(quest > 0) {
					results.next = results.self + "&_index=" + results.nextIndex;
				} else {
					results.next = results.self + "?_index=" + results.nextIndex;
				}
			}
			if(results.previousIndex > 0 && index) {
				results.prev = results.self.substr(0, index) + results.previousIndex + results.self.substr(index + 1);
			}
			
			res.json(results);
		}
		catch (err) {
			const mapped = mapError(err);
			res.status(NOT_FOUND).json(mapped);
		}
	});
}

function doGet(app, col_name) {
	return errorWrap(async function(req, res) {
		try {
			const query = {...req.params, ...req.query};
			let results = {};
			if('sensorTypes' === col_name) {
				results = await app.locals.sensors.findSensorTypes(query);
			} else if('sensors' === col_name) {
				results = await app.locals.sensors.findSensors(query);
			} else if('sensorData' === col_name) {
				results = await app.locals.sensors.findSensorData(query);
			}

			if (results.length === 0) {
				let throw_err = {
					"errors":[{
					"code":"NOT_FOUND",
					"message":`no data found`
					}]
				};
				res.status(NOT_FOUND).json(throw_err);
				return;
			} else {
				results.self = req.protocol + '://' + req.get('host') + req.originalUrl;
				if('sensorData' === col_name) {
					if(query.timestamp) {
						for (var property1 in results.data) {
							results.data[property1].self = results.self.substr(0, results.self.indexOf('?')) + "/" + results.data[property1].timestamp;
						}
					} else {
						for (var property1 in results.data) {
							results.data[property1].self = results.self + "/" + results.data[property1].timestamp;
						}
					}					
				} else {
					results.data[0].self = results.self;
				}

				res.json(results);
			}
		}
		catch(err) {
			const mapped = mapError(err);
			res.status(NOT_FOUND).json(mapped);
		}
	});
}

function doGetTs(app) {
	return errorWrap(async function(req, res) {
		try {
			const query = {...req.params, ...req.query};
			results = await app.locals.sensors.findSensorData(query);

			if (results.length === 0) {
				let throw_err = {
					"errors":[{
					"code":"NOT_FOUND",
					"message":`no data found`
					}]
				};
				res.status(NOT_FOUND).json(throw_err);
				return;
			} else {
				let ret = { data: []};
				ret.self = req.protocol + '://' + req.get('host') + req.originalUrl;
				for (var property1 in results.data) {
					if(parseInt(req.params.timestamp) === parseInt(results.data[property1].timestamp)) {
						results.data[property1].self = ret.self;
						ret.nextIndex = -1;
						ret.data.push(results.data[property1]);						
						break;
					} else {
						let throw_err = {
							"errors":[{
							"code":"NOT_FOUND",
							"message":`no data for timestamp '${query.timestamp}'`
							}]
						};
						res.status(NOT_FOUND).json(throw_err);
						return;
					}
				}
				
				res.json(ret);
			}
		}
		catch(err) {
			const mapped = mapError(err);
			res.status(NOT_FOUND).json(mapped);
		}
	});
}

function doCreate(app, col_name) {
	return errorWrap(async function(req, res) {
		try {
			const obj = req.body;
			let results = {};
			if('sensorTypes' === col_name) {
				results = await app.locals.sensors.addSensorType(obj);
			} else if('sensors' === col_name) {
				results = await app.locals.sensors.addSensor(obj);
			} else if('sensorData' === col_name) {
				const newObj = {...obj, ...req.params};
				results = await app.locals.sensors.addSensorData(newObj);
			}
			
			res.append('Location', requestUrl(req) + '/' + obj.id);
			res.sendStatus(CREATED);
		}
		catch(err) {
			const mapped = mapError(err);
			res.status(CREATED).json(mapped);
		}
	});
}

function doErrors(app) {
	return async function(err, req, res, next) {
		res.status(SERVER_ERROR);
		res.json({ code: 'SERVER_ERROR', message: err.message });
		console.error(err);
	};
}

function errorWrap(handler) {
	return async (req, res, next) => {
		try {
			await handler(req, res, next);
		}
		catch (err) {
			next(err);
		}
	};
}

function mapError(err) {
	console.error(err);
	return {
		errors: [{
			code: err[0].code,
			message: err[0].msg
		}]
	};
}

function requestUrl(req) {
	const port = req.app.locals.port;
	return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}