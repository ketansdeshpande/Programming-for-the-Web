'use strict';

const assert = require('assert');

Object.prototype.isEmpty = function() {
    for(var key in this) {
        if(this.hasOwnProperty(key))
            return false;
    }
    return true;
}

class Sensors {

  constructor() {
    //@TODO
    this.clear();
  }

  /** Clear out all data from this object. */
  async clear() {
    this.allSensorTypes = [];
    this.allSensors     = [];
    this.allSensorData  = [];
  }

  /** Subject to field validation as per FN_INFOS.addSensorType,
   *  add sensor-type specified by info to this.  Replace any
   *  earlier information for a sensor-type with the same id.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensorType(info) {
    const sensorType = validate('addSensorType', info);
    if(!(this.allSensorTypes.some(obj => obj.id == sensorType.id)))
      this.allSensorTypes.push(sensorType);
    else
      this.allSensorTypes.splice(this.allSensorTypes.findIndex(item => item.id === sensorType.id), 1, sensorType);
    this.allSensorTypes.sort(sortObjectsById);
  }
  
  /** Subject to field validation as per FN_INFOS.addSensor, add
   *  sensor specified by info to this.  Replace any earlier
   *  information for a sensor with the same id.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensor(info) {
    const sensor = validate('addSensor', info);
    if(!(this.allSensorTypes.some(obj => obj.id == sensor.model))) {
      console.log("wrong sensor type");
    } else {
      if(!(this.allSensors.some(obj => obj.id == sensor.id)))
        this.allSensors.push(sensor);
      else
        this.allSensors.splice(this.allSensors.findIndex(item => item.id === sensor.id), 1, sensor);
      this.allSensors.sort(sortObjectsById);
    }
  }

  /** Subject to field validation as per FN_INFOS.addSensorData, add
   *  reading given by info for sensor specified by info.sensorId to
   *  this. Replace any earlier reading having the same timestamp for
   *  the same sensor.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensorData(info) {
    const sensorData = validate('addSensorData', info);
    if(!(this.allSensorData.some(obj => obj.timestamp == sensorData.timestamp)))
      this.allSensorData.push(sensorData);
    else
      this.allSensorData.splice(this.allSensorData.findIndex(item => item.timestamp === sensorData.timestamp), 1, sensorData);
  }

  /** Subject to validation of search-parameters in info as per
   *  FN_INFOS.findSensorTypes, return all sensor-types which
   *  satisfy search specifications in info.  Note that the
   *  search-specs can filter the results by any of the primitive
   *  properties of sensor types.  
   *
   *  The returned value should be an object containing a data
   *  property which is a list of sensor-types previously added using
   *  addSensorType().  The list should be sorted in ascending order
   *  by id.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  index property for the next search.  Note that the index (when 
   *  set to the lastIndex) and count search-spec parameters can be used
   *  in successive calls to allow scrolling through the collection of
   *  all sensor-types which meet some filter criteria.
   *
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensorTypes(info) {
    const searchSpecs = validate('findSensorTypes', info);
    if(info.isEmpty()) {
      var counter = 5, result = [];
      for(let i=0; i<counter; i++) {
        result.push(this.allSensorTypes[i]);
      }
    } else if(info.hasOwnProperty('index') || info.hasOwnProperty('count')) {
      var startPoint = info.index ? parseInt(info.index, 10) : 0,
      counter = info.count ? parseInt(info.count, 10) : 5, result = [];
      for(let i=startPoint; i<parseInt(startPoint+counter, 10); i++) {
        result.push(this.allSensorTypes[i]);
      }
    } else {
      var result = this.allSensorTypes.filter(obj => {
        if(info.id) return obj.id == info.id;
        if(info.manufacturer) return obj.manufacturer == info.manufacturer;
        if(info.quantity) return obj.quantity == info.quantity;
      });
    }

    return result;
  }
  
  /** Subject to validation of search-parameters in info as per
   *  FN_INFOS.findSensors, return all sensors which
   *  satisfy search specifications in info.  Note that the
   *  search-specs can filter the results by any of the primitive
   *  properties of a sensor.  
   *
   *  The returned value should be an object containing a data
   *  property which is a list of all sensors satisfying the
   *  search-spec which were previously added using addSensor().  The
   *  list should be sorted in ascending order by id.
   *
   *  If info specifies a truthy value for a doDetail property, 
   *  then each sensor S returned within the data array will have
   *  an additional S.sensorType property giving the complete 
   *  sensor-type for that sensor S.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  index property for the next search.  Note that the index (when 
   *  set to the lastIndex) and count search-spec parameters can be used
   *  in successive calls to allow scrolling through the collection of
   *  all sensors which meet some filter criteria.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensors(info) {
    const searchSpecs = validate('findSensors', info);
    if(info.isEmpty()) {
      var counter = 5, result = [];
      for(let i=0; i<counter; i++) {
        result.push(this.allSensors[i]);
      }
    } else if(info.hasOwnProperty('index') || info.hasOwnProperty('count')) {
      var startPoint  = info.index ? parseInt(info.index, 10) : 0,
      counter         = info.count ? parseInt(info.count, 10) : 5,
      result          = [],
      loopCounter     = 0;

      while(loopCounter < counter) {
        if(info.id && this.allSensors[startPoint].id == info.id) {
          result.push(this.allSensors[startPoint]);
          loopCounter++;
        } else if(info.model && this.allSensors[startPoint].model == info.model) {
          result.push(this.allSensors[startPoint]);
          loopCounter++;
        } else if(info.period && this.allSensors[startPoint].period == info.period) {
          result.push(this.allSensors[startPoint]);
          loopCounter++;
        }

        startPoint++;
      }
    } else {
      var result = this.allSensors.filter(obj => {
        if(info.id) return obj.id == info.id;
        if(info.model) return obj.model == info.model;
        if(info.period) return obj.period == info.period;
      });
    }

    return result;
  }
  
  /** Subject to validation of search-parameters in info as per
   *  FN_INFOS.findSensorData, return all sensor reading which satisfy
   *  search specifications in info.  Note that info must specify a
   *  sensorId property giving the id of a previously added sensor
   *  whose readings are desired.  The search-specs can filter the
   *  results by specifying one or more statuses (separated by |).
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
   *  Note that the timestamp and count search-spec parameters can be
   *  used in successive calls to allow scrolling through the
   *  collection of all readings for the specified sensor.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensorData(info) {
    const searchSpecs = validate('findSensorData', info);
    /*
    {
      sensorId: '23g6',
      statuses: Set { 'ok', 'outOfRange' },
      timestamp: 1569582157027,
      count: 5,
      doDetail: null
    }
  */
    if(info.isEmpty() || !(info.hasOwnProperty('sensorId'))) {
      console.log("missing value for sensorId");
    }

    var sensorDataResult      = {
      "data": []
    };
    /*var sensorData            = {
      "data": []
    };*/
    var sensorDataWithSameId  = this.allSensorData.filter(obj =>{return obj.sensorId == info.sensorId;});
    var sensorObj             = this.allSensors.filter(obj =>{return obj.id == info.sensorId;});
    var sensorTypeObj         = this.allSensorTypes.filter(obj =>{return obj.id == sensorObj[0].model;});

    sensorDataWithSameId.sort(sortObjectsById);
    
    for(let i=0; i<searchSpecs.count; i++) {
      if(inRange(sensorDataWithSameId[i].value, sensorObj[0].expected)) {
        sensorDataResult.data.push({
          "timestamp": sensorDataWithSameId[i].timestamp,
          "value": sensorDataWithSameId[i].value,
          "status": "ok"
        });
      } else if(inRange(sensorDataWithSameId[i].value, sensorTypeObj[0].limits)) {
        sensorDataResult.data.push({
          "timestamp": sensorDataWithSameId[i].timestamp,
          "value": sensorDataWithSameId[i].value,
          "status": "outOfRange"
        });
      } else {
        sensorDataResult.data.push({
          "timestamp": sensorDataWithSameId[i].timestamp,
          "value": sensorDataWithSameId[i].value,
          "status": "error"
        });
      }
    }

    /*var cnt=0;
    while(cnt<searchSpecs.count) {
      if(searchSpecs.statuses.Set == "outOfRange") {
        for(let i=0; i<sensorDataResult.data.length; i++) {
          if(sensorDataResult.data[i].status == "outOfRange") {
            sensorData.data.push(sensorDataResult.data[i]);
          }
        }
      } else if(searchSpecs.statuses.Set == "error") {
        for(let i=0; i<sensorDataResult.data.length; i++) {
          if(sensorDataResult.data[i].status == "error") {
            sensorData.data.push(sensorDataResult.data[i]);
          }
        }
      } else if(searchSpecs.statuses.Set == "ok") {
        for(let i=0; i<sensorDataResult.data.length; i++) {
          if(sensorDataResult.data[i].status == "ok") {
            sensorData.data.push(sensorDataResult.data[i]);
          }
        }
      }

      cnt++;
    }*/

    if(searchSpecs.doDetail == 'true') {
        sensorDataResult.sensor = sensorObj[0];
        sensorDataResult.sensorType = sensorTypeObj[0];
    }

    return sensorDataResult;
  }
}

module.exports = Sensors;

//@TODO add auxiliary functions as necessary

const DEFAULT_COUNT = 5;    

/** Validate info parameters for function fn.  If errors are
 *  encountered, then throw array of error messages.  Otherwise return
 *  an object built from info, with type conversions performed and
 *  default values plugged in.  Note that any unknown properties in
 *  info are passed unchanged into the returned object.
 */
function validate(fn, info) {
  const errors = [];
  const values = validateLow(fn, info, errors);
  if (errors.length > 0) throw errors; 
  return values;
}

function validateLow(fn, info, errors, name='') {
  const values = Object.assign({}, info);
  for (const [k, v] of Object.entries(FN_INFOS[fn])) {
    const validator = TYPE_VALIDATORS[v.type] || validateString;
    const xname = name ? `${name}.${k}` : k;
    const value = info[k];
    const isUndef = (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    );
    values[k] =
      (isUndef)
      ? getDefaultValue(xname, v, errors)
      : validator(xname, value, v, errors);
  }
  return values;
}

function getDefaultValue(name, spec, errors) {
  if (spec.default !== undefined) {
    return spec.default;
  }
  else {
    errors.push(`missing value for ${name}`);
    return;
  }
}

function validateString(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'string') {
    errors.push(`require type String for ${name} value ${value} ` +
    `instead of type ${typeof value}`);
    return;
  }
  else {
    return value;
  }
}

function validateNumber(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  switch (typeof value) {
  case 'number':
    return value;
  case 'string':
    if (value.match(/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/)) {
      return Number(value);
    }
    else {
      errors.push(`value ${value} for ${name} is not a number`);
      return;
    }
  default:
    errors.push(`require type Number or String for ${name} value ${value} ` +
    `instead of type ${typeof value}`);
  }
}

function validateInteger(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  switch (typeof value) {
  case 'number':
    if (Number.isInteger(value)) {
      return value;
    }
    else {
      errors.push(`value ${value} for ${name} is not an integer`);
      return;
    }
  case 'string':
    if (value.match(/^[-+]?\d+$/)) {
      return Number(value);
    }
    else {
      errors.push(`value ${value} for ${name} is not an integer`);
      return;
    }
  default:
    errors.push(`require type Number or String for ${name} value ${value} ` +
    `instead of type ${typeof value}`);
  }
}

function validateRange(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'object') {
    errors.push(`require type Object for ${name} value ${value} ` +
    `instead of type ${typeof value}`);
  }
  return validateLow('_range', value, errors, name);
}

const STATUSES = new Set(['ok', 'error', 'outOfRange']);

function validateStatuses(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'string') {
    errors.push(`require type String for ${name} value ${value} ` +
    `instead of type ${typeof value}`);
  }
  if (value === 'all') return STATUSES;
  const statuses = value.split('|');
  const badStatuses = statuses.filter(s => !STATUSES.has(s));
  if (badStatuses.length > 0) {
    errors.push(`invalid status ${badStatuses} in status ${value}`);
  }
  return new Set(statuses);
}

function sortObjectsById(firstValue, secondValue) {
  var firstId = 0, secondId = 0;
  if(firstValue.hasOwnProperty('sensorId') && secondValue.hasOwnProperty('sensorId')) {
    firstId = firstValue.sensorId.toUpperCase();
    secondId = secondValue.sensorId.toUpperCase();
  } else if(firstValue.hasOwnProperty('id') && secondValue.hasOwnProperty('id')) {
    firstId = firstValue.id.toUpperCase();
    secondId = secondValue.id.toUpperCase();
  } else if(firstValue.hasOwnProperty('timestamp') && secondValue.hasOwnProperty('timestamp')) {
    firstId = parseInt(firstValue.timestamp, 10);
    secondId = parseInt(secondValue.timestamp, 10);
  }

  let comparison = 0;
  if (firstId > secondId) {
    comparison = 1;
  } else if (firstId < secondId) {
    comparison = -1;
  }
  
  if(firstValue.hasOwnProperty('timestamp') && secondValue.hasOwnProperty('timestamp')) {
    return comparison * -1;
  } else {
    return comparison;
  }
}

function isDuplicate(validObj, validityObj) {
  validObj.filter(obj => {
    if(obj.id == validityObj.id) {
      console.log("duplicate value " + validityObj.id);
      return true;
    }
  });
}

function inRange(value, range) {
  return ( value >= range.min && value <= range.max );
}

const TYPE_VALIDATORS = {
  'integer': validateInteger,
  'number': validateNumber,
  'range': validateRange,
  'statuses': validateStatuses,
};


/** Documents the info properties for different commands.
 *  Each property is documented by an object with the
 *  following properties:
 *     type: the type of the property.  Defaults to string.
 *     default: default value for the property.  If not
 *              specified, then the property is required.
 */
const FN_INFOS = {
  addSensorType: {
    id: { }, 
    manufacturer: { }, 
    modelNumber: { }, 
    quantity: { }, 
    unit: { },
    limits: { type: 'range', },
  },
  addSensor:   {
    id: { },
    model: { },
    period: { type: 'integer' },
    expected: { type: 'range' },
  },
  addSensorData: {
    sensorId: { },
    timestamp: { type: 'integer' },
    value: { type: 'number' },
  },
  findSensorTypes: {
    id: { default: null },  //if specified, only matching sensorType returned.
    index: {  //starting index of first result in underlying collection
      type: 'integer',
      default: 0,
    },
    count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
  },
  findSensors: {
    id: { default: null }, //if specified, only matching sensor returned.
    index: {  //starting index of first result in underlying collection
      type: 'integer',
      default: 0,
    },
    count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
    doDetail: { //if truthy string, then sensorType property also returned
      default: null, 
    },
  },
  findSensorData: {
    sensorId: { },
    timestamp: {
      type: 'integer',
      default: Date.now() + 999999999, //some future date
    },
    count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
    statuses: { //ok, error or outOfRange, combined using '|'; returned as Set
      type: 'statuses',
      default: new Set(['ok']),
    },
    doDetail: {     //if truthy string, then sensor and sensorType properties
      default: null,//also returned
    },
  },
  _range: { //pseudo-command; used internally for validating ranges
    min: { type: 'number' },
    max: { type: 'number' },
  },
};  
