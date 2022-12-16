const config = require('../../config/config');
const nodemailer = require("nodemailer");

const smtpAlarmsConfig = config.email.smtp.alarms || config.email.smtp.default;

async function sendMail(smtpConfig, mailParams) {
  const transporter = nodemailer.createTransport(smtpConfig);
  mailParams.from = mailParams.from.replace('[from]',smtpAlarmsConfig.auth.user);
  await transporter.sendMail(mailParams);
}

async function sendAlarmMail(mailParams) {
  await sendMail(smtpAlarmsConfig, mailParams);
}

module.exports = {
    sendAlarmMail
}