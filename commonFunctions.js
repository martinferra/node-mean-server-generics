const mongoose = require('mongoose');
const cloneDeep = require('lodash').cloneDeep;
const applyRecursive = require('../../common/generic/commonFunctions').applyRecursive;

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
  applyObjectIdRecursive,
  applyMongooseTypesRecursive
}