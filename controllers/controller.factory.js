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
              $cond: {
                if: {$eq:[{$size:'$countArr'},0]}, 
                then: 0, 
                else: {
                  $let: {
                    vars: {
                      countObj: {$arrayElemAt: ['$countArr', 0]}
                    }, 
                    in: '$$countObj.count'
                  }
                }
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

function getCtrlFindFn() {
    return async function find(model, queryParams, cb) {
        return await basicQueryFind(queryParams, ()=>model.find(), null, cb);
    }
}

function getCtrlFindWithPaginationFn() {

    return async function findWithPagination(model, params, createAggregationCb=null, postPipelineArr=[], cb=null) {

        let sortField = params.pagParams.sort.property;
        let secondSortDirection = params.pagParams.sort.direction === 'asc'? 1 : 
            (params.pagParams.sort.direction === 'desc'? -1 : 0)
        let firstSortDirection = (params.pagParams.navDirection === 'left'? -1 : 1)*secondSortDirection;
        // El operador puede ser '$gt ó $lt'
        let sortOperator = `$${firstSortDirection===1? 'g' : 'l'}t`;
        let lastValue = params.pagParams.sort.refValue;
        let lastId = params.pagParams.sort.refId;
        let skipValue = params.pagParams.pageNumber && !(lastValue && lastId)? params.pagParams.pageNumber : 0;
        let pageSize = params.pagParams.pageSize;

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
            { $skip: skipValue*pageSize },
            { $limit: pageSize },
            { $sort: { [sortField]: secondSortDirection, _id: secondSortDirection } }
        ], postPipelineArr);
        
        return await basicAggregationFind(model, params, createAggregationCb, paginationPipelineArr, cb);
    }
}

function getCtrlFindOneFn() {
    return async function findOne(model, queryParams, cb) {
        return await basicQueryFind(queryParams, ()=>model.findOne(), null, cb);
    }
}

function getCtrlFindByIdFn() {
    return async function findById(model, id, queryParams, cb) {
        return await basicQueryFind(queryParams, ()=>model.findById(id), null, cb);
    }
}

function getCtrlSaveFn(schema) {
    return async function save(model, data) {
        let validation = schema.validate(data);
        if(validation.error) {
            console.error(validation.error);
            return validation.error
        }
        return await model.saveDocument(data);
    }
}

function getCtrlUpdateManyFn() {
    return async function updateMany(model, query, data) {
        return await model.updateMany(query, data)
    }
}

function getCtrlRemoveFn() {
    return async function remove(model, query) {
        return await model.deleteMany(query).exec();
    }
}

function getCtrlRemoveByIdFn() {
    return async function removeById(model, id) {
        return await model.findByIdAndRemove(id).exec();
    }
}

function getCtrlCountFn() {
    return async function count(model, queryParams, cb) {
        return await model.find(queryParams.filter).count(cb);
    }
}

module.exports = {
    getCtrlFindFn,
    getCtrlFindWithPaginationFn,
    getCtrlFindOneFn,
    getCtrlFindByIdFn,
    getCtrlSaveFn,
    getCtrlUpdateManyFn,
    getCtrlRemoveFn,
    getCtrlRemoveByIdFn,
    getCtrlCountFn
}