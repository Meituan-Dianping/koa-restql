'use strict'

const co     = require('co')
const qs     = require('qs')
const parse  = require('co-body')
const debug  = require('debug')('koa-restql:middlewares')

const common = require('./common')

const switchByType = common.switchByType

function _getIndexes (model) {

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
    idxes.push({
      unique : true,
      name   : uniqueKey.name,
      fields : uniqueKey.fields
    })
  })

  return idxes

}

function _getUniqueIndexes (model) {
  
  return _getIndexes(model).filter(index => index.unique)

}

function _getInstanceValidIndexes (indexes, data) {

  if (!data)
    return []

  return indexes.filter(index => 
    index.fields.every(field => data[field] !== undefined))

}

function _getInstanceValidIndexFields (indexes, data) {

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

function * _upsert (model, data) {

  const uniqueIndexes = _getUniqueIndexes(model)

  const where = _getInstanceValidIndexFields(uniqueIndexes, data)

  if (!where) {
    this.throw('RestQL: unique index fields cannot be found', 400)
  }

  let created

  try {

    created = 
      yield model.upsert(data)

  } catch (error) {

    if (error.name !== 'SequelizeUniqueConstraintError') {
      throw new Error(error)
    }
    
    const message = `RestQL: ${model.name} unique constraint error`
    this.throw(message, 409)

  }

  data = 
    yield model.find({ 
      where,
      paranoid: false
    }) 

  yield data.restore()

  return { created, data }

}

function * _bulkUpsert (model, data)  {

  if (!data.length)
    return []

  /**
   * updateOnDuplicate fields should be consistent
   */
  let isValid = true
    
  if (data.length) {
    let match = JSON.stringify(Object.keys(data[0]).sort())
    isValid = data.map(row => 
      JSON.stringify(Object.keys(row).sort())).every(item => item === match)
  }

  if (!isValid) {
    this.throw('RestQL: array elements have different attributes', 400)
  }

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

  try {

    let updatedFields = Object.keys(data[0]).filter(key => 
      ['id'].indexOf(key) === -1)

    yield model.bulkCreate(data, {
      updateOnDuplicate: updatedFields
    })

  } catch (error) {

    if (error.name !== 'SequelizeUniqueConstraintError') {
      throw new Error(error)
    }
    
    const message = `RestQL: ${model.name} unique constraint error`
    this.throw(message, 409)

  }

  data = 
    yield model.findAll({
      where: { $or },
      order: [['id', 'ASC']]
    })

  return data

}

function _getUniqueConstraintErrorFields (model, error) {

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

function * _handleUniqueConstraintError (model, error, options) {

  const message = `RestQL: ${model.name} unique constraint error`
  const status  = 409

  const fields           = _getUniqueConstraintErrorFields(model, error)
  const attributes       = model.attributes
  const paranoid         = model.options.paranoid
  const deletedAtCol     = model.options.deletedAt
  const ignoreDuplicates = options.ignoreDuplicates

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

  function isSameDeletedAt (a, b) {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    } else {
      return a === b
    }
  }

  if (!ignoreDuplicates && isSameDeletedAt(row[deletedAtCol], deletedAtVal)) {
    this.throw(message, status)
  }

  for (let key in attributes) {
    let defaultValue = attributes[key].defaultValue
    if (defaultValue !== undefined) {
      row.setDataValue(key, defaultValue)
    }
  }

  return { row, fields }

}

function * _create (model, data, options) {

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
      yield* _handleUniqueConstraintError.call(this, model, error, options)

    const { 
      row, fields 
    } = conflict

    data = 
      yield* _update.call(this, model, 
        Object.assign({}, row.dataValues, data), { where: fields })

    data = data[0]

    return data

  }

}

function * _bulkCreate (model, data, options)  {

  const $or           = []
  const conflicts     = []
  const uniqueIndexes = _getUniqueIndexes(model)

  data = data.slice()

  data.forEach(row => {

    const where = _getInstanceValidIndexFields(uniqueIndexes, row)

    if (!where) {
      this.throw('RestQL: unique index fields cannot be found', 400)
    }

    $or.push(where)
  })

  while (true) {

    try {

      yield model.bulkCreate(data, options)
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
        Object.keys(fields).every(key => fields[key] == row[key])) 

      if (index !== -1) {
        conflict.row = Object.assign({}, row.dataValues, data[index])
        conflicts.push(conflict)
        data.splice(index, 1)
      } else {
        this.throw('RestQL: bulkCreate unique index field error', 500)
      } 

    }

  }

  if (conflicts.length) {
    const rows = conflicts.map(conflicts => conflicts.row)

    try {

      yield model.bulkCreate(rows, {
        updateOnDuplicate: Object.keys(model.attributes)
      })

    } catch (error) {

      if (error.name !== 'SequelizeUniqueConstraintError') {
        throw new Error(error)
      }

      const message = `RestQL: ${model.name} unique constraint error`
      this.throw(message, 409)

    }
  }

  data = 
    yield model.findAll({
      where: { $or },
      order: [['id', 'ASC']]
    })

  return data

}

function * _update (model, data, options) {

  try {

    if (data.id) {
      delete data.id
    }

    data = 
      yield model.update(data, options)

    data =
      yield model.findAll(options)

    return data

  } catch (error) {

    if (error.name !== 'SequelizeUniqueConstraintError') {
      throw new Error(error)
    }

    const conflict = 
      yield* _handleUniqueConstraintError.call(this, model, error)

    const { row } = conflict

    /**
     * @FIXME
     * restql should delete the conflict with paranoid = false 
     * and update again, now return 409 directly 
     * for conflict happens rarely
     */
    const message = `RestQL: ${model.name} unique constraint error`
    this.throw(message, 409)

  }

}

function * _findExistingRows (model, data) {

  const $or = [] 
  const uniqueIndexes = _getUniqueIndexes(model)

  function getOr (uniqueIndexes, data) {
    
    let fields = _getInstanceValidIndexFields(uniqueIndexes, data)
      , row    = data

    return  { fields, row }
    
  }

  common.switchByType(data, {
    object : (data) => $or.push(getOr(uniqueIndexes, data)),
    array  : (data) => data.forEach(row => $or.push(getOr(uniqueIndexes, row)))
  })

  data = 
    yield model.findAll({
      where: { $or : $or.map(or => or.fields) }
    })

  let existingRows  = []
  let newRows       = []

  if (data.length === $or.length) {

    existingRows = data

  } else {

    /*
     * find existing rows
     */
    $or.forEach(or => {

      let index = data.findIndex(row => 
        Object.keys(or.fields).every(key => row[key] === or.row[key]))

      if (index !== -1) {
        existingRows.push(data[index])
        data.splice(index, 1)
      } else {
        newRows.push(or.row)
      }

    }) 

  }

  return { existingRows, newRows }

}

function before () {
  return function * (next) {

    debug(`RestQL: ${this.request.method} ${this.url}`)

    this.restql          = this.restql || {}
    this.restql.params   = this.restql.params   || {}
    this.restql.request  = this.restql.request  || {}
    this.restql.response = this.restql.response || {}

    yield* next

  }
}

function after () {
  return function * (next) {

    const {
      response
    } = this.restql

    this.response.status = response.status || 200
    this.response.body   = response.body

    const headers = response.headers || {}

    for (let key in headers) {
      this.response.set(key, response.headers[key])
    }

    debug(`RestQL: Succeed and Goodbye`)

    yield* next

  }
}

function parseQuery (model, options) {
  return function * (next) {

    const {
      method, querystring
    } = this.request

    const query = this.restql.query || qs.parse(querystring, options.qs || {})

    this.restql.query = 
      common.parseQuery(query, model, method.toLowerCase(), options)

    yield* next

  }
}

function findById (model, query) {
  return function * (next) {

    const q = query || this.restql.query || {}

    const id = this.params.id

    if (!id) {
      return yield* next
    } 

    const data = 
      yield model.findById(id, {
        attributes : q.attributes,
        include    : q.include
      })

    if (!data) {
      this.throw(`RestQL: ${model.name} ${id} cannot be found`, 404)
    }

    this.restql.params.id = data
    this.restql.response.body = data

    yield* next
  }
}

function findOne (model, query) {
  return function * (next) {

    const {
      request, response
    } = this.restql

    const q = query || this.restql.query || {}

    const data = 
      yield model.findOne({
        attributes : q.attributes,
        include    : q.include,
        where      : q.where,
      })

    if (!data) {
      this.throw(`RestQL: ${model.name} cannot be found`, 404)
    }

    response.body = data

    yield* next

  }
}

function pagination (model) {
  return function * (next) {

    const {
      response, params, query
    } = this.restql

    const {
      count, rows
    } = response.body

    const {
      offset, limit
    } = query

    let status = 200

    const _count = switchByType(count, {
      'number' : (value) => value,
      // use group
      'array'  : (value) => value.length
    })

    const xRangeHeader = `objects ${offset}-${offset + rows.length}/${_count}`

    if (_count > limit)
      status = 206

    response.headers = response.headers || {}
    response.headers['X-Range'] = xRangeHeader
    response.body   = rows
    response.status = status

    yield* next

  }
}

function upsert (model) {
  return function * (next) {

    const {
      request, response
    } = this.restql

    let status = 200

    if (Array.isArray(request.body)) {
      return yield* next
    } 
    
    const result  = 
      yield* _upsert.call(this, model, request.body) 

    const created = result.created
    const data    = result.data

    if (created)
      status = 201

    response.body   = data
    response.status = status

    yield* next

  }
}

function findOrUpsert (model) {
  return function * (next) {

    const {
      request, response
    } = this.restql

    let status = 200

    if (Array.isArray(request.body)) {
      return yield* next
    } 

    const {
      existingRows, newRows
    } = yield* _findExistingRows.call(this, model, [ request.body ])

    let data

    if (newRows.length){
      status = 201
      let ret = 
        yield* _upsert.call(this, model, newRows[0])

      if (ret.created)
        status = 201

      data = ret.data
    } else {
      data = existingRows[0]
    }
    
    response.body   = data
    response.status = status

    yield* next

  }
}


function bulkUpsert (model) {
  return function * (next) {

    const {
      request, response
    } = this.restql
    
    const body   = request.body
    const status = 200

    if (!Array.isArray(body)) {
      return yield* next
    }

    const data = 
      yield* _bulkUpsert.call(this, model, body)  

    response.body   = data
    response.status = status

    yield* next
    
  }
}

function bulkFindOrUpsert (model) {
  return function * (next) {

    const {
      request, response
    } = this.restql

    const status = 200

    if (!Array.isArray(request.body)) {
      return yield* next
    }

    const {
      existingRows, newRows
    } = yield* _findExistingRows.call(this, model, request.body)

    let data = []

    if (newRows.length){
      data = 
        yield* _bulkUpsert.call(this, model, newRows)
    }    

    data.forEach(row => existingRows.push(row))

    response.body   = existingRows
    response.status = status

    yield* next

  }
}

function create (model) {
  return function * (next) {

    const {
      request, response, query
    } = this.restql

    const body   = request.body
    const status = 201

    if (Array.isArray(body)) {
      return yield* next
    } 

    const include = []
    const associations    = model.associations
    const associationList = Object.keys(associations)

    for (let key in body) {
      
      let value = body[key]
      if ('object' === typeof value) {
        if (associationList.indexOf(key) !== -1) {
          include.push(associations[key])    
        }
      }

    }
    
    const data = 
      yield* _create.call(this, model, body, {
        ignoreDuplicates: query.ignoreDuplicates,
        include
      })

    response.body   = data
    response.status = status

    return yield* next

  }
}

function bulkCreate (model) {
  return function * (next) {
    
    const {
      request, response
    } = this.restql

    const body   = request.body
    const status = 201

    if (!Array.isArray(body)) {
      return yield* next 
    }

    const data = 
      yield* _bulkCreate.call(this, model, body)

    response.body   = data
    response.status = status

    yield* next
  }
}

function parseRequestBody (allowedTypes) {
  return function * (next) {

    const body = this.request.body 
      || this.restql.request.body 
      || (yield parse(this))

    this.restql.request.body = this.request.body = body

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

function destroy (model) {
  return function * (next) {
    
    const query  = this.restql.query || {}
    const where  = query.where || {}
    const status = 204

    yield model.destroy({
      where
    })

    this.restql.response.status = status
    yield* next

  }
}

module.exports.before           = before
module.exports.after            = after
module.exports.pagination       = pagination
module.exports.parseRequestBody = parseRequestBody
module.exports.parseQuery       = parseQuery
module.exports.upsert           = upsert
module.exports.bulkUpsert       = bulkUpsert
module.exports.findOrUpsert     = findOrUpsert
module.exports.bulkFindOrUpsert = bulkFindOrUpsert
module.exports.create           = create
module.exports.bulkCreate       = bulkCreate
module.exports.destroy          = destroy
module.exports.findOne          = findOne
module.exports.findById         = findById
