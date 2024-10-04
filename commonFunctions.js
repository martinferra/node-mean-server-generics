const mongoose = require('mongoose');
const cloneDeep = require('lodash').cloneDeep;
const applyRecursive = require('../../common/generic/commonFunctions').applyRecursive;
const http = require('node:http');
const https = require('node:https');
const nodeFetch = import('node-fetch');

function httpAgent(url) {
  if (url.protocol == 'http:') {
    return new http.Agent({ keepAlive: true });
  } else {
    return new https.Agent({ keepAlive: true });
  }
}

function fetch(url, options) {
  const _options = Object.assign({ agent: httpAgent }, options);
  return nodeFetch.then(({default: _fetch}) => _fetch(url, _options));
}

function applyObjectIdRecursive(obj) {
  clonedObj = cloneDeep(obj);
  return applyRecursive(null, null, clonedObj, (po,pk,o,k)=>{
    /* Ej: "customer: {$oid:'aaaaa'}" se reemplaza por 
        "customer: ObjectId('aaaaa')" */
    if(k==='$oid' && typeof o[k] === 'string') {
      po[pk] = new mongoose.Types.ObjectId(o[k]);
    }
  })
}

function applyMongooseTypesRecursive(obj) {
  clonedObj = cloneDeep(obj);
  return applyRecursive(null, null, clonedObj, (po,pk,o,k)=>{
    /* Ej: "customer: {$oid:'aaaaa'}" se reemplaza por 
        "customer: ObjectId('aaaaa')" */
    if(k==='$oid' && typeof o[k] === 'string') {
      po[pk] = new mongoose.Types.ObjectId(o[k]);
    } else if(k==='$date' && typeof o[k] === 'string') {
      po[pk] = new Date(o[k]);
    }
  })
}

module.exports = {
  fetch,
  applyObjectIdRecursive,
  applyMongooseTypesRecursive
}