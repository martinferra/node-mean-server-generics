const proccesses = new Map();

var _server;

function setProccess(proccessId, proccess) {
    if(!proccesses.get(proccessId)) {
        proccesses.set(proccessId, proccess);
        if(_server) {
            (async () => proccess(_server))();
        }
    } else {
        throw(`Error: server-proccesses module -> setProccess -> proccessId "${proccessId}" already exists`);
    }
}

function getProccess(proccessId) {
    return proccesses.get(proccessId);
}

function init(server) {
    if(server && !_server) {
        _server = server;
        proccesses.forEach(proccess=>{
            (async () => proccess(_server))();
        })
    }
}

module.exports = {
    setProccess,
    getProccess,
    init
}