'use strict'

const co     = require('co');
const qs     = require('qs');
const parse  = require('co-body');
const debug  = require('debug')('koa-restql:middlewares');

const common = require('./common');

const parseQuery = (model, options) => {
  return function * (next) {

    this.restql = this.restql || {};

    const query  = this.restql.query;
    const method = this.request.method.toLowerCase();

    if (!query) {
      query = 
        qs.parse(this.request.querystring, { allowDots: true });
    }

    this.restql.parsedQuery = 
      common.parseQuery(query, model, method, options);

    yield* next;
  }
}

const parseParams = (model, paramName) => {
  return function * (next) {

    this.restql = this.restql || {};

    const id = this.params[paramName];

    let data;

    if (!id) {
      yield* next;
    } else {

      const data = 
        yield model.findOne({
          where : { id },
        })

      if (!data) {
        this.throw(`${model.name} ${id} is not found`, 404);
      }

      this.params.data = data;

      yield* next;
    }
  }
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

  const uniqueIndex = indexes.find(index => index.unique);
  
  if (!uniqueIndex)
    return;

  const fields = {};
  uniqueIndex.fields.forEach(field => {
    fields[field] = data[field];
  })

  return fields;
}

const _upsert = function * (model, data) {
    let uniqueIndexFields = 
      getInstanceValidUniqueIndexFields(model, data);

    if (!uniqueIndexFields) {
      this.throw('unique index fields required', 400);
    }

    let created = 
      yield model.upsert(data);

    data = 
      yield model.find({
        where: uniqueIndexFields
      })

    return { created, data };
  }

const _bulkUpsert = function * (model, data)  {
  let $or = [];
  data.forEach(row => {

    let uniqueIndexFields = 
      getInstanceValidUniqueIndexFields(model, row);

    if (!uniqueIndexFields) {
      this.throw('unique index fields required', 400);
    }

    $or.push(uniqueIndexFields);
  })

  /**
   * ignoreDuplicates only work in mysql
   */
  yield model.bulkCreate(data, {
    ignoreDuplicates: true
  });

  data = 
    yield model.findAll({
      where: { $or },
      order: [['id', 'ASC']]
    });

  return data;
}

const upsert = (model) => {
  return function * (next) {

    const body = this.request.body;

    let status = 200
      , data;

    if (Array.isArray(body)) {
      yield* next;
    } else {
      debug(body);
      const result  = 
        yield* _upsert.call(this, model, body);  

      const created = result.created;
      data = result.data;

      if (created)
        status = 201;

      this.response.body   = data;
      this.response.status = status;

      yield* next;
    }
  }
}

const bulkUpsert = (model) => {
  return function * (next) {
    
    const body = this.request.body || (yield parse(this));

    let status = 200
      , data;

    if (!Array.isArray(body)) {
      yield* next;
    } else {
      const data  = 
        yield* _bulkUpsert.call(this, model, body);  

      this.response.body   = data;
      this.response.status = status;

      yield* next;
    }
  }
}

const parseBody = () => {
  return function * (next) {
    const body = this.request.body || (yield parse(this));

    if (!this.request.body)
      this.request.body = body;

    yield* next;
  }
}


module.exports.upsert      = upsert;
module.exports.bulkUpsert  = bulkUpsert;
module.exports.parseBody   = parseBody;
module.exports.parseQuery  = parseQuery;
// findBy
module.exports.parseParams = parseParams;

const get = (method, model, association) => {
  return function * (next) {

    this.restql = this.restql || {};

    let params  = this.params
      , id      = params.id
      , query   = this.restql.query
      , data;

    let debugInfo = `get ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: 
        ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    if (!query) {
      query = qs.parse(this.request.querystring, { allowDots: true });
    }

    if (!association) {
      query = parseQuery(query, model, method);

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

      query = parseQuery(query, associationModel, method);

      if (!associationId) {
        let name     = getAssociationName(association)
          , isPlural = association.isMultiAssociation
          , getter   = `get${capitalizeFirstLetter(name)}`
          , counter  = `count${capitalizeFirstLetter(name)}`;

        data = yield model.findOne({
          where : { id }
        })

        if (!data) {
          this.throw(`${model.name} ${id} is not found`, 404);
        }

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
          this.throw(`${model.name} ${id} 
            association ${associationId} is not found`, 404);
        }
      }
    }

    this.body   = data;
    this.status = 200;

    yield next;
  }
}

const isSameDeletedAt = (a, b) => {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  } else {
    return a === b;
  }
}

const getUniqueConstraintErrorFields = (model, e) => {

  let indexes    = model.options.indexes
    , attributes = model.attributes
    , fields     = {}
    , uniqueIndex, fieldsIsValid;

  if (!e.fields)
    return;

  fieldsIsValid = Object.keys(e.fields).every(key => attributes[e.fields[key]]);

  if (fieldsIsValid) 
    return e.fields;

  let index = indexes.find(index => e.fields[index.name] && index.unique);

  if (index && Array.isArray(index.fields)) {
    let value = e.fields[index.name];

    switch (typeof value) {
      case 'number':
        value = [ value ];
      case 'string':
        value = value.split('-');
        break;
    }

    index.fields.forEach((field, index) => {
      fields[field] = value[index]
    })
  }

  return fields; 
}

const create = (model, row, options) => {
  return function * () {
    let id      = row.id
      , message = `${model.name} unique constraint error`
      , status  = 409
      , data;

    options = options || {}

    let {
      ignoreDuplicates = false
    } = options;

    try {

      if (id) {
        delete row.id;
      }

      data = 
        yield model.create(row, options);

    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {

        let where        = getUniqueConstraintErrorFields(model, e)
          , attributes   = model.attributes
          , deletedAtCol = model.options.deletedAt;

        if (!deletedAtCol) 
          this.throw(message, status);

        data = yield model.find({
          paranoid: false,
          where
        })

        if (!data) {
          this.throw('Sequelize goes wrong', 500);
        }

        let deletedAtVal = attributes[deletedAtCol].defaultValue;
        if (deletedAtVal === undefined) {
          deletedAtVal = null;
        }

        //const upsert = (row) => {
        //  return function * () {
        //    yield model.upsert(row);
        //    let data = yield model.find({ 
        //      where 
        //    });
        //    return data;
        //  }
        //}

        if (!isSameDeletedAt(data[deletedAtCol], deletedAtVal)) {
          yield data.restore();
          data = yield upsert(row);
        } else {
          if (!ignoreDuplicates) {
            this.throw(message, status);
          }
          data = yield upsert(row);
        }
      } else {
        throw new Error(e);
      }
    }

    return data;
  }
}

const post = (method, model, association) => {
  return function * (next) {

    this.restql = this.restql || {};

    let body   = this.request.body || (yield parse(this))
      , params = this.params
      , query  = this.restql.query
      , data;

    let debugInfo = `post ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: 
        ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    if (!query) {
      query = qs.parse(this.request.querystring, { allowDots: true });
    }

    const _create = (model) => {
      return function * () {
        query = parseQuery(query, model, method);
        if (Array.isArray(body)) {
          let promises = body.map(row => {
            let gen = create(model, row, {
              include          : query._include,
              ignoreDuplicates : query._ignoreDuplicates
            })
            return co(gen);
          })

          let data = yield promises;
          return data;
        } else {
          return yield create(model, body, { 
            include          : query._include,
            ignoreDuplicates : query._ignoreDuplicates
          });
        }
      }
    }

    if (!association) {
      data = yield _create(model);
    } else {
      let id     = params.id
        , name   = association.options.name.singular
        , add    = `add${capitalizeFirstLetter(name)}`;

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

    yield next;
  }
}

//const upsert = () => {
//  let ctx = this;
//  return function * (model, id, body, options) {
//    if (id !== undefined && Array.isArray(data)) {
//      ctx.throw('body should be an object', 400)
//    } 
//
//    let data;
//
//    if (Array.isArray(body)) {
//      let promises = body.map(row => {
//        let gen = create(model, row, {
//          ignoreDuplicates : true
//        })
//        return co(gen);
//      })
//
//      data = yield promises;
//    } else {
//      data = yield create(model, data, { 
//        ignoreDuplicates : true
//      });
//    }
//
//    return data;
//  }
//}


const put = (method, model, association) => {
  return function * (next) {
    let body    = this.request.body || (yield parse(this))
      , params  = this.params
      , id      = params.id
      , include = association ? [association] : []
      , data, status;

    let debugInfo = `put ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: 
        ${common.getAssociationName(association)}`;
    }

    debug(debugInfo);

    let _upsert = upsert.bind(this);

    this.body   = data;
    this.status = status || 200;

    yield next;
  }
}

const del = (method, model, association) => {
  return function * (next) {
    let params  = this.params
      , id      = params.id
      , include = association ? [association] : []
      , data    = null;

    let debugInfo = `delete ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: 
        ${common.getAssociationName(association)}`;
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
      yield model.destroy({
        where: { 
          id: data.id
        }
      });
    } else {
      let associationId    = params.associationId
        , name             = association.options.name.singular
        , remove           = `remove${capitalizeFirstLetter(name)}`
        , associationModel = association.target
        , associationData  = null;

      if (associationId) {
        /*
         * plural assocation
         */
        associationData = yield associationModel.findOne({
          where: {
            id: associationId
          }
        });

        if (!data) {
          this.throw(`${model.name} ${id} 
              association ${associationId} is not found`, 404);
        }

        let associationType = association.associationType;
        if (associationType === 'HasMany') {
          yield associationModel.destroy({
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
          yield associationModel.destroy({
            where: {
              id: associationData.id
            }
          });
        }       
      }
    }

    this.data   = {};
    this.status = 204;

    yield next;
  }
}

module.exports.handlers = {
  get, post, put, del
};
