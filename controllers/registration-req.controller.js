const modelFactory = require('../models/model.factory');
const RegistrationReqModel = modelFactory.getModel('RegistrationReq');
const RegistrationReqSchema = require('../schemas/registration-req.schema');
const controllerFactory = require('./controller.factory');

async function save(data) {
  const innerFn = controllerFactory.getCtrlSaveFn(RegistrationReqSchema);
  return await innerFn(RegistrationReqModel, data);
}

module.exports = {
  save,
};
