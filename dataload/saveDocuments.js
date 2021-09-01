const mongoose = require('mongoose');
const async =  require('async');
const globalPlugin = require('../../server/generic/config/mongoose.plugins');
const config = require('../../server/config/config');

const mongoUri = config.mongo.host;

mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(mongoUri, { 
    keepAlive: 1, useNewUrlParser: true, 
    useCreateIndex: true, 
    socketTimeoutMS: 1800000,
    connectTimeoutMS: 1800000, 
 });
mongoose.Promise = global.Promise;
mongoose.plugin(globalPlugin);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const User = require('../../server/models/user.model');

const Province = require('../../server/models/province.model');
const City = require('../../server/models/city.model');
const Street = require('../../server/models/street.model');
const AreaCode = require('../../server/models/areaCode.model');
const ZipCode = require('../../server/models/zipCode.model');

const LotFamily = require('../../server/models/lot.model').LotFamily;
const Lot = require('../../server/models/lot.model').Lot;
const ExtraLot = require('../../server/models/lot.model').ExtraLot;

const Institution = require('../../server/models/institution.model');

const Seller = require('../../server/models/seller.model');

const Customer = require('../../server/models/customer.model');
const Address = require('../../server/models/address.model');
const PhoneNumber = require('../../server/models/phoneNumber.model');

const LotCard = require('../../server/models/lotcard.model');
const ExtraLotParticipation = require('../../server/models/extraLotParticipation.model');

Lot.createCollection();
ExtraLot.createCollection();

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