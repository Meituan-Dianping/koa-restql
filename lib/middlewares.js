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
        data = yield model.findAndCount({
          attributes : query._attributes,
          where      : query._where,
          order      : query._order,
          include    : query._include,
          limit      : query._limit,
          offset     : query._offset
        })

        this.response.set('X-Range', 
          `objects ${query._offset}-${query._offset + data.rows.length}/${data.count}`);
        data = data.rows;
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
        let name     = getAssociationName(association)
          , isPlural = association.isMultiAssociation
          , getter   = `get${capitalizeFirstLetter(name)}`
          , counter  = `count${capitalizeFirstLetter(name)}`;

        data = yield model.findOne({
          where : { id }
        })

        let promises = [];

        promises.push(data[getter]({
          attributes : query._attributes,
          where      : query._where,
          order      : query._order,
          include    : query._include,
          through    : query._through,
          limit      : query._limit,
          offset     : query._offset
        }));

        if (isPlural) {
          promises.push(data[counter]({ 
            where: query._where 
          }))
        }

        data = yield promises;

        if (isPlural) {
          this.response.set('X-Range', 
            `objects ${query._offset}-${query._offset + data[0].length}/${data[1]}`);
        }

        data = data[0];
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

const create = (model, row, options) =>  {
  return function * () {
    let data    = null
      , message = `${model.name} unique constraint error`
      , status  = 409;

    options = options || {}

    try {
      data = 
        yield model.create(row, options)
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
          yield data.restore();
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
    let body   = this.request.body || (yield parse(this))
      , params = this.params
      , qs     = this.request.querystring
      , data;

    let debugInfo = `post ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    let _create = (model) => {
      return function * () {
        let query = parseQuerystring(qs, model);
        return yield create(model, body, { 
          include: query._include
        });
      }
    }

    if (body.hasOwnProperty('id')) {
      delete body.id;
    }

    if (!association) {
      data = yield _create(model);
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

      let associationData = yield _create(association.target);
      yield data[add](associationData);

      data = yield association.target.findById(associationData.id);
    }

    this.body   = data;
    this.status = 201;
  }
}

const put = (model, association) => {
  return function * () {
    let body   = this.request.body || (yield parse(this))
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
