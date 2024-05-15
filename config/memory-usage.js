const serverProcs = require('./server-proccesses');
const memoryUsage = require('../../../common/generic/commonFunctions').logMemoryUsage;

function init(server) {
    setInterval(() => {
        memoryUsage('Memory usage');
    }, 1000);
}

serverProcs.setProccess('memory-usage', init);
