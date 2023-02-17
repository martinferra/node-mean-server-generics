const express = require('express');
const passport = require('passport');
const asyncHandler = require('express-async-handler');
const controllerFactory = require('../controllers/controller.factory');
const config = require('../../config/config');
const modelFactory = require('../models/model.factory');

function getRouter(modelName, schema, customRoutes = null, discByUser = false) {

    router = express.Router();

    /* Autenticación y seteo del atributo "user" en el objeto req */
    router.use(passport.authenticate('jwt', { session: false }));

    /* Seteo del atributo "discriminator" en el objeto req */
    router.use('/*/:discriminator?', (req, res, next) => {
        req.discriminator = (discByUser && req.user?._id)?
            req.user._id.toString() : 
            req.params.discriminator;
        return next();
    });

    /* Las funciones "Wrapper" cuando están definidas, tienen como 
    objetivo extender el comportamiento de las funciones estándar */

    router.route('/find/:discriminator?').post([
        ...(customRoutes?.findPreMiddleware || []),
        asyncHandler(getRtrFindFn(modelName, customRoutes?.findWrapperCb?.(ctrlFindDefaultFn))),
        ...(customRoutes?.findPostMiddleware || [])
    ]);
    router.route('/findWithPagination/:discriminator?').post([
        ...(customRoutes?.findWithPaginationPreMiddleware || []),
        asyncHandler(getRtrFindWithPaginationFn(modelName, customRoutes?.findWithPaginationWrapperCb)),
        ...(customRoutes?.findWithPaginationPostMiddleware || [])
    ]);
    router.route('/findOne/:discriminator?').post([
        ...(customRoutes?.findOnePreMiddleware || []),
        asyncHandler(getRtrFindOneFn(modelName, customRoutes?.findOneWrapperCb)),
        ...(customRoutes?.findOnePostMiddleware || [])
    ]);
    router.route('/findById/:discriminator?').post([
        ...(customRoutes?.findByIdPreMiddleware || []),
        asyncHandler(getRtrFindByIdFn(modelName, customRoutes?.findByIdWrapperCb)),
        ...(customRoutes?.findByIdPostMiddleware || [])
    ]);
    router.route('/save/:discriminator?').post([
        ...(customRoutes?.savePreMiddleware || []),
        asyncHandler(getRtrSaveFn(modelName, schema, customRoutes?.saveWrapperCb)),
        ...(customRoutes?.savePostMiddleware || [])
    ]);
    router.route('/updateMany/:discriminator?').post([
        ...(customRoutes?.updateManyPreMiddleware || []),
        asyncHandler(getRtrUpdateManyFn(modelName, customRoutes?.updateManyWrapperCb)),
        ...(customRoutes?.updateManyPostMiddleware || [])
    ]);
    router.route('/remove/:discriminator?').post([
        ...(customRoutes?.removePreMiddleware || []),
        asyncHandler(getRtrRemoveFn(modelName, customRoutes?.removeWrapperCb)),
        ...(customRoutes?.removePostMiddleware || [])
    ]);
    router.route('/removeById/:discriminator?').post([
        ...(customRoutes?.removeByIdPreMiddleware || []),
        asyncHandler(getRtrRemoveByIdFn(modelName, customRoutes?.removeByIdWrapperCb)),
        ...(customRoutes?.removeByIdPostMiddleware || [])
    ]);
    router.route('/count/:discriminator?').post([
        ...(customRoutes?.countPreMiddleware || []),
        asyncHandler(getRtrCountFn(modelName, customRoutes?.countWrapperCb)),
        ...(customRoutes?.countPostMiddleware || [])
    ]);

    customRoutes?.setCustomRoutes?.(router);

    return router;
}

function getRtrFindFn(modelName, wrapperFn) {

    const ctrlFindFn = wrapperFn?.(controllerFactory.getCtrlFindFn())
        || controllerFactory.getCtrlFindFn(); 

    return async function find(req, res) {

        const model = modelFactory.getModel(modelName, req.discriminator);

        await ctrlFindFn(model, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindWithPaginationFn(modelName, wrapperFn) {

    const ctrlFindWithPaginationFn = wrapperFn?.(controllerFactory.getCtrlFindWithPaginationFn())
        || controllerFactory.getCtrlFindWithPaginationFn(); 

    return async function findWithPagination(req, res) {   

        let model = modelFactory.getModel(modelName, req.discriminator);

        await ctrlFindWithPaginationFn(model, req.body, null, null, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindOneFn(modelName, wrapperFn) {
 
    const ctrlFindOneFn = wrapperFn?.(controllerFactory.getCtrlFindOneFn())
        || controllerFactory.getCtrlFindOneFn(); 

    return async function findOne(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);
   
        await ctrlFindOneFn(model, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrFindByIdFn(modelName, wrapperFn) {

    const ctrlFindByIdFn = wrapperFn?.(controllerFactory.getCtrlFindByIdFn())
        || controllerFactory.getCtrlFindByIdFn(); 

    return async function findById(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);
    
        await ctrlFindByIdFn(model, req.body.id, req.body, (err, data) => {
            if(err) { 
                console.error(err);
                return err;
            }
            res.json(data);
        });
    };
}

function getRtrSaveFn(modelName, schema, wrapperFn) {

    const ctrlSaveFn = wrapperFn?.(controllerFactory.getCtrlSaveFn(schema))
        || controllerFactory.getCtrlSaveFn(schema); 

    return async function save(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);

        let data = await ctrlSaveFn(model, req.body);
        res.json(data);
    }
}

function getRtrUpdateManyFn(modelName, wrapperFn) {

    const ctrlUpdateManyFn = wrapperFn?.(controllerFactory.getCtrlUpdateManyFn())
        || controllerFactory.getCtrlUpdateManyFn(); 

    return async function updateMany(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);

        let ret = await ctrlUpdateManyFn(model, req.body.query, req.body.data);
        res.json(ret);
    }
}

function getRtrRemoveFn(modelName, wrapperFn) {

    const ctrlRemoveFn = wrapperFn?.(controllerFactory.getCtrlRemoveFn())
        || controllerFactory.getCtrlRemoveFn(); 

    return async function remove(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);

        let data = await ctrlRemoveFn(model, req.body);
        res.json(data);
    }
}

function getRtrRemoveByIdFn(modelName, wrapperFn) {

    const ctrlRemoveByIdFn = wrapperFn?.(controllerFactory.getCtrlRemoveByIdFn())
        || controllerFactory.getCtrlRemoveByIdFn(); 

    return async function removeById(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);

        let data = await ctrlRemoveByIdFn(model, req.body.id);
        res.json(data);
    }
}

function getRtrCountFn(modelName, wrapperFn = null) {

    const ctrlCountFn = wrapperFn?.(controllerFactory.getCtrlCountFn())
        || controllerFactory.getCtrlCountFn(); 

    return async function count(req, res) {

        let model = modelFactory.getModel(modelName, req.discriminator);
   
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