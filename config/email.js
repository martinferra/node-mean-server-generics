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

function hasValidConfig(schema, value) {
  return !schema.validate(value).error;
}

async function createSmtpTransport(smtpConfig) {
  return {
    transporter: nodemailer.createTransport(smtpConfig),
    mailFrom: smtpConfig.auth.user,
  };
}

async function createOAuth2Transport(oauth2Config) {
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    oauth2Config.clientId,
    oauth2Config.clientSecret,
    oauth2Config.redirectUri
  );
  oauth2Client.setCredentials({
    refresh_token: oauth2Config.refreshToken
  });

  const accessToken = await oauth2Client.getAccessToken();
  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: oauth2Config.user,
        clientId: oauth2Config.clientId,
        clientSecret: oauth2Config.clientSecret,
        refreshToken: oauth2Config.refreshToken,
        accessToken: accessToken.token,
      }
    }),
    mailFrom: oauth2Config.user,
  };
}

function getAvailableTransports() {
  return {
    smtp: {
      isValid: hasValidConfig(smtpConfigSchema, config.email?.smtp?.alarms),
      create: () => createSmtpTransport(config.email?.smtp?.alarms),
      missingConfigMessage:
        'SMTP email transport was selected but the SMTP configuration is incomplete.',
      initErrorMessage: 'Failed to initialize SMTP mail transporter:',
    },
    oauth2: {
      isValid: hasValidConfig(oauth2ConfigSchema, config.email?.oauth2?.alarms),
      create: () => createOAuth2Transport(config.email?.oauth2?.alarms),
      missingConfigMessage:
        'OAuth2 email transport was selected but the OAuth2 configuration is incomplete.',
      initErrorMessage: 'Failed to initialize OAuth2 mail transporter:',
    },
  };
}

function createTransporterPromise() {
  const transportPreference = config.email?.transport?.alarms || 'auto';
  const transports =
    transportPreference === 'smtp' || transportPreference === 'oauth2'
      ? [transportPreference]
      : ['smtp', 'oauth2'];
  const availableTransports = getAvailableTransports();

  return (async () => {
    for (const transportName of transports) {
      const transport = availableTransports[transportName];
      if (!transport.isValid) {
        if (transports.length === 1) {
          console.error(transport.missingConfigMessage);
        }
        continue;
      }

      try {
        return await transport.create();
      } catch (error) {
        console.error(transport.initErrorMessage, error.message);
        if (transports.length === 1) {
          return null;
        }
      }
    }

    console.error('No mail client configuration found');
    return null;
  })();
}

const transporterPromise = createTransporterPromise();

async function sendMail(mailParams) {
  if (!transporterPromise) {
    console.error('No mail client transporter created');
    return;
  }
  try {
    const mailClient = await transporterPromise;
    if (!mailClient) {
      console.error('Mail transporter is unavailable (initialization failed)');
      return;
    }
    const { transporter, mailFrom } = mailClient;
    mailParams.from = mailParams.from.replace('[from]', mailFrom);
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
}

async function sendAlarmMail(mailParams) {
  await sendMail(mailParams);
}

module.exports = {
  sendAlarmMail
}