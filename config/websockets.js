const config = require('../../config/config');
const websocketCallbacks = require('./websocket-callbacks');
const { Server } = require('ws');
const subscriptions = require('../config/subscriptions');
const serverProcs = require('./server-processes');
const jwt = require('jsonwebtoken');
const { BSON } = require('bson');
const { preBSONSerialization } = require('../../../common/generic/commonFunctions');

var subscriptionsByWs = new Map();

var wss;

function toBson(data, preProcessByDefault=true) {
  return BSON.serialize(preBSONSerialization(data, preProcessByDefault));
}

async function rpcController(user, rpc, ws) {
  const callback = websocketCallbacks.getCallback(rpc.name);
  var callbackRet, objectToSend;
  try {
    callbackRet = callback?
      (await callback(Object.assign({},rpc.params,{user}))) : 
      `Error: websockets module -> on message callback -> command "${rpc.name}" doesn't exist`;
    objectToSend = {
      type: callback? (callbackRet.constructor.name === 'Object'? 'object' : 'no-object') : 'error',
      payload: callbackRet
    };
  } catch(e) {
    objectToSend = {
      type: 'error', 
      payload: e.message
    }; 
  } finally {
    ws?.send(toBson(objectToSend));
  }
}

function subscriptionController(user, path, ws) {

  let callback = (data) => {
    let objectToSend = {
      type: data.constructor.name === 'Object'? 'object' : 'no-object',
      payload: data
    };
    ws.send(toBson(objectToSend, false));
  }

  subscriptionsByWs.set(ws,{path, callback});

  subscriptions.subscribe(path, callback);
}

function keepAliveController(user, spec, ws) {
  console.log('keepAlive');
  const timeOut = spec.timeOut || 30000;
  setTimeout(()=>{
    sendKeepAlive(user, ws, timeOut);
  }, timeOut);
}

function sendKeepAlive(user, ws, timeOut) {
  ws.send(toBson({type: 'keepAlive', payload:{timeOut}}, false));
}

function messageController(user, incomingMessage, ws) {
  switch(incomingMessage.type) {
    case 'rpc':
      rpcController(user, incomingMessage.spec, ws);
      break;
    case 'subscription':
      subscriptionController(user, incomingMessage.spec, ws);
      break;
    case 'keepAlive':
      keepAliveController(user, incomingMessage.spec, ws);
      break;
  }
}

function closeController(ws) {
  let subscription = subscriptionsByWs.get(ws);
  if(subscription) {
    subscriptions.unsubscribe(subscription.path, subscription.callback);
  };
  subscriptionsByWs.delete(ws);
}

function init(server) {
  wss = new Server({ server: server });
  wss.on('connection', (ws) => {
    var user;
    ws.on('message', (message) => {
      let incomingMessage = JSON.parse(message);
      if(!user){
        user = jwt.verify(incomingMessage.token, config.jwtSecret);
      }
      if(!user) {
        ws.close(1, 'Access denied');
      } else {
        messageController(user, incomingMessage, ws);
      }
    });
    ws.on('close', () => closeController(ws));
    sendKeepAlive(user, ws, 30000);
  });
}

serverProcs.setProcess('websockets', init);
