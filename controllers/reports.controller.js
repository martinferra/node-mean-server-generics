const ExcelJS = require('exceljs');
const websocketCallbacks = require('../config/websocket-callbacks');
const cloneDeep = require('lodash').cloneDeep;
const JSZip = require('jszip');
const getTimestampString = require('../../../common/generic/commonFunctions').getTimestampString;
const async = require('async');

var reportSpecs = new Map();

function setReportSpec(reportId, reportSpec) {
    reportSpecs.set(reportId, reportSpec);
}

async function getReport(reportParams) {
    var spec = reportSpecs.get(reportParams.reportId);
    if(spec.getSpec) {
        spec = await spec.getSpec(...reportParams.params);
    }
    if(spec.specArray) {
        return getReportsGroup(null, spec, reportParams.user, ...reportParams.params);
    }
    return getSingleReport(null, spec, reportParams.user, ...reportParams.params);
}

async function getExcelReport(cb, spec, user, ...params) {

    let buffer;
    let error = null;

    try {
        const inputFilePath = spec.templateDir+spec.templateName+'.xlsx';
        const templateWorkbook = new ExcelJS.Workbook();
        await templateWorkbook.xlsx.readFile(inputFilePath);
        const workbook = new ExcelJS.Workbook();

        for(let sheet of spec.sheets) {
            
            let worksheet = workbook.getWorksheet(sheet.sheetName);

            if(!worksheet) {
                // Sheet clonning
                const templateWorksheet = templateWorkbook.getWorksheet(sheet.sheetTemplateName || sheet.sheetName);
                worksheet = workbook.addWorksheet("Sheet");
                worksheet.model = Object.assign(
                    cloneDeep(templateWorksheet.model), 
                    { mergeCells: templateWorksheet.model.merges}
                );
                /* Workaround: for each merged cell, the border definition is
                taken from template sheet. Otherwise that definition is lost */
                worksheet.eachRow({ includeEmpty: true }, row => {
                    row.eachCell({ includeEmpty: true }, cell => {
                        if(cell.master !== cell) {
                            const templateCell = templateWorksheet.getCell(cell.address);
                            cell.border = cloneDeep(templateCell.border);
                        }
                    });
                });
                worksheet.name = sheet.sheetName;
            }

            // Sheet paraters assignment
            for(let param of sheet.params || []) {
                worksheet.getCell(param.cell).value = await param.getValue(...params);
            }

            // Proccess data ranges
            // -- Backward compatibility
            sheet.dataRanges ??= [{
                getData: sheet.getData,
                initialRowNum: sheet.initialRowNum
            }];
            // -- Fill sheet data
            for(let dataRange of sheet.dataRanges) {
                let excelData = await dataRange.getData(user, ...params);
                excelData.forEach((doc, idx)=>{
                    Object.keys(doc).forEach(columnId=>{
                        worksheet.getCell(columnId+(dataRange.initialRowNum+idx)).value = doc[columnId]
                    })
                });
            };
        }

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

async function getTxtReport(cb, spec, user, ...params) {
    const getData = spec.getData;
    let buffer;
    let error = null;

    try {
        buffer = spec.columnIds.join('\t')+'\n';
        let txtData = await getData(user, ...params);
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

async function getSingleReport(cb, spec, user, ...params) {
    switch(spec.reportType) {
        case 'excel':
            return getExcelReport(cb, spec, user, ...params);
        case 'txt':
            return getTxtReport(cb, spec, user, ...params);
        default:
            cb?.(null, null);
    }
}

async function getReportsGroup(cb, spec, user, ...params) {
    let buffer;
    let error = null;
    timestampStr = getTimestampString();
    try {
        bufferArray = await async.parallel(
            spec.specArray.map( _spec => cb => { 
                getSingleReport(cb, _spec, user, ...params) 
            })
        );

        var zip = new JSZip();
        var folder = zip.folder(`${spec.fileBaseName}_${timestampStr}`);

        spec.specArray.forEach((_spec, idx) => {
            folder.file(
                `${_spec.fileBaseName}_${timestampStr}.${_spec.fileExt}`, 
                bufferArray[idx], 
                {binary:true}
            );
        });

        buffer = await zip.generateAsync({type:"arraybuffer"});

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

websocketCallbacks.setCallback('getReport', getReport);

module.exports = {
    setReportSpec, 
    getReport
}