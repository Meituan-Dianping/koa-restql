'use strict';

const co          = require('co');
const parse       = require('co-body');

const debug       = require('debug')('koa-restql:loaders');
const middlewares = require('./middlewares');
const methods     = require('./methods');
const common      = require('./common');

const switchByType  = common.switchByType;

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const loaders = {};

loaders.model       = {};
loaders.association = {};
loaders.association.plural   = {};
loaders.association.singular = {};

/**
 * load GET /user and GET /user/:id
 */
loaders.model.get = (router, base, model, options) => {
  router.get(base, 
    middlewares.parseQuery(model, options),
    function * (next) {

      let status = 200;

      const {
        attributes, where, order, include, limit, offset
      } = this.restql.parsedQuery;

      const data = 
        yield model.findAndCount({
          attributes, where, order, include, limit, offset
        });

      const {
        count, rows
      } = data;

      const xRangeHeader = `objects ${query.offset}-\
        ${query.offset + rows.length}/${count}`;

      if (count < query.limit) {
        status = 206;
      }

      this.response.set('X-Range', xRangeHeader);
      this.response.body   = rows;
      this.response.status = status;
    });

  router.get(`${base}/:id`, 
    middlewares.validateParams(model, 'id'),
    function * (next) {
      this.response.body   = this.restql.data;
      this.response.status = 200;
    })
}

/**
 * load POST /user
 */
loaders.model.post = (router, base, model, options) => {
  router.post(base, function * () {});
}

const getAllIndexes = (model) => {
  // primaryKeys
  const {
    primaryKeys, options: { indexes, uniqueKeys }
  } = model;

  const idxes = [];

  Object.keys(primaryKeys).forEach(key => {
    let primaryKey = primaryKeys[key];
    idxes.push({
      unique     : true,
      primaryKey : true,
      fields     : [primaryKey.field]
    })
  })

  indexes.forEach(index => {
    idxes.push({
      unique : index.unique,
      name   : index.name,
      fields : index.fields
    })
  })

  Object.keys(uniqueKeys).forEach(key => {
    let uniqueKey = uniqueKeys[key];
    idex.push({
      unique : true,
      name   : uniqueKey.name,
      fields : uniqueKey.fields
    })
  })

  debug(idxes);

  return idxes;
}

const getInstanceValidIndexes = (model, data) => {

  if (!data)
    return [];

  const indexes = getAllIndexes(model); 

  return indexes.filter(index => 
    index.fields.every(field => data[field] !== undefined));
}

const getInstanceValidUniqueIndexFields = (model, data) => {

  if (!data)
    return;
 
  const indexes = getInstanceValidIndexes(model, data);
  debug(indexes);

  const uniqueIndex = indexes.find(index => index.unique);
  
  if (!uniqueIndex)
    return;

  uniqueIndex.fields.forEach(field => {
    fields[field] = data[field];
  })

  return fields;
}

const upsert = (model, data) => {
  return function * () {
    let fields = getInstanceValidUniqueIndexFields(model, data);
    debug(fields);
    return {data: 1};
  }
}

/**
 * load PUT /user and PUT /user/:id
 */
loaders.model.put = (router, base, model) => {
  router.put(base, function * () {});
  router.put(`${base}/:id`, 
    middlewares.validateParams(model, 'id'),
    function * () {
      const ctx   = this;
      const body  = this.request.body || (yield parse(this));
      const id    = this.params.id;

      switchByType(body, {
        object   : () => (true),
        defaults : () => {
          ctx.throw('request body is not an object', 400);
        }
      })

      body.id = id;

      let status = 200;
      const data = 
        yield upsert(model, body);

      this.response.body   = data;
      this.response.status = status;
    });
}

/**
 * load DELETE /user and DELETE /user/:id
 */
loaders.model.del = (router, base, model) => {
  router.del(base, function * () {});
  router.del(`${base}/:id`, function * () {});
}

/**
 * load GET /user/:id/profile
 */
loaders.association.singular.get = (router, base, model, association) => {
  router.get(base, function * () {});
}

/**
 * load PUT /user/:id/profile
 */
loaders.association.singular.put = (router, base, model, association) => {
  router.put(base, function * () {});
}

/**
 * load DELETE /user/:id/profile
 */
loaders.association.singular.del = (router, base, model, association) => {
  router.del(base, function * () {});
}

/**
 * load GET /user/:id/tags and GET /user/:id/tags/:associationId
 */
loaders.association.plural.get = (router, base, model, association) => {
  router.get(base, function * () {});
  router.get(`${base}/:associationId`, function *() {})
}

/**
 * load POST /user/:id/tags
 */
loaders.association.plural.post = (router, base, model, association) => {
  router.post(base, function * () {});
}

/**
 * load PUT /user/:id/tags and PUT /user/:id/tags/:associationId
 */
loaders.association.plural.put = (router, base, model, association) => {
  router.put(base, function * () {});
  router.put(`${base}/:associationId`, function * () {});
}

/**
 * load DELETE /user/:id/tags and DELETE /user/:id/tags/:associationId
 */
loaders.association.plural.del = (router, base, model, association) => {
  router.del(base, function * () {});
  router.del(`${base}/:associationId`, function * () {});
}

module.exports = loaders;
