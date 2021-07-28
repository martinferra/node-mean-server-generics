const ExcelJS = require('exceljs');
const websocketCallbacks = require('../config/websocket-callbacks');

var excelReportSpecs = new Map();

function setReportSpec(reportId, reportSpec) {
    excelReportSpecs.set(reportId, reportSpec);
}

async function getReport(cb, reportId, ...params) {

    const spec = excelReportSpecs.get(reportId);
    const getData = spec.getData;
    let buffer;
    let error = null;

    try {
        let excelData = await getData(...params);

        const inputFilePath = spec.templateDir+spec.templateName+'.xlsx';

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(inputFilePath);
        const worksheet = workbook.getWorksheet(spec.sheetName);

        excelData.forEach((doc, idx)=>{
            Object.keys(doc).forEach(columnId=>{
                worksheet.getCell(columnId+(spec.initialRowNum+idx)).value = doc[columnId]
            })
        });
        
        buffer = await workbook.xlsx.writeBuffer();

    } catch(e) {
        error = e;
    } finally {
        if(cb) {
            cb(error, error? null : buffer)
        } else {
            if(error) {
                throw(error);
            }
            return buffer;
        }
    }
};

websocketCallbacks.setCallback('getReport', async (data, ws) => {
    let result;
    try {
        result = await getReport(null, data.reportId, ...data.reportParams);
        ws.send(result);
    } catch(e) {
        ws.send(JSON.stringify({command: 'error', data:e}));
    }
})

module.exports = {setReportSpec, getReport}