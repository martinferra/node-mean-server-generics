const express = require('express');
const passport = require('passport');
const asyncHandler = require('express-async-handler');
const controllerFactory = require('../controllers/controller.factory');

function getRouter(model, schema, customRoutes = null) {

    router = express.Router();

    router.use(passport.authenticate('jwt', { session: false }))

    /* Las funciones "Wrapper" cuando están definidas, tienen como 
    objetivo extender el comportamiento de las funciones estándar */

    let findWrapperCb,
        findWithPaginationWrapperCb,
        findOneWrapperCb,
        findByIdWrapperCb, 
        saveWrapperCb, 
        removeWrapperCb, 
        removeByIdWrapperCb,
        countWrapperCb

    if(customRoutes) {
        findWrapperCb = customRoutes.findWrapperCb;
        findWithPaginationWrapperCb = customRoutes.findWithPaginationWrapperCb;
        findOneWrapperCb = customRoutes.findOneWrapperCb;
        findByIdWrapperCb = customRoutes.findByIdWrapperCb;
        saveWrapperCb = customRoutes.saveWrapperCb;
        removeWrapperCb = customRoutes.removeWrapperCb;
        removeByIdWrapperCb = customRoutes.removeByIdWrapperCb;
        countWrapperCb = customRoutes.countWrapperCb;
    }

    router.route('/find').post(asyncHandler(getRtrFindFn(model, findWrapperCb)));
    router.route('/findWithPagination').post(asyncHandler(getRtrFindWithPaginationFn(model, findWithPaginationWrapperCb)));
    router.route('/findOne').post(asyncHandler(getRtrFindOneFn(model, findOneWrapperCb)));
    router.route('/findById').post(asyncHandler(getRtrFindByIdFn(model, findByIdWrapperCb)));
    router.route('/save').post(asyncHandler(getRtrSaveFn(model, schema, saveWrapperCb)));
    router.route('/remove').post(asyncHandler(getRtrRemoveFn(model, removeWrapperCb)));
    router.route('/removeById').post(asyncHandler(getRtrRemoveByIdFn(model, removeByIdWrapperCb)));
    router.route('/count').post(asyncHandler(getRtrCountFn(model, countWrapperCb)));

    if(customRoutes && customRoutes.setCustomRoutes) { 
        customRoutes.setCustomRoutes(router)
    }

    return router;
}

function getRtrFindFn(model, wrapperFn = null) {

    let ctrlFindDefaultFn = controllerFactory.getCtrlFindFn(model)

    let ctrlFindFn = !wrapperFn? 
        ctrlFindDefaultFn :
        (params, cb) => wrapperFn(params, ctrlFindDefaultFn, cb)

    return async function find(req, res) {
   
        await ctrlFindFn(req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindWithPaginationFn(model, wrapperFn = null) {

    let ctrlFindWithPaginationDefaultFn = controllerFactory.getCtrlFindWithPaginationFn(model);

    let ctrlFindWithPaginationFn = !wrapperFn? 
        (params, cb) => ctrlFindWithPaginationDefaultFn(params, null, null, cb) :
        wrapperFn(ctrlFindWithPaginationDefaultFn);

    return async function findWithPagination(req, res) {   
        await ctrlFindWithPaginationFn(req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindOneFn(model, wrapperFn = null) {

    let ctrlFindOneDefaultFn = controllerFactory.getCtrlFindOneFn(model);

    let ctrlFindOneFn = !wrapperFn? 
        ctrlFindOneDefaultFn :
        wrapperFn(ctrlFindOneDefaultFn)

    return async function findOne(req, res) {
   
        await ctrlFindOneFn(req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindByIdFn(model, wrapperFn = null) {

    let ctrlFindByIdDefaultFn = controllerFactory.getCtrlFindByIdFn(model);

    let ctrlFindByIdFn = !wrapperFn? 
        ctrlFindByIdDefaultFn :
        wrapperFn(ctrlFindByIdDefaultFn)

    return async function findById(req, res) {
    
        await ctrlFindByIdFn(req.body.id, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrSaveFn(model, schema, wrapperFn = null) {

    let ctrlSaveDefaultFn = controllerFactory.getCtrlSaveFn(model, schema);

    let ctrlSaveFn = !wrapperFn? 
        ctrlSaveDefaultFn :
        wrapperFn(ctrlSaveDefaultFn);

    return async function save(req, res) {
        let data = await ctrlSaveFn(req.body);
        res.json(data);
    }
}

function getRtrRemoveFn(model, wrapperFn = null) {

    let ctrlRemoveDefaultFn = controllerFactory.getCtrlRemoveFn(model);

    let ctrlRemoveFn = !wrapperFn? 
        ctrlRemoveDefaultFn :
        wrapperFn(ctrlRemoveDefaultFn);

    return async function remove(req, res) {
        let data = await ctrlRemoveFn(req.body);
        res.json(data);
    }
}

function getRtrRemoveByIdFn(model, wrapperFn = null) {

    let ctrlRemoveByIdDefaultFn = controllerFactory.getCtrlRemoveByIdFn(model);

    let ctrlRemoveByIdFn = !wrapperFn? 
        ctrlRemoveByIdDefaultFn :
        wrapperFn(ctrlRemoveByIdDefaultFn);

    return async function removeById(req, res) {
        let data = await ctrlRemoveByIdFn(req.body.id);
        res.json(data);
    }
}

function getRtrCountFn(model, wrapperFn = null) {

    let ctrlCountDefaultFn = controllerFactory.getCtrlCountFn(model);

    let ctrlCountFn = !wrapperFn? 
        ctrlCountDefaultFn :
        wrapperFn(ctrlCountDefaultFn)

    return async function count(req, res) {
   
        await ctrlCountFn(req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

module.exports = getRouter