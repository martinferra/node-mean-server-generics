const ExcelJS = require('exceljs');
const websocketCallbacks = require('../config/websocket-callbacks');

var reportSpecs = new Map();

function setReportSpec(reportId, reportSpec) {
    reportSpecs.set(reportId, reportSpec);
}

async function getReport(cb, reportId, ...params) {
    const spec = reportSpecs.get(reportId);
    switch(spec.reportType) {
        case 'excel':
            return getExcelReport(cb, reportId, ...params);
        case 'txt':
            return getTxtReport(cb, reportId, ...params);
        default:
            cb(null, null);
    }
}

async function getExcelReport(cb, reportId, ...params) {

    const spec = reportSpecs.get(reportId);
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

async function getTxtReport(cb, reportId, ...params) {
    const spec = reportSpecs.get(reportId);
    const getData = spec.getData;
    let buffer;
    let error = null;

    try {
        buffer = spec.columnIds.join('\t')+'\n';
        let txtData = await getData(...params);
        txtData.forEach((doc, idx)=>{
            spec.columnIds.forEach((columnId, idx)=>{
                buffer += doc[columnId];
                if(idx<spec.columnIds.length-1) {
                    buffer += '\t';
                }
            });
            buffer += '\n';
        });
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
}

websocketCallbacks.setCallback('getReport', async (data) => {
    try {
        let report = await getReport(null, data.reportId, ...data.reportParams);
        return report;
    } catch(e) {
        return {type: 'error', data:e.message};
    }
})

module.exports = {setReportSpec, getReport}