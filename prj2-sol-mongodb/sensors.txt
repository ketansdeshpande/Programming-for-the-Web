'use strict';

const AppError = require('./app-error');
const validate = require('./validate');

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

class Sensors {

	constructor(client, db) {
		this.client = client;
		this.db = db;
	}
  /** Return a new instance of this class with database as
   *  per mongoDbUrl.  Note that mongoDbUrl is expected to
   *  be of the form mongodb://HOST:PORT/DB.
   */
	static async newSensors(mongoDbUrl) {
		//@TODO
		var regex = RegExp('^(mongodb:(?:\/{2})?)((\w+?):(\w+?)@|:?@?)(\w+?)(:(\d+))?\/(\w+?)$');
		if( regex.test(mongoDbUrl) || 1 ) {
			let MONGO_URL = mongoDbUrl.substring(0, mongoDbUrl.lastIndexOf("/"));
			const client = await mongo.connect(MONGO_URL, MONGO_OPTIONS);

			let split_array = mongoDbUrl.split('/');
			let DB_NAME = split_array[split_array.length-1];
			const db = client.db(DB_NAME, { useUnifiedTopology: true });
			return new Sensors(client, db);
		} else {
			const err = `Connection URL is invalid.`;
			throw [ new AppError('MongoDB', err) ];
		}
	}

  /** Release all resources held by this Sensors instance.
   *  Specifically, close any database connections.
   */
	async close() {
		//@TODO
		await this.client.close();
	}

  /** Clear database */
	async clear() {
		//@TODO
		await this.db.collection( COLLECTION_NAMES.SENSOR_TYPES ).drop();
		await this.db.collection( COLLECTION_NAMES.SENSORS ).drop();
		await this.db.collection( COLLECTION_NAMES.SENSOR_DATA ).drop();
	}

  /** Subject to field validation as per validate('addSensorType',
   *  info), add sensor-type specified by info to this.  Replace any
   *  earlier information for a sensor-type with the same id.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
	async addSensorType(info) {
		const sensorType = validate('addSensorType', info);
		//@TODO
		const st_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_TYPES );
		await st_collection.replaceOne( {id: sensorType.id}, sensorType, { upsert: true });
	}
  
  /** Subject to field validation as per validate('addSensor', info)
   *  add sensor specified by info to this.  Note that info.model must
   *  specify the id of an existing sensor-type.  Replace any earlier
   *  information for a sensor with the same id.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
	async addSensor(info) {
		const sensor = validate('addSensor', info);
		//@TODO
		const st_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_TYPES );
		const result = await st_collection.findOne({id: sensor.model});
		const s_collection = await this.db.collection( COLLECTION_NAMES.SENSORS );
		if(result) {
			await s_collection.replaceOne( {id: sensor.id}, sensor, { upsert: true });
		} else {
			throw [ new AppError('Model not found', sensor.model) ];
		}
	}

  /** Subject to field validation as per validate('addSensorData',
   *  info), add reading given by info for sensor specified by
   *  info.sensorId to this. Note that info.sensorId must specify the
   *  id of an existing sensor.  Replace any earlier reading having
   *  the same timestamp for the same sensor.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
	async addSensorData(info) {
		const sensorData = validate('addSensorData', info);
		//@TODO
		const s_collection = await this.db.collection( COLLECTION_NAMES.SENSORS );
		const s_result = await s_collection.findOne({id: sensorData.sensorId});
		const sd_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_DATA );
		if(s_result) {
			await sd_collection.replaceOne({sensorId: sensorData.sensorId, timestamp: sensorData.timestamp}, sensorData, { upsert: true });
		} else {
			throw [ new AppError('Unknown sensor id', sensorData.sensorId) ];
		}
	}

  /** Subject to validation of search-parameters in info as per
   *  validate('findSensorTypes', info), return all sensor-types which
   *  satisfy search specifications in info.  Note that the
   *  search-specs can filter the results by any of the primitive
   *  properties of sensor types (except for meta-properties starting
   *  with '_').
   *
   *  The returned value should be an object containing a data
   *  property which is a list of sensor-types previously added using
   *  addSensorType().  The list should be sorted in ascending order
   *  by id.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property for the next search.  Note that the _index
   *  (when set to the lastIndex) and _count search-spec
   *  meta-parameters can be used in successive calls to allow
   *  scrolling through the collection of all sensor-types which meet
   *  some filter criteria.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
	async findSensorTypes(info) {
		//@TODO
		const searchSpecs = validate('findSensorTypes', info);
		const st_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_TYPES );
		const st_result = await st_collection.find().toArray();
		let collection = {};
		for(let i=0; i<st_result.length; i++) {
			delete st_result[i]._id;
			collection[st_result[i].id] = st_result[i];
		}
		const { data, nextIndex } = await findInCollection(collection, searchSpecs, COLLECTION_NAMES.SENSOR_TYPES);
		return { data, nextIndex };
	}
  
  /** Subject to validation of search-parameters in info as per
   *  validate('findSensors', info), return all sensors which satisfy
   *  search specifications in info.  Note that the search-specs can
   *  filter the results by any of the primitive properties of a
   *  sensor (except for meta-properties starting with '_').
   *
   *  The returned value should be an object containing a data
   *  property which is a list of all sensors satisfying the
   *  search-spec which were previously added using addSensor().  The
   *  list should be sorted in ascending order by id.
   *
   *  If info specifies a truthy value for a _doDetail meta-property,
   *  then each sensor S returned within the data array will have an
   *  additional S.sensorType property giving the complete sensor-type
   *  for that sensor S.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property for the next search.  Note that the _index (when 
   *  set to the lastIndex) and _count search-spec meta-parameters can be used
   *  in successive calls to allow scrolling through the collection of
   *  all sensors which meet some filter criteria.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
	async findSensors(info) {
		//@TODO
		const searchSpecs = validate('findSensors', info);
		const st_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_TYPES );
		const s_collection = await this.db.collection( COLLECTION_NAMES.SENSORS );
		if(info._index) delete info._index;
		if(info._count) delete info._count;
		const s_result = await s_collection.find(info).toArray();
		let collection = {};
		for(let i=0; i<s_result.length; i++) {
			delete s_result[i]._id;
			collection[s_result[i].id] = s_result[i];
		}
		const { data, nextIndex } = await findInCollection(collection, searchSpecs, COLLECTION_NAMES.SENSORS);
		if (searchSpecs.doDetail) {
			for (const sensor of data) {
				sensor.sensorType = await st_collection.find({id: sensor.model}).toArray();
			}
		}

		return { data, nextIndex };
	}
  
  /** Subject to validation of search-parameters in info as per
   *  validate('findSensorData', info), return all sensor readings
   *  which satisfy search specifications in info.  Note that info
   *  must specify a sensorId property giving the id of a previously
   *  added sensor whose readings are desired.  The search-specs can
   *  filter the results by specifying one or more statuses (separated
   *  by |).
   *
   *  The returned value should be an object containing a data
   *  property which is a list of objects giving readings for the
   *  sensor satisfying the search-specs.  Each object within data
   *  should contain the following properties:
   * 
   *     timestamp: an integer giving the timestamp of the reading.
   *     value: a number giving the value of the reading.
   *     status: one of "ok", "error" or "outOfRange".
   *
   *  The data objects should be sorted in reverse chronological
   *  order by timestamp (latest reading first).
   *
   *  If the search-specs specify a timestamp property with value T,
   *  then the first returned reading should be the latest one having
   *  timestamp <= T.
   * 
   *  If info specifies a truthy value for a doDetail property, 
   *  then the returned object will have additional 
   *  an additional sensorType giving the sensor-type information
   *  for the sensor and a sensor property giving the sensor
   *  information for the sensor.
   *
   *  Note that the timestamp search-spec parameter and _count
   *  search-spec meta-parameters can be used in successive calls to
   *  allow scrolling through the collection of all readings for the
   *  specified sensor.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
	async findSensorData(info) {
		//@TODO
		// return { data: [], };
		const searchSpecs = validate('findSensorData', info);
		const { sensorId, timestamp, _count, statuses } = searchSpecs;
		const s_collection = await this.db.collection( COLLECTION_NAMES.SENSORS );
		let sensor = await s_collection.find({id:sensorId}).toArray();
		sensor = sensor[0];
		if (!sensor) throw [ new AppError('X_ID', `unknown sensor id "${sensorId}"`) ];
		delete sensor._id;

		const st_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_TYPES );
		let sensorType = await st_collection.find({id:sensor.model}).toArray();
		sensorType = sensorType[0];
		assert(sensorType);
		delete sensorType._id;

		const sd_collection = await this.db.collection( COLLECTION_NAMES.SENSOR_DATA );
		let sensorDataRes = await sd_collection.find({sensorId:sensorId}).toArray();

		let timestampArr = [];
		for(let i=0; i<sensorDataRes.length; i++) {
			timestampArr.push(sensorDataRes[i].timestamp);
		}

		timestampArr = timestampArr.reverse();
		let sensorData = {
			sensorId: sensorId,
			earliest: timestampArr[0],
			latest: timestampArr[timestampArr.length-1],
			data: {}
		};
		for(let i=0; i<sensorDataRes.length; i++) {
			sensorData.data[sensorDataRes[i].timestamp] = sensorDataRes[i].value;
		}
		if (!sensorData) throw [ new AppError('NO_DATA', `no sensor data for sensor "${sensorId}"`) ];

		const [period, latest] = [Number(sensor.period), sensorData.latest];
		const startTime = (timestamp > latest) ? latest : latest - Math.ceil((latest - timestamp)/period)*period;

		const data = [];

		for (let t = startTime; t >= sensorData.earliest && data.length < _count; t = t - period) {
			const v = sensorData.data[String(t)];
			if (v === undefined) continue;
			const status = !inRange(v, sensorType.limits) ? 'error' : !inRange(v, sensor.expected) ? 'outOfRange' : 'ok';
			if (statuses.has(status)) {
				data.push({
				timestamp: t,
				value: v,
				status,
				});
			}
		}
		const ret = { data };
		if (searchSpecs._doDetail) {
			ret.sensorType = sensorType; ret.sensor = sensor;
		}
		return ret;
	}

} //class Sensors

module.exports = Sensors.newSensors;

//Options for creating a mongo client
const MONGO_OPTIONS = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

const COLLECTION_NAMES = {
	SENSOR_TYPES : "sensor-types",
	SENSORS : "sensors",
	SENSOR_DATA : "sensor-data"
};

function inRange(value, range) {
	return Number(range.min) <= value && value <= Number(range.max);
}

async function findInCollection(collection, searchSpecs, name) {
  const data = [];
  let nextIndex = -1;
  if (searchSpecs.id) {
    const value = collection[searchSpecs.id];
    if (value) {
      data.push(value);
    }
    else {
      throw [ new AppError('DATA_NOT_FOUND', `cannot find ${name} for id "${searchSpecs.id}"`) ];
    }
  }
  else {
    const ids = Object.keys(collection);
    ids.sort();
    const {_index, _count} = searchSpecs;
    let i = (_index < 0) ? 0 : _index;
    nextData:
    for (i = i; i < ids.length && data.length < _count; i++) {
      const d = collection[ids[i]];
      for (const k of Object.keys(d)) {
		const s = searchSpecs[k];
		if (s !== undefined && s !== null && String(d[k]) !== s) {
			continue nextData;
		}
      }
      data.push(d);
    	
    }
    nextIndex = (i < ids.length) ? i : -1;
  }
  return { data, nextIndex };
}
