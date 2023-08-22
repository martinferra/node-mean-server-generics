const getRouter = require('./router.factory');
const registrationReqSchema = require('../schemas/registration-req.schema');

const registrationReqRoutes = getRouter(
  'RegistrationReq',
  registrationReqSchema
);

module.exports = registrationReqRoutes;
