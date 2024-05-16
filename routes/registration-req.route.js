const { getRouterByModel } = require('./router.factory');
const registrationReqSchema = require('../schemas/registration-req.schema');

const registrationReqRoutes = getRouterByModel(
  'RegistrationReq',
  registrationReqSchema
);

module.exports = registrationReqRoutes;
