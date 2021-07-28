const websocketCallbacks = require('./websocket-callbacks');
const { Server } = require('ws');

var wss;

function init(server) {

  wss = new Server({ server: server });

  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (message) => {
      let incomingMessage = JSON.parse(message);
      let callback = websocketCallbacks.getCallback(incomingMessage.command);
      if(!callback) {
        throw(`Error: websockets module -> on message callback -> command "${incomingMessage.command}" doesn't exist`);
      } else {
        callback(incomingMessage.data, ws);
      };
    });
    ws.on('close', () => console.log('Client disconnected'));
    ws.send(JSON.stringify({command: 'keepAlive', data:{timeOut: 30000}}));
  });

  websocketCallbacks.setCallback('keepAlive', (data, ws) => {
    console.log('keepAlive');
    const timeOut = data.timeOut || 30000;
    setTimeout(()=>{
      ws.send(JSON.stringify({command: 'keepAlive', data:{timeOut}}));
    }, timeOut);
})

}

module.exports = {wss, init};