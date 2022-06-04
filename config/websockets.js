const websocketCallbacks = require('./websocket-callbacks');
const { Server } = require('ws');
const subscriptions = require('../config/subscriptions');
const serverProcs = require('./server-proccesses');

var subscriptionsByWs = new Map();

var wss;

async function rpcController(rpc, ws) {
  let callback = websocketCallbacks.getCallback(rpc.name);
  if(!callback) {
    throw(`Error: websockets module -> on message callback -> command "${rpc.name}" doesn't exist`);
  } else {
    let ret = await callback(rpc.params);
    if(ret.constructor.name === 'Object') {
      ret = ret.toString();
    }
    ws.send(ret);
  };
}

function subscriptionController(path, ws) {

  let callback = (data) => {
    if(typeof data === 'object') {
      data = JSON.stringify({data});
    }
    ws.send(data);
  }

  subscriptionsByWs.set(ws,{path, callback});

  subscriptions.subscribe(path, callback);
}

function keepAliveController(spec, ws) {
  console.log('keepAlive');
  const timeOut = spec.timeOut || 30000;
  setTimeout(()=>{
    sendKeepAlive(ws, timeOut);
  }, timeOut);
}

function sendKeepAlive(ws, timeOut) {
  ws.send(JSON.stringify({type: 'keepAlive', data:{timeOut}}));
}

function messageController(message, ws) {
  let incomingMessage = JSON.parse(message);
  switch(incomingMessage.type) {
    case 'rpc':
      rpcController(incomingMessage.spec, ws);
      break;
    case 'subscription':
      subscriptionController(incomingMessage.spec, ws);
      break;
    case 'keepAlive':
      keepAliveController(incomingMessage.spec, ws);
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
    console.log('Client connected');
    ws.on('message', (message) => messageController(message, ws));
    ws.on('close', () => closeController(ws));
    sendKeepAlive(ws, 30000);
  });
}

serverProcs.setProccess('websockets', init);
