'use strict'

const co     = require('co')
const qs     = require('qs')
const parse  = require('co-body')
const debug  = require('debug')('koa-restql:middlewares')

const common = require('./common')

const parseQuery = (model, options) => {
  return function * (next) {

    this.restql = this.restql || {}

    const {
      method, querystring
    } = this.request;

    const query  = this.restql.query || qs.parse(querystring, { 
      allowDots : true 
    })

    this.restql.parsedQuery = 
      common.parseQuery(query, model, method.toLowerCase(), options)

    yield* next
  }
}

const _findByParams = paramName => model => {
  return function * (next) {

    this.restql = this.restql || {}

    const id    = this.params[paramName]
    const query = this.restql.parsedQuery || {}

    if (!id) {
      return yield* next
    } 

    const data = 
      yield model.findOne({
        attributes : query.attributes,
        include    : query.include,
        where      : { id },
      })

    if (!data) {
      this.throw(`RestQL: ${model.name} ${id} cannot be found`, 404);
    }

    this.response.body = data;

    yield* next;
  }
}

const _getIndexes = (model) => {

  const {
    primaryKeys, options: { indexes, uniqueKeys }
  } = model

  const idxes = []

  if (primaryKeys) {
    const keys = Object.keys(primaryKeys)
    if (keys.length) {
      idxes.push({
        name    : 'PRIMARY',
        unique  : true,
        primary : true,
        fields  : keys
      })
    }
  }

  indexes.forEach(index => {
    idxes.push({
      unique : index.unique,
      name   : index.name,
      fields : index.fields
    })
  })

  Object.keys(uniqueKeys).forEach(key => {
    let uniqueKey = uniqueKeys[key]
    idex.push({
      unique : true,
      name   : uniqueKey.name,
      fields : uniqueKey.fields
    })
  })

  return idxes

}

const _getUniqueIndexes = (model) => {
  
  return _getIndexes(model).filter(index => index.unique)

}

const _getInstanceValidIndexes = (indexes, data) => {

  if (!data)
    return []

  return indexes.filter(index => 
    index.fields.every(field => data[field] !== undefined))

}

const _getInstanceValidIndexFields = (indexes, data) => {

  if (!data || !indexes)
    return
 
  const validIndexes = _getInstanceValidIndexes(indexes, data)

  if (!validIndexes.length) 
    return

  const index = validIndexes[0]

  const fields = {}
  index.fields.forEach(field => {
    fields[field] = data[field]
  })

  return fields

}

const _upsert = function * (model, data) {

  const uniqueIndexes = _getUniqueIndexes(model)
  const where = _getInstanceValidIndexFields(uniqueIndexes, data)

  if (!where) {
    this.throw('RestQL: unique index fields cannot be found', 400)
  }

  let created = 
    yield model.upsert(data)

  data = 
    yield model.find({ where }) 

  return { created, data }

}

const _bulkUpsert = function * (model, data)  {

  const $or = []
  const uniqueIndexes = _getUniqueIndexes(model)

  data.forEach(row => {

    const where = _getInstanceValidIndexFields(uniqueIndexes, row)

    if (!where) {
      this.throw('RestQL: unique index fields cannot be found', 400)
    }

    $or.push(where)
  })

  /**
   * ignoreDuplicates only work in mysql
   */
  yield model.bulkCreate(data, {
    updateOnDuplicate: Object.keys(model.attributes)
  })

  data = 
    yield model.findAll({
      where: { $or },
      order: [['id', 'ASC']]
    })

  return data

}

const upsert = (model) => {
  return function * (next) {

    const body = this.request.body;

    let status = 200
      , data;

    if (Array.isArray(body)) {
      return yield* next;
    } 
    
    const result  = 
      yield* _upsert.call(this, model, body);  

    const created = result.created;
    data = result.data;

    if (created)
      status = 201;

    this.response.body   = data;
    this.response.status = status;

    return yield* next;

  }
}

const bulkUpsert = (model) => {
  return function * (next) {
    
    const body   = this.request.body || (yield parse(this));
    const status = 200;

    if (!Array.isArray(body)) {
      return yield* next;
    }

    const data = 
      yield* _bulkUpsert.call(this, model, body);  

    this.response.body   = data;
    this.response.status = status;

    yield* next;
    
  }
}

const getUniqueConstraintErrorFields = (model, error) => {

  const attributes  = model.attributes
  const fields      = error.fields

  if (!fields)
    return

  let fieldsIsValid = Object.keys(fields).every(key => attributes[key])

  if (fieldsIsValid) 
    return fields

  const uniqueIndexes = _getUniqueIndexes(model)
  const uniqueIndex   = uniqueIndexes.find(index => fields[index.name])

  if (uniqueIndex && Array.isArray(uniqueIndex.fields)) {
    let value = fields[uniqueIndex.name]

    value = common.switchByType(value, {
      'number' : value => [ value ],
      'string' : value => value.split('-')
    })

    if (!value || !value.length)
      return

    const ret = {}
    uniqueIndex.fields.forEach((field, index) => {
      ret[field] = value[index]
    })

    return ret
  }
}

const _handleUniqueConstraintError = function * (model, error) {

  const message = `RestQL: ${model.name} unique constraint error`
  const status  = 409

  const fields       = getUniqueConstraintErrorFields(model, error)
  const attributes   = model.attributes
  const paranoid     = model.options.paranoid
  const deletedAtCol = model.options.deletedAt

  if (!deletedAtCol || !paranoid) 
    this.throw(message, status)

  let row = 
    yield model.find({
      paranoid: false,
      where: fields
    })

  if (!fields || !row) {
    this.throw('RestQL: Sequelize goes wrong', 500)
  }

  let deletedAtVal = attributes[deletedAtCol].defaultValue
  if (deletedAtVal === undefined) {
    deletedAtVal = null
  }

  const isSameDeletedAt = (a, b) => {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    } else {
      return a === b
    }
  }

  if (isSameDeletedAt(row[deletedAtCol], deletedAtVal)) {
    this.throw(message, status)
  }

  row.setDataValue(deletedAtCol, deletedAtVal)
  return { row, fields }

}

const _create = function * (model, data, options) {

  const id = data.id

  try {

    if (id) {
      delete data.id
    }

    data = 
      yield model.create(data, options)

    return data

  } catch (error) {

    if (error.name !== 'SequelizeUniqueConstraintError') {
      throw new Error(error)
    }

    const conflict = 
      yield* _handleUniqueConstraintError.call(this, model, error)

    const { row } = conflict
    yield row.update(Object.assign({}, row.dataValues, data))

    return row

  }

}

const _bulkCreate = function * (model, data)  {

  const $or       = []
  const conflicts = []
  const uniqueIndexes = _getUniqueIndexes(model)

  data.forEach(row => {

    const where = _getInstanceValidIndexFields(uniqueIndexes, row)

    if (!where) {
      this.throw('RestQL: unique index fields cannot be found', 400)
    }

    $or.push(where)
  })

  while (true) {

    try {

      if (!data.length)
        break

      yield model.bulkCreate(data)
      break

    } catch (error) {

      if (error.name !== 'SequelizeUniqueConstraintError') {
        throw new Error(error)
      }

      const conflict = 
        yield* _handleUniqueConstraintError.call(this, model, error)

      const {
        row, fields
      } = conflict

      const index = data.findIndex(row => 
        Object.keys(fields).every(key => fields[key] === row[key])) 

      if (index !== -1) {
        conflict.row = Object.assign({}, row.dataValues, data[index])
        conflicts.push(conflict)
        data.splice(index, 1)
      }

    }

  }

  if (conflicts.length) {
    const rows = conflicts.map(conflicts => conflicts.row)
    yield model.bulkCreate(rows, {
      updateOnDuplicate: Object.keys(model.attributes)
    })
  }

  data = 
    yield model.findAll({
      where: { $or },
      order: [['id', 'ASC']]
    })

  return data

}

const create = (model) => {
  return function * (next) {

    const body   = this.request.body
    const status = 201

    if (Array.isArray(body)) {
      return yield* next
    } 
    
    const data = 
      yield* _create.call(this, model, body)

    this.response.body   = data
    this.response.status = status

    return yield* next

  }
}

const bulkCreate = (model) => {
  return function * (next) {
    
    const body   = this.request.body || (yield parse(this))
    const status = 201

    if (!Array.isArray(body)) {
      return yield* next 
    }

    const data = 
      yield* _bulkCreate.call(this, model, body)

    this.response.body   = data
    this.response.status = status

    yield* next
  }
}

const parseRequestBody = (allowedTypes) => {
  return function * (next) {
    const body = this.request.body || (yield parse(this))

    if (!this.request.body)
      this.request.body = body

    if (!allowedTypes) {
      return yield* next
    } 

    const validators = {}
    allowedTypes.forEach(type => {
      validators[type] = true
    })

    validators.defaults = () => {
      this.throw(`RestQL: ${allowedTypes.join()} body are supported`, 400)
    }

    common.switchByType(body, validators)
    yield* next
  }
}

const destroy = (model) => {
  return function * (next) {
    
    const query  = this.restql.parsedQuery || {}
    const where  = query.where || {}
    const status = 204

    debug(where);
    if (Object.keys(where).length) {
      yield model.destroy({
        where
      })
    }

    this.response.status = status
    yield* next

  }
}

module.exports.parseRequestBody    = parseRequestBody
module.exports.parseQuery          = parseQuery
module.exports.upsert              = upsert
module.exports.bulkUpsert          = bulkUpsert
module.exports.create              = create
module.exports.bulkCreate          = bulkCreate
module.exports.destroy             = destroy
module.exports.findById            = _findByParams('id')
module.exports.findByAssociationId = _findByParams('associationId')

// findBy

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

    const _create = (model, ignoreDuplicates) => {
      return function * () {
        query = parseQuery(query, model, method);
        if (Array.isArray(body)) {
          let promises = body.map(row => {
            let gen = create(model, row, {
              include          : query._include,
              ignoreDuplicates : ignoreDuplicates || query._ignoreDuplicates
            })
            return co(gen);
          })

          let data = yield promises;
          return data;
        } else {
          return yield create(model, body, { 
            include          : query._include,
            ignoreDuplicates : ignoreDuplicates || query._ignoreDuplicates
          });
        }
      }
    }

    if (!association) {
      data = yield _create(model);
    } else {
      let id = params.id;
      
      let isBelongsToMany = 
        association.associationType === 'BelongsToMany';

      data = yield model.findOne({
        where: { id }
      });

      if (!data) {
        this.throw(`${model.name} ${id} is not found`, 404);
      }

      let associationData = 
        yield _create(association.target, isBelongsToMany);

      let options = association.options
        , name;

      if (Array.isArray(associationData)) {
        name = options.name.plural;
      } else {
        name = options.name.singular;
      }

      let add = `add${capitalizeFirstLetter(name)}`;
      yield data[add](associationData);

      if (isBelongsToMany) {
        data = associationData;
      } else {
        if (Array.isArray(associationData)) {
          let ids = associationData.map(value => value.id);
          data = 
            yield association.target.findAll({
              where: { id: ids }
            })
        } else {
          data =
            yield association.target.find({
              where: { id: associationData.id }
            })
        }
      }
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
