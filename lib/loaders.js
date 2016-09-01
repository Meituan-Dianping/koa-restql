'use strict'

const co          = require('co')
const parse       = require('co-body')

const debug       = require('debug')('koa-restql:loaders')
const middlewares = require('./middlewares')
const methods     = require('./methods')
const common      = require('./common')

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

const {
  switchByType
} = common

const loaders = {}
loaders.model = {}
loaders.model.association = {}
loaders.model.association.singular             = {}
loaders.model.association.singular.hasOne      = {}
loaders.model.association.singular.belongsTo   = {}
loaders.model.association.plural               = {}
loaders.model.association.plural.hasMany       = {}
loaders.model.association.plural.belongsToMany = {}

/**
 * load GET /user and GET /user/:id
 */
loaders.model.get = (router, base, model, options) => {

  router.get(base, 
    middlewares.before(),
    middlewares.parseQuery(model, options),
    function * (next) {

      const {
        request, response, query
      } = this.restql
      
      response.body = 
        yield model.findAndCount(query)

      yield* next

    },
    middlewares.pagination(model),
    middlewares.after())

  router.get(`${base}/:id`, 
    middlewares.before(),
    middlewares.parseQuery(model, options),
    function * (next) {

      const {
        response, query
      } = this.restql

      const id = +this.params.id

      response.body = 
        yield model.findById(id, query)

      yield* next

    },
    middlewares.after())

}

/**
 * load POST /user
 */
loaders.model.post = (router, base, model, options) => {

  router.post(base, 
    middlewares.before(),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.parseQuery(model, options),
    middlewares.create(model),
    middlewares.bulkCreate(model),
    middlewares.after())

}

/**
 * load PUT /user and PUT /user/:id
 */
loaders.model.put = (router, base, model, options) => {

  router.put(base, 
    middlewares.before(),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.upsert(model),
    middlewares.bulkUpsert(model),
    middlewares.after())

  router.put(`${base}/:id`, 
    middlewares.before(),
    middlewares.findById(model),
    middlewares.parseRequestBody(['object']),
    function * (next) {

      const {
        request
      } = this.restql

      request.body.id = +this.params.id

      yield* next

    }, 
    middlewares.upsert(model),
    middlewares.after())

}

/**
 * load DELETE /user and DELETE /user/:id
 */
loaders.model.del = (router, base, model, options) => {

  router.del(base, 
    middlewares.before(),
    middlewares.parseQuery(model, options),
    middlewares.destroy(model),
    middlewares.after())

  router.del(`${base}/:id`,
    middlewares.before(),
    middlewares.findById(model),
    function * (next) {
      
      const {
        response
      } = this.restql

      const id = this.params.id
      yield model.destroy({
        where: { id }
      })

      response.status = 204 

      yield* next

    },
    middlewares.after())

}

/**
 * load GET /gameofthrones/house/:id/seat or GET /gameofthrones/seat/:id/house
 */
loaders.model.association.singular.get = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  const {
    singular
  } = association.options.name

  const get = `get${capitalizeFirstLetter(singular)}`

  router.get(base,
    middlewares.before(),
    middlewares.parseQuery(association.target, options),
    middlewares.findById(model),
    function * (next) {

      const {
        response, query
      } = this.restql

      const {
        body
      } = response

      const data = 
        yield body[get](query)

      if (!data)
        this.throw(`RestQL: ${as} not found`, 404)

      response.body = data

      yield* next

    },
    middlewares.after())

}

/**
 * load PUT /gameofthrones/house/:id/seat
 */
loaders.model.association.singular.hasOne.put = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  const query = {
    include: [ association ]
  }

  router.put(base,
    middlewares.before(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model, query),
    function * (next) {

      const {
        request, response
      } = this.restql

      const {
        body
      } = response

      const data = Object.assign({}, 
        body[as] && body[as].dataValues, 
        request.body)

      data[foreignKey] = +this.params.id

      request.body = data
      yield* next

    },
    middlewares.upsert(association.target),
    middlewares.after())

}

/**
 * load PUT /gameofthrones/seat/:id/house
 */
loaders.model.association.singular.belongsTo.put = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  const query = {
    include: [ association ]
  }

  router.put(base,
    middlewares.before(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model, query),
    function * (next) {

      const {
        request, response, params
      } = this.restql

      const {
        body
      } = response

      params.data = body

      const data = Object.assign({}, 
        body[as] && body[as].dataValues,
        request.body)

      request.body = data
      yield* next

    },
    middlewares.upsert(association.target), 
    function * (next) {

      const {
        request, response, params
      } = this.restql
      
      const data  = response.body
      const value = {} 

      value[foreignKey] = data.id
      yield params.data.update(value) 

      yield* next
    },
    middlewares.after())

}

/**
 * load DELETE /house/:id/seat or DELETE /seat/:id/house
 */
loaders.model.association.singular.del = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  const query = {
    include: [ association ]
  }

  router.del(base, 
    middlewares.before(),
    middlewares.findById(model, query),
    function * (next) {

      const {
        request, response
      } = this.restql

      const {
        body
      } = response

      if (!body[as]) 
        this.throw('RestQL: ${model.name} ${as} not found', 404)

      yield body[as].destroy()

      response.status = 204

      yield* next

    },
    middlewares.after())
}

/**
 * load GET /user/:id/tags and GET /user/:id/tags/:associationId
 */
loaders.model.association.plural.get = (router, base, model, association, options) => {

  const {
    foreignKey, as, target
  } = association

  const {
    plural
  } = association.options.name

  const sequelize = target.sequelize

  const get   = `get${capitalizeFirstLetter(plural)}`
  const count = `count${capitalizeFirstLetter(plural)}`

  router.get(base, 
    middlewares.before(),
    middlewares.parseQuery(association.target, options),
    middlewares.findById(model),
    function * (next) {

      const {
        response, params, query
      } = this.restql

      const {
        attributes
      } = query

      const {
        body
      } = response

      const promises = {}

      const countAttributes = ['id', [
        sequelize.fn('COUNT', `${target.name}.id`), 'count'
      ]]

      const countQuery = Object.assign({}, query, { 
        attributes: countAttributes,
        offset : null,
        limit  : null
      })

      promises.count = body[get](countQuery).then(res => {
        return switchByType(countQuery.group, {
          'array': (value) => res.length,
          'defaults': (value) => res.length ? res[0].dataValues.count : 0
        })    
      })
      promises.rows  = body[get](query)

      response.body = yield promises

      yield* next

    },
    middlewares.pagination(association.target),
    middlewares.after())

  router.get(`${base}/:associationId`, 
    middlewares.before(),
    middlewares.parseQuery(association.target, options),
    middlewares.findById(model),
    function * (next) {

      const {
        response, params, query
      } = this.restql

      const {
        body
      } = response

      query.where    = query.where || {}
      query.where.id = +this.params.associationId

      const data = yield body[get](query)

      if (!data.length)
        this.throw('RestQL: ${model.name} not found', 404)

      this.restql.response.body = data[0]

      yield* next

    },
    middlewares.after())

}

/**
 * load POST /user/:id/tags
 */
loaders.model.association.plural.hasMany.post = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  router.post(base, 
    middlewares.before(),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.parseQuery(model, options),
    middlewares.findById(model),
    function * (next) {

      const {
        request, response, params
      } = this.restql
      
      const body = response.body

      common.switchByType(this.request.body, {
        object: (data) => {
          data[foreignKey] = body.id
        },
        array: (data) => {
          data.forEach(row => row[foreignKey] = body.id)
        }
      }) 

      yield* next

    },
    middlewares.create(association.target),
    middlewares.bulkCreate(association.target),
    middlewares.after())

}

/**
 * load POST /user/:id/characters
 */
loaders.model.association.plural.belongsToMany.post = (router, base, model, association, options) => {

  const {
    foreignKey, otherKey, as, through
  } = association

  const {
    plural
  } = association.options.name

  const get = `get${capitalizeFirstLetter(plural)}`

  router.post(base, 
    middlewares.before(),
    middlewares.findById(model),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.parseQuery(model, options),
    middlewares.findOrUpsert(association.target),
    middlewares.bulkFindOrUpsert(association.target),
    function * (next) {

      const {
        request, response, params
      } = this.restql

      const data = response.body

      const getRequestRow = (foreignId, otherId) => {
        let ret = {}
        ret[foreignKey] = foreignId
        ret[otherKey]   = otherId
        return ret
      }

      const foreignId = +this.params.id
      request.body = switchByType(data, {
        object : (data) => getRequestRow(foreignId, data.id),
        array  : (data) => data.map(row => getRequestRow(foreignId, row.id))
      })

      yield* next

    },
    middlewares.create(through.model),
    middlewares.bulkCreate(through.model),
    function * (next) {
      
      const {
        request, response, params
      } = this.restql

      let id = switchByType(response.body, {
        object : (data) => data[otherKey],
        array  : (data) => data.map(row => row[otherKey])
      })

      const data = yield params.data[get]({ where: { id } })

      response.body = switchByType(request.body, {
        object : () => data[0],
        array  : () => data
      })

      yield* next

    },
    middlewares.after())

}

/**
 * load PUT /user/:id/characters and PUT /user/:id/tags/:associationId
 */
loaders.model.association.plural.hasMany.put = (router, base, model, association) => {

  const {
    foreignKey
  } = association

  router.put(base, 
    middlewares.before(),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.findById(model),
    function * (next) {

      const {
        request, response, params
      } = this.restql

      const id = +this.params.id

      request.body = switchByType(this.request.body, {
        object: (body) => {
          body[foreignKey] = id
          return body
        },
        array: (body) => {
          return body.map(row => {
            row[foreignKey] = id
            return row
          })
        }
      }) 

      yield* next

    },
    middlewares.upsert(association.target),
    middlewares.bulkUpsert(association.target),
    middlewares.after())

  router.put(`${base}/:associationId`,
    middlewares.before(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model),
    function * (next) {

      const {
        request, params
      } = this.restql

      const associationId      = +this.params.associationId
      request.body.id          = associationId
      request.body[foreignKey] = this.params.id

      yield* next

    },
    middlewares.upsert(association.target),
    middlewares.after())

}

/**
 * load PUT /user/:id/tags and PUT /user/:id/tags/:associationId
 */
loaders.model.association.plural.belongsToMany.put = (router, base, model, association, options) => {

  const {
    foreignKey, otherKey, as, through
  } = association

  const {
    plural
  } = association.options.name

  const get = `get${capitalizeFirstLetter(plural)}`
  const add = `add${capitalizeFirstLetter(plural)}`

  router.put(base, 
    middlewares.before(),
    middlewares.findById(model),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.findOrUpsert(association.target),
    middlewares.bulkFindOrUpsert(association.target),
    function * (next) {

      const {
        request, response, params
      } = this.restql

      const data = response.body

      const getRequestRow = (foreignId, otherId) => {
        let ret = {}
        ret[foreignKey] = foreignId
        ret[otherKey]   = otherId
        return ret
      }

      const foreignId = +this.params.id
      request.body = switchByType(data, {
        object : (data) => getRequestRow(foreignId, data.id),
        array  : (data) => data.map(row => getRequestRow(foreignId, row.id))
      })

      params.status = response.status 

      yield* next

    },
    middlewares.upsert(through.model),
    middlewares.bulkUpsert(through.model),
    function * (next) {
      
      const {
        request, response, params
      } = this.restql

      let id = switchByType(response.body, {
        object : (data) => data[otherKey],
        array  : (data) => data.map(row => row[otherKey])
      })

      const data = yield params.data[get]({ where: { id } })

      response.body = switchByType(request.body, {
        object : () => data[0],
        array  : () => data
      })

      response.status = params.status
      yield* next

    },
    middlewares.after())

  router.put(`${base}/:associationId`,
    middlewares.before(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model),
    function * (next) {

      const {
        request, params
      } = this.restql

      const associationId = +this.params.associationId
      request.body.id = associationId

      yield* next

    },
    middlewares.upsert(association.target),
    function * (next) {

      const {
        request, response, params, query
      } = this.restql

      yield params.data[add](response.body)

      const data = 
        yield params.data[get]({ 
          where: {
            id: +this.params.associationId 
          }
        })

      response.body = data[0]

      yield* next

    },
    middlewares.after())

}

/**
 * load DELETE /user/:id/tags and DELETE /user/:id/tags/:associationId
 */
loaders.model.association.plural.hasMany.del = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association
  
  router.del(base, 
    middlewares.before(),
    middlewares.findById(model),
    middlewares.parseQuery(model, options),
    function * (next) {
      
      this.restql.query = this.restql.query || {}
      const where = this.restql.query.where || {}

      where[foreignKey] = +this.params.id
      this.restql.query.where = where

      yield* next

    },
    middlewares.destroy(association.target),
    middlewares.after())

  router.del(`${base}/:associationId`, 
    middlewares.before(),
    middlewares.findById(model),
    function * (next) {

      this.restql.query = this.restql.query || {}
      const where = this.restql.query.where || {}

      where.id          = +this.params.associationId
      where[foreignKey] = +this.params.id

      const data = 
        yield association.target.findOne({ where })

      if (!data) {
        this.throw(`RestQL: ${as} cannot be found`, 404)
      }

      this.restql.query.where = where

      yield* next

    },
    middlewares.destroy(association.target),
    middlewares.after())

}

/**
 * load DELETE /user/:id/tags and DELETE /user/:id/tags/:associationId
 */
loaders.model.association.plural.belongsToMany.del = (router, base, model, association, options) => {

  const {
    foreignKey, otherKey, as, through
  } = association

  const {
    plural
  } = association.options.name

  const get    = `get${capitalizeFirstLetter(plural)}`
  const remove = `remove${capitalizeFirstLetter(plural)}`

  router.del(base, 
    middlewares.before(),
    middlewares.findById(model),
    middlewares.parseQuery(association.target, options),
    function * (next) {

      const {
        request, response, params
      } = this.restql

      const query  = this.restql.query
      const data   = yield params.data[get](query)

      yield params.data[remove](data)

      response.status = 204
      yield* next

    },
    middlewares.after())

  router.del(`${base}/:associationId`,
    middlewares.before(),
    middlewares.findById(model),
    middlewares.parseQuery(association.target, options),
    function * (next) {

      const {
        request, response, params
      } = this.restql

      const query    = this.restql.query
      query.where    = {}
      query.where.id = +this.params.associationId

      const data = yield params.data[get](query)

      if (!data.length) {
        this.throw('RestQL: ${as} not found', 404)
      } 

      yield params.data[remove](data)

      response.status = 204
      yield* next

    },
    middlewares.after())

}

module.exports = loaders
