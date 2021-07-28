const reportsCtrl = require('../controllers/reports.controller');

async function reportsRtrFn(req, res) {
   
    await reportsCtrl.getReport(
        (err, fileData) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.send(fileData);
        },
        req.body.reportId,
        ...req.body.reportParams
    );
};

module.exports = { reportsRtrFn }