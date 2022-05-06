const mongoose = require('mongoose');
const subscriptions = require('../config/subscriptions');

var modelSchemas = new Map();
var modelPostCreation = new Map();

function registerModelSchema(name, schema) {
    modelSchemas.set(name, schema);
    addMiddleware(schema);
    if(!schema.statics.useDiscriminators) {
        return getModel(name);
    }
    return;
}

function registerModelPostCreation(name, fn) {
    modelPostCreation.set(name, fn)
}

function addMiddlewareEntry(schema, method, pathTail) {
    schema.post(method, function (doc) {
        let path = doc.constructor.collection.name.replace('_','/')+'/'+pathTail;
        subscriptions.publish(path, doc._doc);
    });
};

function addMiddleware(schema) {
    addMiddlewareEntry(schema, 'save', 'new');
    addMiddlewareEntry(schema, 'findOneAndUpdate', 'update');
    addMiddlewareEntry(schema, 'findOneAndRemove', 'remove');
};

function getModel(name, discriminator) {
    const fullName = name + (discriminator? '_' + discriminator : '');
    const models = mongoose.modelNames();
    let model;
    if(models.find(m=>m===fullName)) {
        model = mongoose.model(fullName);
    } else {
        let schema = modelSchemas.get(name);
        if(schema) {
            model = mongoose.model(fullName, schema, discriminator? fullName.toLowerCase(): undefined);
            let modelPostCreationFn = modelPostCreation.get(name);
            if(modelPostCreationFn) {
                modelPostCreation(model);
            }
        } else {
            throw new Error(`Model schema doesn't exist for model name '${name}'`);
        }
    }
    return model;
}

module.exports = { registerModelSchema, registerModelPostCreation, getModel }