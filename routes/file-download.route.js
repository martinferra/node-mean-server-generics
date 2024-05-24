const asyncHandler = require('express-async-handler');
const { getBaseRouter } = require('./router.factory');
const os = require('os');
const fs = require('fs');
const path = require('path');

const fileDownloadRoutes = getBaseRouter();

fileDownloadRoutes.route('/:fileName').get(asyncHandler(fileDownload));

function fileDownload(req, res) {

    const filePath = path.join(os.tmpdir(), req.params.fileName);

    res.download(filePath, (err) => {
        if (err) {
            console.log(err);
        } else {
            // Delete the file after download
            fs.unlink(filePath, (err) => {
                if (err) console.log(err);
                else console.log('File deleted successfully');
            });
        }
    });
}

module.exports = fileDownloadRoutes;
