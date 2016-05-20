'use strict'

const parse  = require('co-body');
const debug  = require('debug')('koa-restql:middlewares');

const common = require('./common');
const getAssociationName = common.getAssociationName;
const parseQuerystring   = common.parseQuerystring;

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const get = (model, association) => {
  return function * () {
    let params  = this.params
      , id      = params.id
      , qs      = this.request.querystring
      , query, data;

    let debugInfo = `get ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    if (!association) {
      query = parseQuerystring(qs, model);

      if (id === undefined) {
        data = yield model.findAll({
          attributes : query._attributes,
          where      : query._where,
          order      : query._order,
          include    : query._include,
          limit      : query._limit,
          offset     : query._offset
        })
      } else {
        data = yield model.findOne({
          attributes : query._attributes,
          where      : { id },
          include    : query._include
        })

        if (!data) {
          this.throw(`${model.name} ${id} is not found`, 404);
        }
      }
    } else {
      let associationId    = params.associationId
        , associationModel = association.target
        , order;

      query = parseQuerystring(qs, associationModel);

      if (!associationId) {
        let name   = getAssociationName(association)
          , getter = `get${capitalizeFirstLetter(name)}`;

        data = yield model.findOne({
          where : { id }
        })

        data = yield data[getter]({
          attributes : query._attributes,
          where      : query._where,
          order      : query._order,
          include    : query._include,
          through    : query._through,
          limit      : query._limit,
          offset     : query._offset
        })
      } else {
        data = yield associationModel.findOne({
          attributes : query._attributes,
          where      : { id: associationId },
          include    : query._include
        })

        if (!data) {
          this.throw(`${model.name} ${id} association ${associationId} is not found`, 404);
        }
      }
    }

    this.body   = data;
    this.status = 200;
  }
}

const isSameDeletedAt = (a, b) => {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  } else {
    return a === b;
  }
}

const create = (model, row) =>  {
  return function * () {
    let data    = null
      , message = `${model.name} unique constraint error`
      , status  = 409;

    try {
      data = 
        yield model.create(row)
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {

        let where        = e.fields
          , attributes   = model.attributes
          , deletedAtCol = model.options.deletedAt;

        if (!deletedAtCol) 
          this.throw(message, status);

        data = yield model.find({
          paranoid: false,
          where
        })

        let deletedAtVal = attributes[deletedAtCol].defaultValue;
        if (deletedAtVal === undefined) {
          deletedAtVal = null;
        }

        if (data && !isSameDeletedAt(data[deletedAtCol], deletedAtVal)) {
          row[deletedAtCol] = deletedAtVal instanceof Date ? deletedAtVal.getTime() : deletedAtVal;
          yield model.upsert(row);
          data = yield model.find({
            where
          })
        } else {
          this.throw(message, status);
        }
      } else {
        throw new Error(e);
      }
    }

    return data;
  }
}

const post = (model, association) => {
  return function * () {
    let body   = this.request.body = yield parse(this)
      , params = this.params
      , data   = null;

    let debugInfo = `post ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    if (body.hasOwnProperty('id')) {
      delete body.id;
    }

    if (!association) {
      data = yield create(model, body);
    } else {
      let id   = params.id
        , name = association.options.name.singular
        , add  = `add${capitalizeFirstLetter(name)}`;

      data = yield model.findOne({
        where: { id }
      });

      if (!data) {
        this.throw(`${model.name} ${id} is not found`, 404);
      }

      let associationData = yield create(association.target, body);
      yield data[add](associationData);

      data = associationData;
    }

    this.body   = data;
    this.status = 201;
  }
}

const put = (model, association) => {
  return function * () {
    let body    = this.request.body = yield parse(this)
      , params  = this.params
      , id      = params.id
      , include = association ? [association] : []
      , data    = null;

    let debugInfo = `put ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    data = yield model.findOne({
      where: { id },
      include
    })

    if (!data) {
      this.throw(`${model.name} ${id} is not found`, 404);
    }

    if (!association) {
      yield data.update(body);
    } else {
      let associationId = params.associationId;

      if (associationId) {
        /*
         * plural assocation
         */
        data = yield association.target.findOne({
          where: {
            id: associationId
          }
        });

        if (!data) {
          this.throw(`${model.name} ${id} association ${associationId} is not found`, 404);
        }

        delete body.id;
        yield data.update(body);
      } else {
        /*
         * singular association
         */
        let name   = association.options.name.singular
          , setter = `set${capitalizeFirstLetter(name)}`;

        let associationData = data[name];

        delete body.id;
        if (!associationData) {
          associationData = yield create(association.target, body);
          yield data[setter](associationData);
        } else {
          yield associationData.update(body);
        }
        data = associationData;
      }
    }

    this.body   = data;
    this.status = 200;
  }
}

const del = (model, association) => {
  return function * () {
    let params  = this.params
      , id      = params.id
      , include = association ? [association] : []
      , data    = null;

    let debugInfo = `delete ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    data = yield model.findOne({
      where: { id },
      include
    })

    if (!data) {
      this.throw(`${model.name} ${id} is not found`, 404);
    }

    if (!association) {
      yield data.destroy();
    } else {
      let associationId   = params.associationId
        , name            = association.options.name.singular
        , remove          = `remove${capitalizeFirstLetter(name)}`
        , associationData = null;

      if (associationId) {
        /*
         * plural assocation
         */
        associationData = yield association.target.findOne({
          where: {
            id: associationId
          }
        });

        if (!data) {
          this.throw(`${model.name} ${id} association ${associationId} is not found`, 404);
        }

        let associationType = association.associationType;
        if (associationType === 'HasMany') {
          yield association.target.destroy({
            where: {
              id: associationId
            }
          }) 
        } else {
          yield data[remove](associationData);
        }
      } else {
        /*
         * singular association
         */

        associationData = data[name];

        if (associationData) {
          yield associationData.destroy();
        }       
      }
    }

    this.data   = {};
    this.status = 204;
  }
}

const handlers = {
  get  : get, 
  post : post, 
  put  : put, 
  del  : del
}

module.exports.handlers = handlers;
