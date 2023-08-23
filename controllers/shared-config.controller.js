const config = require('../../config/config');

function getSharedConfig() {
  return {
    allowUserRegistration: config.allowUserRegistration,
  };
}

module.exports = {
  getSharedConfig,
};
