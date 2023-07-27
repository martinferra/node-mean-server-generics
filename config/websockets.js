const config = require('../../config/config');
const websocketCallbacks = require('./websocket-callbacks');
const { Server } = require('ws');
const subscriptions = require('../config/subscriptions');
const serverProcs = require('./server-proccesses');
const jwt = require('jsonwebtoken');

var subscriptionsByWs = new Map();

var wss;

async function rpcController(user, rpc, ws) {
  let callback = websocketCallbacks.getCallback(rpc.name);
  if(!callback) {
    throw(`Error: websockets module -> on message callback -> command "${rpc.name}" doesn't exist`);
  } else {
    let ret = await callback(Object.assign(rpc.params,{user}));
    if(ret.constructor.name === 'Object') {
      ret = JSON.stringify(ret);
    }
    ws.send(ret);
  };
}

function subscriptionController(user, path, ws) {

  let callback = (data) => {
    if(typeof data === 'object') {
      data = JSON.stringify({data});
    }
    ws.send(data);
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
  ws.send(JSON.stringify({type: 'keepAlive', data:{timeOut}}));
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
    console.log('Client connected');
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

serverProcs.setProccess('websockets', init);
