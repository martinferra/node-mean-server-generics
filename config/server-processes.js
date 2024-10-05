const processes = new Map();

var _server;

function setProcess(processId, process) {
    if(!processes.get(processId)) {
        processes.set(processId, process);
        if(_server) {
            (async () => process(_server))();
        }
    } else {
        throw(`Error: server-processes module -> setProcess -> processId "${processId}" already exists`);
    }
}

function getProcess(processId) {
    return processes.get(processId);
}

function init(server) {
    if(server && !_server) {
        _server = server;
        processes.forEach(process=>{
            (async () => process(_server))();
        })
    }
}

module.exports = {
    setProcess,
    getProcess,
    init
}