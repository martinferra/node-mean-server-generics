const mongoose = require('mongoose');
const RegExDefs = require('../../../common/generic/regex-defs');
const modelFactory = require('./model.factory');

const RegistrationReqSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [RegExDefs.email, 'Formato de correo electrónico incorrecto'],
  },
});

modelFactory.registerModelSchema('RegistrationReq', RegistrationReqSchema);
