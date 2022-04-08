const express = require('express');
const passport = require('passport');
const asyncHandler = require('express-async-handler');
const controllerFactory = require('../controllers/controller.factory');
const config = require('../../config/config');
const modelFactory = require('../models/model.factory');

function getRouter(modelName, schema, customRoutes = null) {

    router = express.Router();

    if(config.useHttpAuth) {
        router.use(passport.authenticate('jwt', { session: false }))
    }

    /* Las funciones "Wrapper" cuando están definidas, tienen como 
    objetivo extender el comportamiento de las funciones estándar */

    let findWrapperCb,
        findWithPaginationWrapperCb,
        findOneWrapperCb,
        findByIdWrapperCb, 
        saveWrapperCb, 
        updateManyWrapperCb,
        removeWrapperCb, 
        removeByIdWrapperCb,
        countWrapperCb

    if(customRoutes) {
        findWrapperCb = customRoutes.findWrapperCb;
        findWithPaginationWrapperCb = customRoutes.findWithPaginationWrapperCb;
        findOneWrapperCb = customRoutes.findOneWrapperCb;
        findByIdWrapperCb = customRoutes.findByIdWrapperCb;
        saveWrapperCb = customRoutes.saveWrapperCb;
        updateManyWrapperCb = customRoutes.updateManyWrapperCb,
        removeWrapperCb = customRoutes.removeWrapperCb;
        removeByIdWrapperCb = customRoutes.removeByIdWrapperCb;
        countWrapperCb = customRoutes.countWrapperCb;
    }

    router.route('/find/:discriminator?').post(asyncHandler(getRtrFindFn(modelName, findWrapperCb)));
    router.route('/findWithPagination/:discriminator?').post(asyncHandler(getRtrFindWithPaginationFn(modelName, findWithPaginationWrapperCb)));
    router.route('/findOne/:discriminator?').post(asyncHandler(getRtrFindOneFn(modelName, findOneWrapperCb)));
    router.route('/findById/:discriminator?').post(asyncHandler(getRtrFindByIdFn(modelName, findByIdWrapperCb)));
    router.route('/save/:discriminator?').post(asyncHandler(getRtrSaveFn(modelName, schema, saveWrapperCb)));
    router.route('/updateMany/:discriminator?').post(asyncHandler(getRtrUpdateManyFn(modelName, updateManyWrapperCb)));
    router.route('/remove/:discriminator?').post(asyncHandler(getRtrRemoveFn(modelName, removeWrapperCb)));
    router.route('/removeById/:discriminator?').post(asyncHandler(getRtrRemoveByIdFn(modelName, removeByIdWrapperCb)));
    router.route('/count/:discriminator?').post(asyncHandler(getRtrCountFn(modelName, countWrapperCb)));

    if(customRoutes && customRoutes.setCustomRoutes) { 
        customRoutes.setCustomRoutes(router)
    }

    return router;
}

function getRtrFindFn(modelName, wrapperFn = null) {

    let ctrlFindDefaultFn = controllerFactory.getCtrlFindFn()

    let ctrlFindFn = !wrapperFn? 
        ctrlFindDefaultFn :
        (model, params, cb) => wrapperFn(model, params, ctrlFindDefaultFn, cb)

    return async function find(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);
   
        await ctrlFindFn(model, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindWithPaginationFn(modelName, wrapperFn = null) {

    let ctrlFindWithPaginationDefaultFn = controllerFactory.getCtrlFindWithPaginationFn();

    let ctrlFindWithPaginationFn = !wrapperFn? 
        (model, params, cb) => ctrlFindWithPaginationDefaultFn(model, params, null, null, cb) :
        wrapperFn(ctrlFindWithPaginationDefaultFn);

    return async function findWithPagination(req, res) {   

        let model = modelFactory.getModel(modelName, req.params.discriminator);

        await ctrlFindWithPaginationFn(model, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindOneFn(modelName, wrapperFn = null) {

    let ctrlFindOneDefaultFn = controllerFactory.getCtrlFindOneFn();

    let ctrlFindOneFn = !wrapperFn? 
        ctrlFindOneDefaultFn :
        wrapperFn(ctrlFindOneDefaultFn)

    return async function findOne(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);
   
        await ctrlFindOneFn(model, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindByIdFn(modelName, wrapperFn = null) {

    let ctrlFindByIdDefaultFn = controllerFactory.getCtrlFindByIdFn();

    let ctrlFindByIdFn = !wrapperFn? 
        ctrlFindByIdDefaultFn :
        wrapperFn(ctrlFindByIdDefaultFn)

    return async function findById(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);
    
        await ctrlFindByIdFn(model, req.body.id, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrSaveFn(modelName, schema, wrapperFn = null) {

    let ctrlSaveDefaultFn = controllerFactory.getCtrlSaveFn(schema);

    let ctrlSaveFn = !wrapperFn? 
        ctrlSaveDefaultFn :
        wrapperFn(ctrlSaveDefaultFn);

    return async function save(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);

        let data = await ctrlSaveFn(model, req.body);
        res.json(data);
    }
}

function getRtrUpdateManyFn(modelName, wrapperFn = null) {

    let ctrlUpdateManyDefaultFn = controllerFactory.getCtrlUpdateManyFn();

    let ctrlUpdateManyFn = !wrapperFn? 
        ctrlUpdateManyDefaultFn :
        wrapperFn(ctrlUpdateManyDefaultFn);

    return async function updateMany(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);

        let ret = await ctrlUpdateManyFn(model, req.body.query, req.body.data);
        res.json(ret);
    }
}

function getRtrRemoveFn(modelName, wrapperFn = null) {

    let ctrlRemoveDefaultFn = controllerFactory.getCtrlRemoveFn();

    let ctrlRemoveFn = !wrapperFn? 
        ctrlRemoveDefaultFn :
        wrapperFn(ctrlRemoveDefaultFn);

    return async function remove(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);

        let data = await ctrlRemoveFn(model, req.body);
        res.json(data);
    }
}

function getRtrRemoveByIdFn(modelName, wrapperFn = null) {

    let ctrlRemoveByIdDefaultFn = controllerFactory.getCtrlRemoveByIdFn();

    let ctrlRemoveByIdFn = !wrapperFn? 
        ctrlRemoveByIdDefaultFn :
        wrapperFn(ctrlRemoveByIdDefaultFn);

    return async function removeById(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);

        let data = await ctrlRemoveByIdFn(model, req.body.id);
        res.json(data);
    }
}

function getRtrCountFn(modelName, wrapperFn = null) {

    let ctrlCountDefaultFn = controllerFactory.getCtrlCountFn();

    let ctrlCountFn = !wrapperFn? 
        ctrlCountDefaultFn :
        wrapperFn(ctrlCountDefaultFn)

    return async function count(req, res) {

        let model = modelFactory.getModel(modelName, req.params.discriminator);
   
        await ctrlCountFn(model, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

module.exports = getRouter