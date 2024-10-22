const ExcelJS = require('exceljs');
const websocketCallbacks = require('../config/websocket-callbacks');
const cloneDeep = require('lodash').cloneDeep;
const JSZip = require('jszip');
const getTimestampString = require('../../../common/generic/commonFunctions').getTimestampString;
const async = require('async');
const tmp = require('tmp-promise');
const path = require('path');

var reportSpecs = new Map();

function setReportSpec(reportId, reportSpec) {
    reportSpecs.set(reportId, reportSpec);
}

async function getReport(reportReq) {
    var spec = reportSpecs.get(reportReq.reportId);
    if(spec.getSpec) {
        spec = await spec.getSpec(...reportReq.reportParams);
    }
    if(spec.specArray) {
        return getReportsGroup(null, spec, reportReq.user, ...reportReq.reportParams);
    }
    return getSingleReport(null, spec, reportReq.user, ...reportReq.reportParams);
}

async function getExcelReport(cb, spec, user, ...params) {

    let error = null;
    let outputFile;

    try {
        const inputFilePath = spec.templateDir+spec.templateName+'.xlsx';
        const templateWorkbook = new ExcelJS.Workbook();
        await templateWorkbook.xlsx.readFile(inputFilePath);

        outputFile = await tmp.file({ postfix: '.xlsx' });

        const options = {
            filename: outputFile.path,
            useStyles: true,
            useSharedStrings: true
        };
        const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter(options);

        for(let sheet of spec.sheets) {

            let worksheetWriter = workbookWriter.getWorksheet(sheet.sheetName);

            if(!worksheetWriter) {
                // Sheet clonning
                const templateWorksheet = templateWorkbook.getWorksheet(sheet.sheetTemplateName || sheet.sheetName);
                worksheetWriter = workbookWriter.addWorksheet(sheet.sheetName);

                // Clone filter settings
                if (templateWorksheet.autoFilter) {
                    worksheetWriter.autoFilter = templateWorksheet.autoFilter;
                }

                // Clone column widths
                templateWorksheet.columns.forEach((templateColumn, index) => {
                    const newColumn = worksheetWriter.getColumn(index + 1);
                    newColumn.width = templateColumn.width;
                });

                templateWorksheet.eachRow({ includeEmpty: true }, (templateRow, rowNumber) => {

                    // Clone cell properties
                    templateRow.eachCell({ includeEmpty: true }, (templateCell, colNumber) => {

                        // Clone row height
                        const newRow = worksheetWriter.getRow(rowNumber);
                        newRow.height = templateRow.height;

                        // Clone merged cells
                        if (templateCell.isMerged && templateCell.master.address === templateCell.address) {
                            const mergeRange = templateWorksheet._merges[templateCell.master.address];
                            worksheetWriter.mergeCells(mergeRange);
                        }

                        const newCell = worksheetWriter.getCell(templateCell.address);

                        newCell.value = templateCell.value;

                        // Clone styles
                        newCell.style = cloneDeep(templateCell.style);

                        // Clone background color
                        newCell.fill = cloneDeep(templateCell.fill);

                        // Clone formula
                        if (templateCell.type === ExcelJS.ValueType.Formula) {
                            newCell.value = {
                                formula: templateCell.formula,
                                result: templateCell.result
                            };
                        }

                        // Clone borders
                        newCell.border = cloneDeep(templateCell.border);
                    });
                });
            }

            // Sheet paraters assignment
            for(let param of sheet.params || []) {
                worksheetWriter.getCell(param.cell).value = await param.getValue(...params);
            }

            // Process data ranges
            // -- Backward compatibility
            sheet.dataRanges ??= [{
                getData: sheet.getData,
                initialRowNum: sheet.initialRowNum
            }];
            // -- Fill sheet data
            for(let dataRange of sheet.dataRanges) {
                let excelData = await dataRange.getData(user, ...params);
                for(let i = 0; i < excelData.length; i++) {
                    Object.keys(excelData[i]).forEach(columnId=>{
                        worksheetWriter.getCell(columnId+(dataRange.initialRowNum+i)).value = excelData[i][columnId]
                    })
                    // Commit the row as soon as it is processed
                    await worksheetWriter.getRow(dataRange.initialRowNum+i).commit();
                }
            };
            await worksheetWriter.commit();
        }

        await workbookWriter.commit();

    } catch(e) {
        error = e;
    } finally {
        if(cb) {
            cb(error, error? null : outputFile.path);
        } else {
            if(error) {
                throw(error);
            }
            return path.basename(outputFile.path);
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

async function getPdfReport(cb, spec, user, ...params) {
    const getData = spec.getData;
    var buffer;
    let error = null;

    try {
        buffer = await getData(user, ...params);
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
    var getReport;
    switch(spec.reportType) {
        case 'excel':
            getReport = getExcelReport;
            break;
        case 'txt':
            getReport = getTxtReport;
            break;
        case 'pdf':
            getReport = getPdfReport;
            break;
        default:
            cb?.(null, null);
            return null;
    }
    return getReport(cb, spec, user, ...params);
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