const websocketCallbacks = require('./websocket-callbacks');
const { Server } = require('ws');
const { forEach } = require('lodash');

var subscriptions = new Map();
var wsPool = new Map();

var wss;

function rpcController(rpc, ws) {
  let callback = websocketCallbacks.getCallback(rpc.name);
  if(!callback) {
    throw(`Error: websockets module -> on message callback -> command "${rpc.name}" doesn't exist`);
  } else {
    callback(rpc.params, ws);
  };
}

function subscriptionController(key, ws) {

  let subsArr = wsPool.get(ws) || [];
  if(!subsArr.find(subs=>subs===key)) {
    subsArr.push(key);
  }
  wsPool.set(ws,subsArr);

  let wsArr = subscriptions.get(key) || [];
  if(!wsArr.find(_ws=>_ws===ws)) {
    wsArr.push(ws);
  }
  subscriptions.set(key, wsArr);
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
  console.log('Client disconnected');
  /* Es necesario eliminar de los maps todas las referencias al ws desconectado */
  let subsArr = wsPool.get(ws);
  if(subsArr) {
    subsArr.forEach(subs => {
      let wsArr = subscriptions.get(subs);
      let idx = wsArr.findIndex(_ws=>_ws===ws);
      if(idx>=0) {
        wsArr.splice(idx,1);
        if(!wsArr.length) {
          subscriptions.delete(subs);
        }
      };
    });
  };
  wsPool.delete(ws);
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

function publish(key, data) {
  let steps = key.split('/');
  let path = '';
  steps.forEach(step => {
    path = `${path}${path?'/':''}${step}`;
    let wsArr = subscriptions.get(path);
    if(wsArr) {
      wsArr.forEach(ws=>ws.send(data))
    }
  })
}

module.exports = {wss, init, publish};