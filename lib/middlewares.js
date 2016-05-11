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
          include    : query._include || []
        })
      } else {
        data = yield model.findOne({
          attributes : query._attributes,
          where      : { id },
          include    : query._include || []
        })

        if (!data) {
          this.throw(`${model.name} ${id} is not found`, 404);
        }
      }
    } else {
      let associationId    = params.associationId
        , associationModel = association.target
        , name             = getAssociationName(association)
        , order;

      query = parseQuerystring(qs, associationModel);
      
      if (query._order) {
        order = query._order.map(item => {
          item.splice(0, 0, {
            model : associationModel,
            as    : association.as
          })
          return item;
        })
      }

      if (!associationId) {
        let include = [{
          association,
          attributes : query._attributes,
          where      : query._where,
          through    : query._through,
          include    : query._include || []
        }];

        data = yield model.findOne({
          where : { id },
          order, include
        })

        data = data[name];
      } else {
        data = yield associationModel.findOne({
          attributes : query._attributes,
          where      : { id: associationId },
          include    : query._include || []
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

    if (!association) {
      data = yield model.create(body);
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

      let associationData = null; 
      try {
        associationData = yield association.target.create(body)
      } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
          let msg = `association ${common.getAssociationName(association)} unique constraint error`
            , err = new Error(msg);

          err.status = 409;
          throw err;
        }
      }

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

        if (!associationData) {
          associationData = yield association.target.create(body);
          yield data[setter](associationData);
        } else {
          delete body.id;
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
    this.status = 200;
  }
}

const handlers = {
  get, post, put, del 
}

module.exports.handlers = handlers;
