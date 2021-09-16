const mongoose = require('mongoose');

async function basicAggregationFind(model, aggregationParams, createAggregationCb=null, postPipelineArr=null, cb=null) {

    let aggregation = createAggregationCb? 
        createAggregationCb(model, aggregationParams) : 
        model.aggregate();

    if(aggregationParams.filter) aggregation = aggregation.match(aggregationParams.filter);
    if(aggregationParams.projection) {
        /* Es necesario agregar en la proyección los 
        paths que luego se usarán para el populate */
        let extraPaths = !aggregationParams.populateOpts? '' : 
            ' ' + aggregationParams.populateOpts.map(opt=>opt.path).join(' ');
        aggregation = aggregation.project(aggregationParams.projection+extraPaths);
    }

    /* Se agrega el conteo de documentos */
    aggregation
        .facet({
            documents:  ( postPipelineArr || [{$match: {}}] ),
            countArr: [ {$count: 'count'} ]
        })
        .project({
            documents: '$documents',
            count: {
                $let: {
                    vars: {
                        countObj: {$arrayElemAt:['$countArr',0]}
                    },
                    in: '$$countObj.count'
                }
            }
        });

    let dataArr = await aggregation.exec();
    let data = { documents: dataArr[0].documents, count: dataArr[0].count };

    if(aggregationParams.populateOpts) {
        let populatedDocs = await model.populate(data.documents, aggregationParams.populateOpts);
        let populatedData = { documents: populatedDocs, count: data.count };
        if(cb) {
            cb(null, populatedData);
            return;
        } else {
            return populatedData;
        }
    } else {
        if(cb) {
            cb(null, data);
            return;
        } else {
            return data
        }
    }
}

async function basicQueryFind(queryParams, createCb, postCb, cb) {

    let query = createCb();

    if(queryParams.filter) query.setQuery(queryParams.filter);
    if(queryParams.projection) query = query.select(queryParams.projection);
    if(queryParams.options) query = query.setOptions(queryParams.options);

    if(queryParams.populateOpts) {
        queryParams.populateOpts.forEach( populateOpt => {
            query = query.populate(populateOpt);
        });
    }

    if(postCb) query = postCb(query);

    if(cb) {
        query.exec(cb);
        return;
    } else {
        return await query.exec();
    }
}

function getCtrlFindFn(model) {
    return async function find(queryParams, cb) {
        return await basicQueryFind(queryParams, ()=>model.find(), null, cb);
    }
}

function getCtrlFindWithPaginationFn(model) {

    return async function findWithPagination(params, createAggregationCb=null, postPipelineArr=[], cb=null) {

        let sortField = params.pagParams.sort.field;
        let navDirection = params.pagParams.navDirection;
        let firstSortDirection = (navDirection? navDirection : 1)*params.pagParams.sort.direction;
        let secondSortDirection = params.pagParams.sort.direction;
        // El operador puede ser '$gt ó $lt'
        let sortOperator = `$${firstSortDirection===1? 'g' : 'l'}t`;
        let lastValue = params.pagParams.sort.lastValue;
        let lastId = params.pagParams.sort.lastId;
        let skipValue = params.pagParams.pageNumber && !(lastValue && lastId)? params.pagParams.pageNumber : 0;
        let docsPerPage = params.pagParams.docsPerPage;

        let paginationFilter = (lastValue && lastId)? { 
            '$or': [ 
                { [sortField]: { [sortOperator]: lastValue } }, 
                {
                    [sortField]: lastValue, 
                    '_id': { [sortOperator]: mongoose.Types.ObjectId(lastId) } 
                } 
            ] 
        } : null;

        let paginationPipelineArr = [];
        
        if(paginationFilter) {
            paginationPipelineArr.push({ $match: paginationFilter });
        };

        paginationPipelineArr = paginationPipelineArr.concat([
            { $sort: { [sortField]: firstSortDirection, _id: firstSortDirection } },
            { $skip: skipValue*docsPerPage },
            { $limit: docsPerPage },
            { $sort: { [sortField]: secondSortDirection, _id: secondSortDirection } }
        ], postPipelineArr);
        
        return await basicAggregationFind(model, params, createAggregationCb, paginationPipelineArr, cb);
    }
}

function getCtrlFindOneFn(model) {
    return async function findOne(queryParams, cb) {
        return await basicQueryFind(queryParams, ()=>model.findOne(), null, cb);
    }
}

function getCtrlFindByIdFn(model) {
    return async function findById(id, queryParams, cb) {
        return await basicQueryFind(queryParams, ()=>model.findById(id), null, cb);
    }
}

function getCtrlSaveFn(model, schema) {
    return async function save(data) {
        let validation = schema.validate(data);
        if(validation.error) {
            console.error(validation.error);
            return validation.error
        }
        return await model.saveDocument(data);
    }
}

function getCtrlRemoveFn(model) {
    return async function remove(query) {
        return await model.deleteMany(query).exec();
    }
}

function getCtrlRemoveByIdFn(model) {
    return async function removeById(id) {
        return await model.findByIdAndRemove(id).exec();
    }
}

function getCtrlCountFn(model) {
    return async function count(queryParams, cb) {
        return await model.find(queryParams.filter).count(cb);
    }
}

module.exports = {
    getCtrlFindFn,
    getCtrlFindWithPaginationFn,
    getCtrlFindOneFn,
    getCtrlFindByIdFn,
    getCtrlSaveFn,
    getCtrlRemoveFn,
    getCtrlRemoveByIdFn,
    getCtrlCountFn
}