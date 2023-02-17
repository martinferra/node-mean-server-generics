const loadFromDirectory = require('./loadFromDirectory');
const saveDocuments = require('./saveDocuments');

if(process.argv[2] === '--i' || process.argv[2] === '--init') return;

//const directoryPath = '../../../assets/dataload/data'
const directoryPath = './assets/dataload/data';
const callbackId = process.argv[2];
const fileName = process.argv[3];


(async ()=> {
    await loadFromDirectory(directoryPath, fileName, callbackId, null, saveDocuments)
})();