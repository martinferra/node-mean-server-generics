const fs = require('fs');
const path = require('path');
const getConfig = require('../../../assets/dataload/customParserFunctions');

async function loadFromDirectory(directoryPath, fileName, callbackId, forEachCb, finalCb, _options=null) {

    const defaultOptions = {
        fileExtension: '.csv',
        rowDelimiter: '\n',
        fieldDelimiter: ','
    }
    const options = Object.assign(defaultOptions, _options)

    let fileNames = fileName? [ fileName ] : fs.readdirSync(directoryPath);
    fileNames.sort()
    for(fileName of fileNames) {
        const config = getConfig(fileName+'_'+(callbackId? callbackId : ''));
        let _forEachCb = config? config.forEachCb : null;
        let regExArr = config? config.regExArr : null;
        if(!_forEachCb) _forEachCb = forEachCb; 
        if(!options.fileExtension || path.extname(fileName) === options.fileExtension) {
            await parseFile(directoryPath+'/'+fileName, options, regExArr, _forEachCb, finalCb)
        }
    }
}

async function parseFile(filePath, options, regExArr, forEachCb, finalCb) {

    let fileName = path.basename(filePath);
    let fileNameArr = fileName.split('.');
    let entityName = fileNameArr[0].split('_')[1];
    let skippedLinesFileName = `${fileNameArr[0]}.skipped`;
    let skippedLinesFilePath = `${path.dirname(filePath)}/${skippedLinesFileName}`

    fs.readFile(filePath, 'utf8', async function (err, data) {
        if(err) throw err;
        let skippedData = await stringToPlainObjects(data, options, regExArr, forEachCb, plainObjArr => {
            finalCb(entityName, plainObjArr)
        })
        if(skippedData) {
            fs.writeFileSync(skippedLinesFilePath, skippedData);
        }
    });
}

async function stringToPlainObjects(objectsStr, options, regExArr, forEachCb, finalCb) {

    let lines = objectsStr.split(options.rowDelimiter)

    /* Workaround: en algunos archivos planos, el fin de línea incluye un caracter #13
       que persiste como último caracter en los elementos del array resultante luego de
       hacer .split('\n'). En esos casos se elimina el último caracter de cada elemento */
    if(lines[0][lines[0].length-1].charCodeAt()===13)
        lines = lines.map( line => line.slice(0,-1) )

    let stringTemplateArr = [];
    let stringTemplateHeader = '';

    if(lines.length) { 
        stringTemplate = lines[0];
        stringTemplateArr = lines[0].split('#');
        stringTemplateHeader = stringTemplateArr[0];
        stringTemplateArr.splice(0,1);
        // Elimino la línea de definición de la estructura
        lines.splice(0, 1);
    }

    let plainObjArr = [];
    let skippedLines = [];

    for(line of lines) {
        if(line.length) {
            let inputLineArr = line.split(options.fieldDelimiter);
            let lineOkArr = !regExArr? null : 
                inputLineArr.map((fieldValue, fieldIdx)=>!regExArr[fieldIdx]? true : regExArr[fieldIdx].test(fieldValue));
            let lineOk = !lineOkArr? true : lineOkArr.reduce((acc, curr) => acc && curr, true);
            if(lineOk) {
                if(forEachCb) {
                    let retValue = await forEachCb(inputLineArr);
                    if(!(retValue instanceof Array)) {
                        plainObjArr.push(retValue);
                    } else {
                        inputLineArr = inputLineArr.map((fieldValue, fieldIdx) => `${retValue[fieldIdx]? '' : '(*)'}${fieldValue}`);
                        skippedLines.push(inputLineArr.join(','));
                    }
                } else {
                    let objectString = stringTemplateHeader + 
                    inputLineArr
                            .map((fieldValue, fieldIdx) => fieldValue+stringTemplateArr[fieldIdx])
                            .join('');

                    plainObjArr.push(JSON.parse(objectString));
                }
            } else {
                skippedLines.push(inputLineArr
                    .map((fieldValue, fieldIdx)=>`${lineOkArr[fieldIdx]? '' : '(*)'}${fieldValue}`)
                    .join(',')
                );
            }
        }
    }
    finalCb(plainObjArr);
    return skippedLines.join('\n');
}

module.exports = loadFromDirectory