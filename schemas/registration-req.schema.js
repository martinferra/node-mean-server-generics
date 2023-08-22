const Joi = require('joi');

const RegistrationReqSchema = Joi.object({
  _id: Joi.string().default(null),
  fullname: Joi.string().when('_id', { is: null, then: Joi.required() }),
  email: Joi.string().email().when('_id', { is: null, then: Joi.required() }),
});

module.exports = RegistrationReqSchema;
