const mongoose = require('mongoose');

var modelSchemas = new Map();
var modelPostCreation = new Map();

function registerModelSchema(name, schema) {
    modelSchemas.set(name, schema)
}

function registerModelPostCreation(name, fn) {
    modelPostCreation.set(name, fn)
}

function getModel(name, discriminator) {
    const fullName = name + (discriminator? '_'+discriminator : '');
    const models = mongoose.modelNames();
    let model;
    if(models.find(m=>m===fullName)) {
        model = mongoose.model(fullName);
    } else {
        let schema = modelSchemas.get(name);
        if(schema) {
            model = mongoose.model(fullName, schema);
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