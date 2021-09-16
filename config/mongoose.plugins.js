const async = require('async')
const clone = require('lodash').clone
const mongoose = require('mongoose')

function saveChildrenInvoker(schema, obj) {
    return cb => schema.saveChildren(obj, cb)
}

function saveChildrenForArrayInvoker(schema, objArr) {
    return !objArr? cb => cb(null, null) : 
                    cb => async.parallel( 
                                    objArr.map( obj => saveChildrenInvoker(schema, obj) ), 
                                    (err, objArrRes)=>cb(err, objArrRes)
                                )
}

function saveDocumentInvokker(modelClassName, obj) {

    if(!obj || typeof obj === 'string' || obj.constructor.name === 'ObjectID') return cb => cb(null, obj)

    if(!modelClassName || modelClassName.indexOf('.')>=0) {
        return cb => {
            cb(null, obj._id);
            return
        }
    }

    const modelClass = mongoose.model(modelClassName);
    return cb => modelClass.saveDocument(obj, async (err, doc) => {
        if(err) {
            console.error(new Error(`saveDocumentInvokker outer error, obj: ${obj}, modelClassName: ${modelClassName}`))
            console.error(err)
            cb(err, null)
            return
        }
        if(!doc) {
            let innerErr = new Error(`saveDocumentInvokker inner error, "doc" is undefined, obj: ${obj}, modelClassName: ${modelClassName}`)
            console.error(innerErr)
            cb(innerErr, doc)
            return
        }
        cb(err, doc._id);
        return
    })
}

function saveDocumentArrayInvokker(modelClassName, objArr) {
    return !objArr? cb => cb(null, null) : 
                    cb => async.parallel( 
                                    objArr.map( obj => saveDocumentInvokker(modelClassName, obj) ), 
                                    (err, objArrRes)=>cb(err, objArrRes)
                                )
}

function identityFnInvoker(obj) {
    return cb => cb(null, obj)
}

function globalPlugin(schema, options) {

    if(!schema.constructor.prototype.saveChildren) {
        schema.constructor.prototype.saveChildren = async function(obj, cb) {

            let resObj;

            try {
                if(!obj) return;

                let fnObj = {}
            
                for (let path in this.paths) {
            
                    if(!path || path === '__v' || !obj.hasOwnProperty(path)) continue;

                    if(path === '_id') {
                        fnObj[path] = identityFnInvoker(obj[path]);
                        continue;
                    }
            
                    switch(this.paths[path].constructor.name) {
                        case 'SingleNestedPath': fnObj[path] = saveChildrenInvoker(this.paths[path].schema, obj[path]); break;
                        case 'DocumentArrayPath': fnObj[path] = saveChildrenForArrayInvoker(this.paths[path].schema, obj[path]); break;
                        case 'ObjectId': fnObj[path] = saveDocumentInvokker(this.tree[path].ref, obj[path]); break;
                        case 'SchemaArray': fnObj[path] = saveDocumentArrayInvokker(this.tree[path][0].ref, obj[path]); break;
                        default: fnObj[path] = identityFnInvoker(obj[path]); break;
                    }
                }
            
                resObj = await async.parallel(fnObj)
                
                if(cb)
                    cb(null, resObj)
                else
                    return resObj
            } catch(e) {
                if(cb)
                    cb(e, resObj)
                else
                    throw e
            }
        }
    }

    schema.statics.saveDocument = async function(obj, cb) {

        let savedDoc, reducedObj;

        try {
            // Si el objeto está representado por el id de un 
            // documento existente no se realiza ninguna conversión
            if(typeof obj === 'string') {
                if(cb) cb(null, obj)
                return obj
            }

            if(obj.__t && obj.__t !== this.modelName) {
                let model = mongoose.models[obj.__t]
                savedDoc = await model.saveDocument(obj, null)
                if(cb) {
                    cb(null, savedDoc)
                    return
                } else {
                    return savedDoc
                }
            }

            this.getSingleSettingProperties().forEach( prop => {
                delete obj[prop];
            })

            reducedObj =  await this.schema.saveChildren(obj);

            savedDoc = await this.findByUniqueKeysAndUpdate(reducedObj);

            if(cb)
                cb(null, savedDoc)
            else
                return savedDoc
        }
        catch(e) {
            if(cb) 
                cb(e, savedDoc)
            else
                throw e
        }
    }

    schema.statics.findByUniqueKeys = async function(obj, cb) {

        let query = {}

        if(obj._id) {
            query._id = obj._id;
        } else {
            let uniqueKeys = this.getUniqueKeys();
            uniqueKeys.forEach( key => {
                query[key] = obj[key]
            });
        }

        let existingDoc = await this.findOne(query);
        if(cb) cb(existingDoc);
        return existingDoc;
    }

    schema.statics.findByUniqueKeysAndUpdate = async function(obj, cb) {

        let query,
            queryWithUniqueKeys = {},
            queryWithId = { _id: obj._id },
            dataToSave,
            dataWithUniqueKeys = clone(obj),
            dataWithOutUniqueKeys = clone(obj),
            savedDoc,
            uniqueKeys = this.getUniqueKeys(),
            hasUniqueKeys = !!uniqueKeys.length;

        delete dataWithUniqueKeys._id;
        delete dataWithOutUniqueKeys._id;
        
        uniqueKeys.forEach( key => {
            delete dataWithOutUniqueKeys[key];
            queryWithUniqueKeys[key] = obj[key] !== undefined? obj[key] : null;
        });

        if(obj._id && !(hasUniqueKeys && this.useUniqueKeys)) {
            query = queryWithId;
            dataToSave = dataWithUniqueKeys;
        } else if(hasUniqueKeys) {
            query = queryWithUniqueKeys;
            dataToSave = dataWithOutUniqueKeys;
        }

        if(query) {
            try {
                savedDoc = await this.findOneAndUpdate(query, dataToSave, { new: true, upsert: true });
            }
            /* El upsert puede fallar en dos casos siempre que la colección tenga un índice de tipo 
               "unique":
            1) En una operación asincrónica en paralelo en la cual al buscar el documento por los 
               campos del índice, el mismo no existe, pero al momento de crearlo sí, porque fué creado 
               por otra ejecución paralela posterior a la búsqueda inicial 
            2) Cuando la búsqueda se realiza por "_id" (se trata de un update) y los datos que se 
               intentan guardar colisionan con un documento existente para el/los campo/s del índice */
            catch(e) {
                if(e.constructor.name == 'MongoError' && e.code == 11000) {
                    // Caso 2)
                    if(hasUniqueKeys && query._id) {
                        query = queryWithUniqueKeys;
                        dataToSave = dataWithOutUniqueKeys;
                    }
                    savedDoc = await this.findOneAndUpdate(query, dataWithUniqueKeys, { new: true, upsert: true });
                } else {
                    throw e;
                }
            }
        } else {
            savedDoc = await this.create(dataWithUniqueKeys);
        }

        if(cb) cb(savedDoc);
        return savedDoc;
    }

    schema.statics.getUniqueKeys = function() {
        if(this._getUniqueKeys)
            return this._getUniqueKeys()
        else
            return []
    }

    schema.statics.getSingleSettingProperties = function() {
        if(this._getSingleSettingProperties)
            return this._getSingleSettingProperties();
        else
            return [];
    }

    schema.methods.patchDocument = async function(plainObj) {

        this.constructor.getSingleSettingProperties().forEach( prop => {
            if(this[prop]) plainObj[prop] = this[prop]
        })

        delete plainObj._id;
        this.overwrite(plainObj);
        return await this.save();
    }
}

module.exports = globalPlugin