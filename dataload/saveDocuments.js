const mongoose = require('mongoose');
const async =  require('async');
const globalPlugin = require('../config/mongoose.plugins');
const config = require('../../config/config');

const mongoUri = config.mongo.host;

mongoose.connect(mongoUri, { 
    socketTimeoutMS: 1800000,
    connectTimeoutMS: 1800000, 
 });
mongoose.Promise = global.Promise;
mongoose.plugin(globalPlugin);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

require('../../../assets/dataload/load-models.js');

function saveDocuments(entityName, plainObjArr) {
    let model = mongoose.model(entityName);

    async.parallel(
        plainObjArr.map( plainObj => cb => { 
            model.saveDocument(plainObj, cb) 
        }),
        err => { 
            if(!err) console.log(`Done: ${entityName}`) 
        }
    )
}

module.exports = saveDocuments