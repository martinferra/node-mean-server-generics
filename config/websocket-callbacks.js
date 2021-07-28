var callbacks = new Map();

function setCallback(command, cb) {
  if(!callbacks.get(command)) {
    callbacks.set(command, cb);
  } else {
    throw(`Error: websocket-callbacks module -> setCallback -> command "${command}" already exists`);
  }
}

function getCallback(command) {
    return callbacks.get(command);
}

module.exports = {setCallback: setCallback, getCallback: getCallback};