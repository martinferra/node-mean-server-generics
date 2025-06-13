const config = require('../../config/config');
const nodemailer = require("nodemailer");
const Joi = require('joi');
const { google } = require('googleapis');

const smtpAuthSchema = Joi.object({
  user: Joi.string().email().required(),
  pass: Joi.string().required(),
})

const smtpConfigSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().required(),
  secure: Joi.boolean().required(),
  auth: smtpAuthSchema.required(),
})

const oauth2ConfigSchema = Joi.object({
  user: Joi.string().email().required(),
  clientId: Joi.string().required(),
  projectId: Joi.string().required(),
  authUri: Joi.string().required(),
  tokenUri: Joi.string().required(),
  clientSecret: Joi.string().required(),
  redirectUri: Joi.string().required(),
  refreshToken: Joi.string().required(),
})

var transporterPromise;
var mailFrom;

if (!oauth2ConfigSchema.validate(config.email?.oauth2?.alarms).error) {
  const oauth2Config = config.email.oauth2.alarms;
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    oauth2Config.clientId,
    oauth2Config.clientSecret,
    oauth2Config.redirectUri
  );
  oauth2Client.setCredentials({
    refresh_token: oauth2Config.refreshToken
  });
  transporterPromise = oauth2Client.getAccessToken().then(accessToken => 
    nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: oauth2Config.user,
        clientId: oauth2Config.clientId,
        clientSecret: oauth2Config.clientSecret,
        refreshToken: oauth2Config.refreshToken,
        accessToken: accessToken.token,
      }
    })
  )
  mailFrom = oauth2Config.user;
} else if (!smtpConfigSchema.validate(config.email?.smtp?.alarms).error) {
  transporterPromise = Promise.resolve(nodemailer.createTransport(config.email.smtp.alarms));
  mailFrom = config.email.smtp.alarms.auth.user;
} else {
  console.error('No mail client configuration found');
}

async function sendMail(mailParams) {
  if (!transporterPromise) {
    console.error('No mail client transporter created');
    return;
  }
  try {
    mailParams.from = mailParams.from.replace('[from]',mailFrom);
    transporterPromise.then(transporter => {
      try {
        transporter.sendMail(mailParams, (error, info) => {
          if (error) {
            console.error('Error sending mail:', error);
            return;
          }
          console.log('Email sent:', info.response);
        });
      } catch (error) {
        console.error('Error sending mail:', error);
      }
    });
  } catch (error) {
    console.error('Error sending mail:', error);
  }
}

async function sendAlarmMail(mailParams) {
  await sendMail(mailParams);
}

module.exports = {
  sendAlarmMail
}