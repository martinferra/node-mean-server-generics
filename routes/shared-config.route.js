const express = require('express');
const sharedConfigCtrl = require('../controllers/shared-config.controller');

const router = express.Router();

router.get('/getSharedConfig', getSharedConfig);

function getSharedConfig(req, res) {
  let sharedConfig = sharedConfigCtrl.getSharedConfig();
  res.json(sharedConfig);
}

module.exports = router;
