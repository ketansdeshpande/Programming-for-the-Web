'use strict';

const assert = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const Mustache = require('mustache');
const querystring = require('querystring');
const widgetView = require('./widget-view');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, model) {
	//@TODO
	let base = '/';
	const app = express();
	app.locals.port = port;
	app.locals.base = base;
	app.locals.model = model;
	process.chdir(__dirname);
	app.use(base, express.static(STATIC_DIR));
	setupTemplates(app);
	setupRoutes(app);
	app.listen(port, function() {
		console.log(`listening on port ${port}`);
	});
}


module.exports = serve;

//@TODO
function setupRoutes(app) {
	const base = app.locals.base;
	app.get(`${base}`, loadPage(app, 'index'));
	app.get(`${base}sensor-types.html`, doSearch(app));
	app.get(`${base}sensor-types/add.html`, loadPage(app, 'add', 'st'));
	app.post(`${base}sensor-types/add.html`, bodyParser.urlencoded({extended: false}), createUpdate(app, 'sensor-types'));
	app.get(`${base}sensors.html`, doSearchSensors(app));
	app.get(`${base}sensors/add.html`, loadPage(app, 'add', 's'));
	app.post(`${base}sensors/add.html`, bodyParser.urlencoded({extended: false}), createUpdate(app, 'sensors'));
}

function createUpdate(app, toUpdate) {
	return async function(req, res) {
		let errors = [];
		let obj = {};
		if(toUpdate === 'sensor-types') {
			obj = getNonEmptyValuesST(req.body);
			errors = validate(obj, toUpdate, ['id', 'modelNumber', 'manufacturer', 'quantity', 'limits']);
		} else if(toUpdate === 'sensors') {
			obj = getNonEmptyValuesS(req.body);
			errors = validate(obj, toUpdate, ['id', 'model', 'period', 'expected']);
		}
		if(!errors) {
			if(toUpdate === 'sensor-types') {
				try {
					if(obj.quantity === "flow") obj.unit = 'gpm';
					if(obj.quantity === "humidity") obj.unit = '%';
					if(obj.quantity === "pressure") obj.unit = 'PSI';
					if(obj.quantity === "temperature") obj.unit = 'C';
					obj.limits = {
						min : obj['limits[min]'],
						max : obj['limits[max]']
					}
					delete obj['limits[min]'];
					delete obj['limits[max]'];
					await app.locals.model.update('sensor-types', obj);
					res.redirect(`${app.locals.base}sensor-types.html?id=${obj.id}`);
				} catch (err) {
					console.error(err);
					errors = wsErrors(err);
				}
			} else if(toUpdate === 'sensors') {
				try {
					obj.expected = {
						min : obj['expected[min]'],
						max : obj['expected[max]']
					}
					delete obj['expected[min]'];
					delete obj['expected[max]'];
					await app.locals.model.update('sensors', obj);
					res.redirect(`${app.locals.base}sensors.html?id=${obj.id}`);
				} catch (err) {
					console.error(err);
					errors = wsErrors(err);
				}
			}
		}
		if(errors) {
			if(toUpdate === 'sensor-types') {
				let model = errorModelST(app, obj, errors);
				model.sensorTypes = model;
				const html = doMustache(app, 'add', model);
				res.send(html);
			} else if(toUpdate === 'sensors') {
				let model = errorModelS(app, obj, errors);
				model.sensor = model;
				const html = doMustache(app, 'add', model);
				res.send(html);
			}
		}
	};
};

function validate(values, mod, requires=[]) {
	const errors = {};
	requires.forEach(function (name) {
		if( name === 'limits' ) {
			if( values['limits[min]'] === undefined || values['limits[max]'] === undefined )
				errors['limits'] = `Both Min and Max values must be specified for 'Limits'.`;
		} else if (name === 'expected') {
			if( values['expected[min]'] === undefined || values['expected[max]'] === undefined )
				errors['expected'] = `Both Min and Max values must be specified for 'Expected'.`;
		} else if (values[name] === undefined) {
			if(mod === 'sensor-types') errors[name] = `A value for '${FIELDS_INFO_ST_INPUT[name].friendlyName}' must be provided`;
			if(mod === 'sensors') errors[name] = `A value for '${FIELDS_INFO_S_INPUT[name].friendlyName}' must be provided`;
		}
	});
	for (const name of Object.keys(values)) {
		let fieldInfo = {};
		if(mod === 'sensor-types') {
			if( name !== 'limits[min]' && name !== 'limits[max]' ) {
				fieldInfo = FIELDS_INFO_ST_INPUT[name];
			} else if( name === 'limits[min]' ) {
				fieldInfo = FIELDS_INFO_ST_INPUT['limits'].attr[0];
			} else if( name === 'limits[max]' ) {
				fieldInfo = FIELDS_INFO_ST_INPUT['limits'].attr[1];
			}
		} else if(mod === 'sensors') {
			if( name !== 'expected[min]' && name !== 'expected[max]' ) {
				fieldInfo = FIELDS_INFO_S_INPUT[name];
			} else if( name === 'expected[min]' ) {
				fieldInfo = FIELDS_INFO_S_INPUT['expected'].attr[0];
			} else if( name === 'expected[max]' ) {
				fieldInfo = FIELDS_INFO_S_INPUT['expected'].attr[1];
			}
		}
		const value = values[name];
		if (fieldInfo.regex && !value.match(fieldInfo.regex)) {
			let fieldName = name.split('[');
			if(fieldName[1]) {
				errors[fieldName[0]] = fieldInfo.error;
			} else {
				errors[name] = fieldInfo.error;
			}
		}
	}
	return Object.keys(errors).length > 0 && errors;
}

const FIELDS_INFO_ST = {
	manufacturer: {
		friendlyName: 'Manufacturer',
		class: 'manufacturer',
		isSearch: true,
		regex: /^[a-zA-Z\-\' ]+$/,
		error: "Manufacturer field can only contain alphabetics, -, ' or space"
	},
	id: {
		friendlyName: 'Sensor Type ID',
		class: 'sensor-type-id',
		isSearch: true,
		isId: true,
		regex: /^[A-Za-z0-9\-_]+$/,
		error: 'Sensor Type Id field can only contain alphanumerics, - or _ '
	},
	modelNumber: {
		friendlyName: 'Model Number',
		class: 'model-number',
		isSearch: true,
		regex: /^[a-zA-Z\-\' ]+$/,
		error: "Model Number field can only contain alphabetics, -, ' or space"
	},
	quantity: {
		type: 'select',
		friendlyName: 'Measure',
		class: 'quantity',
		isSearch: true,
		isSelect: true,
		error: "Quantity field can only have values temperature, pressure, flow or humidity.",
		choices: [
			{
				value: '',
				label: 'Select'
			},
			{
				value: 'temperature',
				label: 'Temperature'
			},
			{
				value: 'pressure',
				label: 'Pressure'
			},
			{
				value: 'flow',
				label: 'Flow Rate'
			},
			{
				value: 'humidity',
				label: 'Relative Humidity'
			}
		]
	},
	limits: {
		type: 'interval',
		isInterval: true,
		friendlyName: 'Limits',
		isSearch: false,
		isRequired: true,
		name: 'limits',
		attr: [
			{
				friendlyName: 'Min',
				name: 'min',
				value: '',
				class: 'limits-min',
				label: 'limits-min',
				regex: /^[0-9]+$/,
				error: "Min for 'Limits' must be a number."
			},
			{
				friendlyName: 'Max',
				name: 'max',
				value: '',
				class: 'limits-max',
				label: 'limits-max',
				regex: /^[0-9]+$/,
				error: "Max for 'Limits' must be a number."
			}
		]
	}
};

const FIELDS_INFO_ST_INPUT = {
	id: {
		friendlyName: 'Sensor Type ID',
		class: 'sensor-type-id',
		isSearch: true,
		isId: true,
		isRequired: true,
		value: '',
		regex: /^[A-Za-z0-9\-_]+$/,
		error: 'Sensor Type Id field can only contain alphanumerics, - or _ '
	},
	modelNumber: {
		friendlyName: 'Model Number',
		class: 'model-number',
		isSearch: true,
		isRequired: true,
		value: '',
		regex: /^[a-zA-Z\-\' ]+$/,
		error: "Model Number field can only contain alphabetics, -, ' or space"
	},
	manufacturer: {
		friendlyName: 'Manufacturer',
		class: 'manufacturer',
		isSearch: true,
		isRequired: true,
		value: '',
		regex: /^[a-zA-Z\-\' ]+$/,
		error: "Manufacturer field can only contain alphabetics, -, ' or space"
	},
	quantity: {
		type: 'select',
		friendlyName: 'Measure',
		class: 'quantity',
		isSearch: true,
		isRequired: true,
		isSelect: true,
		choices: [
			{
				value: '',
				label: 'Select',
				isChosen: ''
			},
			{
				value: 'temperature',
				label: 'Temperature',
				isChosen: ''
			},
			{
				value: 'pressure',
				label: 'Pressure',
				isChosen: ''
			},
			{
				value: 'flow',
				label: 'Flow Rate',
				isChosen: ''
			},
			{
				value: 'humidity',
				label: 'Relative Humidity',
				isChosen: ''
			}
		],
		value: ''
	},
	limits: {
		type: 'interval',
		isInterval: true,
		friendlyName: 'Limits',
		isSearch: false,
		isRequired: true,
		name: 'limits',
		attr: [
			{
				friendlyName: 'Min',
				name: 'min',
				value: '',
				class: 'limits-min',
				label: 'limits-min',
				regex: /^[0-9]+$/,
				error: "Min for 'Limits' must be a number."
			},
			{
				friendlyName: 'Max',
				name: 'max',
				value: '',
				class: 'limits-max',
				label: 'limits-max',
				regex: /^[0-9]+$/,
				error: "Min for 'Limits' must be a number."
			}
		]
	}
};

const FIELDS_ST = Object.keys(FIELDS_INFO_ST).map((n) => Object.assign({name: n}, FIELDS_INFO_ST[n]));

const FIELDS_ST_INPUT = Object.keys(FIELDS_INFO_ST_INPUT).map((n) => Object.assign({name: n}, FIELDS_INFO_ST_INPUT[n]));

const FIELDS_INFO_S = {
	id: {
		friendlyName: 'Sensor ID',
		class: 'sensor-id',
		isSearch: true,
		isId: true,
		isRequired: true,
		regex: /^[A-Za-z0-9\-_]+$/,
		error: 'Sensor Id field can only contain alphanumerics, - or _ '
	},
	model: {
		friendlyName: 'Model',
		class: 'model',
		isSearch: true,
		isRequired: true,
		regex: /^[A-Za-z0-9\-_]+$/,
		error: 'Model field can only contain alphanumerics, - or _ '
	},
	period: {
	  friendlyName: 'Period',
	  class: 'period',
	  isSearch: true,
	  isRequired: true,
	  regex: /^([+-]?[1-9]\d*|0)$/,
	  error: "Period field can only contain integer"
	},
	expected: {
		friendlyName: 'Expected Range',
		type: 'interval',
		isInterval: true,
		isSearch: false,
		isRequired: true,
		attr : [
			{
				friendlyName: 'Min',
				name: 'min',
				class: 'expected-min',
				isSearch: true,
				isRequired: true,
				regex: /^[0-9]+$/,
				error: "Min for 'Expected Range' must be a number."
			},
			{
				friendlyName: 'Max',
				name: 'max',
				class: 'expected-max',
				isSearch: true,
				isRequired: true,
				regex: /^[0-9]+$/,
				error: "Max for 'Expected Range' must be a number."
			}
		]
	}
};

const FIELDS_INFO_S_INPUT = {
	id: {
		friendlyName: 'Sensor ID',
		class: 'sensor-id',
		isSearch: true,
		isRequired: true,
		isId: true,
		regex: /^[A-Za-z0-9\-_]+$/,
		error: 'Sensor Id field can only contain alphanumerics, - or _ '
	},
	model: {
		friendlyName: 'Model',
		class: 'model',
		isRequired: true,
		isSearch: true,
		regex: /^[A-Za-z0-9\-_]+$/,
		error: 'Model field can only contain alphanumerics, - or _ '
	},
	period: {
	  friendlyName: 'Period',
	  class: 'period',
	  isRequired: true,
	  isSearch: true,
	  regex: /^([+-]?[1-9]\d*|0)$/,
	  error: "Period field can only contain integer"
	},
	expected: {
		friendlyName: 'Expected Range',
		isRequired: true,
		type: 'interval',
		isInterval: true,
		isSearch: false,
		attr : [
			{
				name: 'min',
				friendlyName: 'Min',
				class: 'expected-min',
				isSearch: true,
				isRequired: true,
				regex: /^[0-9]+$/,
				error: "Min for 'Expected Range' must be a number."
			},
			{
				name: 'max',
				friendlyName: 'Max',
				class: 'expected-max',
				isSearch: true,
				isRequired: true,
				regex: /^[0-9]+$/,
				error: "Max for 'Expected Range' must be a number."
			}
		]
	}
};

const FIELDS_S = Object.keys(FIELDS_INFO_S).map((n) => Object.assign({name: n}, FIELDS_INFO_S[n]));

const FIELDS_S_INPUT = Object.keys(FIELDS_INFO_S_INPUT).map((n) => Object.assign({name: n}, FIELDS_INFO_S_INPUT[n]));

function loadPage(app, template, mod='') {
	return async function(req, res) {
		let model = { base: app.locals.base };
		if(template === 'add') {
			if(mod === 'st') {
				const fields = sensorTypeObj.map((u) => ({fields: fieldsWithValuesSTInput(u)}));
				model = { base: app.locals.base, sensorTypes: fields };
			} else if(mod === 's') {
				const fields = sensorObj.map((u) => ({fields: fieldsWithValuesSInput(u)}));
				model = { base: app.locals.base, sensor: fields };
			}
		}
		const html = doMustache(app, template, model);
		res.send(html);
	};
}

const sensorTypeObj = [{ 
	id: '',
	manufacturer: '',
	modelNumber: '',
	quantity: '',
	limits: { min: '', max: '' }
}];

function doSearch(app) {
	return async function(req, res) {
		var sensorTypes = [];
		let errors = undefined;
		const search = getNonEmptyValuesST(req.query);
		const query = {...search, ...req.query};
		try {
			sensorTypes = await app.locals.model.list('sensor-types', query);
		} catch (err) {
			console.error(err);
			errors = {_: 'No results found.'};
		}
		if( errors ) {
			const model = errorModelST(app, search, errors);
			for (const property in search) {
				for (const k in FIELDS_ST_INPUT) {
					if( FIELDS_ST_INPUT[k].name === property ) {
						if( property === 'quantity' ) {
							for(let i=0; i<FIELDS_ST_INPUT[k].choices.length; i++) {
								if( FIELDS_ST_INPUT[k].choices[i].value === search[property] ) {
									FIELDS_ST_INPUT[k].choices[i].isChosen = true;
								}
							}
						} else {
							FIELDS_ST_INPUT[k].value = search[property];
						}
					}
				}
			}
			const fieldsInput = sensorTypeObj.map((u) => ({id: u.id, fields: fieldsWithValuesSTInput(u)}));
			model.sensorTypesInput = fieldsInput;
			const html = doMustache(app, 'sensor-types', model);
			res.send(html);
		} else {
			if (sensorTypes.data.length === 0) {
				errors = {_: 'No results found.'};
			}

			for (const k in FIELDS_ST_INPUT) {
				if( FIELDS_ST_INPUT[k].name === 'quantity' ) {
					for(let i=0; i<FIELDS_ST_INPUT[k].choices.length; i++) {
						FIELDS_ST_INPUT[k].choices[i].isChosen = '';
					}
				} else {
					FIELDS_ST_INPUT[k].value = '';
				}
			}

			let model, template;
			if (sensorTypes.data.length > 0) {
				template = 'sensor-types';
				const fields = sensorTypes.data.map((u) => ({id: u.id, fields: fieldsWithValuesST(u)}));
				const directNext = sensorTypes.next ? sensorTypes.next.split('?') : undefined;
				const directPrev = sensorTypes.prev ? sensorTypes.prev.split('?') : undefined;
				if(directNext) fields.next = '?' + directNext[1];
				if(directPrev) fields.prev = '?' + directPrev[1];
				model = { base: app.locals.base, sensorTypes: fields };
			} else {
				template =  'sensor-types';
				model = errorModelST(app, search, errors);
			}
			for (const property in search) {
				for (const k in FIELDS_ST_INPUT) {
					if( FIELDS_ST_INPUT[k].name === property ) {
						if( property === 'quantity' ) {
							for(let i=0; i<FIELDS_ST_INPUT[k].choices.length; i++) {
								if( FIELDS_ST_INPUT[k].choices[i].value === search[property] ) {
									FIELDS_ST_INPUT[k].choices[i].isChosen = true;
								}
							}
						} else {
							FIELDS_ST_INPUT[k].value = search[property];
						}
					}
				}
			}
			const fieldsInput = sensorTypeObj.map((u) => ({id: u.id, fields: fieldsWithValuesSTInput(u)}));
			model.sensorTypesInput = fieldsInput;
			model.isError = true;
			const html = doMustache(app, template, model);
			res.send(html);
		}
	};
}

const sensorObj = [{ 
	id: '',
	model: '',
	period: '',
	expected: { min: '', max: '' }
}];

function doSearchSensors(app) {
	return async function(req, res) {
		var sensors = [];
		let errors = undefined;
		const search = getNonEmptyValuesS(req.query);
		const query = {...search, ...req.query};
		try {
			sensors = await app.locals.model.list('sensors', query);
		} catch (err) {
			console.error(err);
			errors = {_: 'No results found.'};
		}
		
		if( errors ) {
			const model = errorModelS(app, search, errors);
			for (const property in search) {
				for (const k in FIELDS_S_INPUT) {
					if( FIELDS_S_INPUT[k].name === property ) {
						FIELDS_S_INPUT[k].value = search[property];
					}
				}
			}
			const fieldsInput = sensorObj.map((u) => ({id: u.id, fields: fieldsWithValuesSInput(u)}));
			model.sensorInput = fieldsInput;
			const html = doMustache(app, 'sensors', model);
			res.send(html);
		} else {
			if (sensors.data.length === 0) {
				errors = {_: 'No results found.'};
			}

			for (const k in FIELDS_S_INPUT) {
				FIELDS_S_INPUT[k].value = '';
			}

			let model, template;
			if (sensors.data.length > 0) {
				template = 'sensors';
				const fields = sensors.data.map((u) => ({id: u.id, fields: fieldsWithValuesS(u)}));
				const directNext = sensors.next ? sensors.next.split('?') : undefined;
				const directPrev = sensors.prev ? sensors.prev.split('?') : undefined;
				if(directNext) fields.next = '?' + directNext[1];
				if(directPrev) fields.prev = '?' + directPrev[1];
				model = { base: app.locals.base, sensors: fields };
			} else {
				template = 'sensors';
				model = errorModelS(app, search, errors);
			}
			for (const property in search) {
				for (const k in FIELDS_S_INPUT) {
					if( FIELDS_S_INPUT[k].name === property ) {
						FIELDS_S_INPUT[k].value = search[property];
					}
				}
			}
			const fieldsInput = sensorObj.map((u) => ({id: u.id, fields: fieldsWithValuesSInput(u)}));
			model.sensorInput = fieldsInput;
			model.isError = true;
			const html = doMustache(app, template, model);
			res.send(html);
		}
	};
}

/** Return a model suitable for mixing into a template */
function errorModelST(app, values={}, errors={}) {
	return {
	  base: app.locals.base,
	  errors: errors._,
	  fields: fieldsWithValuesSTInput(values, errors)
	};
}

function errorModelS(app, values={}, errors={}) {
	return {
	  base: app.locals.base,
	  errors: errors._,
	  fields: fieldsWithValuesS(values, errors)
	};
}

function getNonEmptyValuesST(values) {
	const out = {};
	Object.keys(values).forEach(function(k) {
		if(k === 'limits[min]' ){
			const v = values['limits[min]'];
			if (v && v.trim().length > 0) out[k] = v.trim();
		} else if( k === 'limits[max]') {
			const v = values['limits[max]'];
			if (v && v.trim().length > 0) out[k] = v.trim();
		} else if (FIELDS_INFO_ST_INPUT[k] !== undefined) {
			const v = values[k];
			if (v && v.trim().length > 0) out[k] = v.trim();
		}
	});
	return out;
}

function getNonEmptyValuesS(values) {
	const out = {};
	Object.keys(values).forEach(function(k) {
		if(k === 'expected[min]' ){
			const v = values['expected[min]'];
			if (v && v.trim().length > 0) out[k] = v.trim();
		} else if( k === 'expected[max]') {
			const v = values['expected[max]'];
			if (v && v.trim().length > 0) out[k] = v.trim();
		} else if (FIELDS_INFO_S[k] !== undefined) {
		const v = values[k];
		if (v && v.trim().length > 0) out[k] = v.trim();
	  }
	});
	return out;
}

function fieldsWithValuesST(values, errors={}) {
	return FIELDS_ST.map(function (info) {
		const name = info.name;
		const extraInfo = { value: values[name] };
		info.value = values[name];
		if (errors[name]) extraInfo.errorMessage = errors[name];
		return Object.assign(extraInfo, info);
	});
}

function fieldsWithValuesS(values, errors={}) {
	return FIELDS_S.map(function (info) {
		const name = info.name;
		const extraInfo = { value: values[name] };
		info.value = values[name];
		if (errors[name]) extraInfo.errorMessage = errors[name];
		return Object.assign(extraInfo, info);
	});
}

function fieldsWithValuesSTInput(values, errors={}) {
	return FIELDS_ST_INPUT.map(function (info) {
		const name = info.name;
		const extraInfo = { value: values[name] };
		if(info.name === "quantity") info.choices.map(function(e) { if(e.value===values[name]) e.isChosen = true;});
		info.value = values[name];
		if (errors[name]) extraInfo.errorMessage = errors[name];
		return Object.assign(extraInfo, info);
	});
}

function fieldsWithValuesSInput(values, errors={}) {
	return FIELDS_S_INPUT.map(function (info) {
		const name = info.name;
		const extraInfo = { value: values[name] };
		info.value = values[name];
		if (errors[name]) extraInfo.errorMessage = errors[name];
		return Object.assign(extraInfo, info);
	});
}

function doMustache(app, templateId, view) {
	const templates = { footer: app.templates.footer };
	return Mustache.render(app.templates[templateId], view, templates);
}

function setupTemplates(app) {
	app.templates = {};
	for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
	  const m = fname.match(/^([\w\-]+)\.ms$/);
	  if (!m) continue;
	  try {
		app.templates[m[1]] =
	  String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
	  }
	  catch (e) {
		console.error(`cannot read ${fname}: ${e}`);
		process.exit(1);
	  }
	}
  }

function wsErrors(err) {
	let msg = [];
	for(const errMsg of err.errors) {
		msg.push(errMsg.message);
	}
	if(msg.length == 0) {
		msg.push('web service error');
	}

	console.error(msg);
	return { _: msg };
}