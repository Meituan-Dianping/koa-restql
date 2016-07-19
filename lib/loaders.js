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
    middlewares.parseQuery(model, options),
    function * (next) {

      let status = 200

      const query = this.restql.parsedQuery

      const data = 
        yield model.findAndCount(query)

      this.restql.params = data

      yield* next

    },
    middlewares.pagination(model))

  router.get(`${base}/:id`, 
    middlewares.parseQuery(model, options),
    middlewares.findById(model))

}

/**
 * load POST /user
 */
loaders.model.post = (router, base, model, options) => {

  router.post(base, 
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.create(model),
    middlewares.bulkCreate(model))

}

/**
 * load PUT /user and PUT /user/:id
 */
loaders.model.put = (router, base, model, options) => {

  router.put(base, 
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.upsert(model),
    middlewares.bulkUpsert(model))

  router.put(`${base}/:id`, 
    middlewares.findById(model),
    middlewares.parseRequestBody(['object']),
    function * (next) {

      this.request.body.id = this.params.id
      yield* next

    }, 
    middlewares.upsert(model))

}

/**
 * load DELETE /user and DELETE /user/:id
 */
loaders.model.del = (router, base, model, options) => {

  router.del(base, 
    middlewares.parseQuery(model, options),
    middlewares.destroy(model))

  router.del(`${base}/:id`,
    middlewares.findById(model),
    function * (next) {
      
      this.restql = {}
      this.restql.parsedQuery = {}
      this.restql.parsedQuery.where = { id: this.params.id }

      yield* next

    },
    middlewares.destroy(model))

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

  router.get(base,
    middlewares.setup,
    middlewares.parseQuery(model, options),
    middlewares.findById(model),
    function * (next) {
      const query  = this.restql.parsedQuery || {}
      const getter = `get${capitalizeFirstLetter(singular)}`

      let data   = this.response.body
        , status = 200

      const {
        attributes, include
      } = query

      data = 
        yield data[getter]({
          attributes, include
        })

      if (!data)
        status = 404

      this.response.body   = data
      this.response.status = status

      yield* next
    })

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
    middlewares.setup(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model, query),
    function * (next) {

      const data = this.response.body
      
      this.request.body[foreignKey] = data.id
      if (data[as]) {
        this.restql.params.id = data[as].id
      }

      yield* next

    },
    middlewares.createOrUpdateById(association.target))

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
    middlewares.setup(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model, query),
    function * (next) {

      const data = this.response.body

      this.restql.params.data = data
      if (data[as]) {
        this.restql.params.id = data[foreignKey]    
      }

      yield* next

    },
    middlewares.createOrUpdateById(association.target), 
    function * (next) {
      
      const data  = this.response.body
      const value = {} 

      value[foreignKey] = data.id
      yield this.restql.params.data.update(value) 

      yield* next
    })

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
    middlewares.setup(),
    middlewares.findById(model, query),

    function * () {

      const data = this.response.body

      if (!data[as]) 
        this.throw('${model.name} ${association.as} not found', 404)

      yield data[as].destroy()

      this.response.status = 204
    })
}

/**
 * load GET /user/:id/tags and GET /user/:id/tags/:associationId
 */
loaders.model.association.plural.get = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  const {
    plural
  } = association.options.name

  const get   = `get${capitalizeFirstLetter(plural)}`
  const count = `count${capitalizeFirstLetter(plural)}`

  router.get(base, 
    middlewares.setup(),
    middlewares.parseQuery(association.target, options),
    middlewares.findById(model),
    function * (next) {

      const query = this.restql.parsedQuery || {}
      const data  = this.response.body

      const {
        where
      } = query

      const promises = {}
    
      promises.count = data[count]({ where })
      promises.rows  = data[get](query)

      this.restql.params = yield promises

      yield* next
    },
    middlewares.pagination(association.target))

  router.get(`${base}/:associationId`, 
    middlewares.parseQuery(association.target, options),
    middlewares.findById(model),
    function * (next) {
      
      const query = this.restql.parsedQuery
      query.where = query.where || {}

      query.where.id = this.params.associationId

      let data = this.response.body

      data = yield data[get](query)

      if (!data.length)
        this.throw('RestQL: ${model.name} not found', 404)

      this.response.body   = data[0]
      this.response.status = 200

      yield* next

    })

}

/**
 * load POST /user/:id/tags
 */
loaders.model.association.plural.hasMany.post = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association

  router.post(base, 
    middlewares.setup(),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.findById(model),
    function * (next) {
      
      const data = this.response.body

      common.switchByType(this.request.body, {
        object: (body) => {
          body[foreignKey] = data.id
        },
        array: (body) => {
          body.forEach(row => row[foreignKey] = data.id)
        }
      }) 

      yield* next

    },
    middlewares.create(association.target),
    middlewares.bulkCreate(association.target))

}

/**
 * load POST /user/:id/tags
 */
loaders.model.association.plural.belongsToMany.post = (router, base, model, association) => {

  const {
    foreignKey, otherKey, as, through
  } = association

  const {
    plural
  } = association.options.name

  const get   = `get${capitalizeFirstLetter(plural)}`
  const count = `count${capitalizeFirstLetter(plural)}`

  router.post(base, 
    middlewares.setup(),
    middlewares.findById(model),
    middlewares.parseRequestBody(['object', 'array']),
    function * (next) {

      this.restql.params.data = this.response.body
      yield* next

    },
    middlewares.upsert(association.target),
    middlewares.bulkUpsert(association.target),
    function * (next) {
      
      this.request.body = common.switchByType(this.response.body, {
        object: (data) => {
          let ret = {}
          ret[foreignKey] = this.params.id
          ret[otherKey] = data.id
          return ret
        },
        array: (data) => {
          return data.map(row => {
            let ret = {}
            ret[foreignKey] = this.params.id
            ret[otherKey] = row.id
            return ret
          })
        }
      }) 

      yield* next

    },
    middlewares.create(through.model), 
    middlewares.bulkCreate(through.model),
    function * (next) {
      
      const ids  = common.switchByType(this.response.body, {
        object: (data) => {
          return data[otherKey]
        },
        array: (data) => {
          return data.map(row => {
            return row[otherKey]
          })
        }
      }) 

      let data = this.restql.params.data

      data = 
        yield data[get]({ where: { id: ids } })

      this.response.body = common.switchByType(this.response.body, {
        object : () => data[0],
        array  : () => data
      })

      yield* next

    })
}

/**
 * load PUT /user/:id/tags and PUT /user/:id/tags/:associationId
 */
loaders.model.association.plural.hasMany.put = (router, base, model, association) => {

  const {
    foreignKey, as
  } = association

  router.put(base, 
    middlewares.setup(),
    middlewares.parseRequestBody(['object', 'array']),
    middlewares.findById(model),
    function * (next) {
      
      const data = this.response.body

      common.switchByType(this.request.body, {
        object: (body) => {
          body[foreignKey] = data.id
        },
        array: (body) => {
          body.forEach(row => row[foreignKey] = data.id)
        }
      }) 

      yield* next

    },
    middlewares.upsert(association.target),
    middlewares.bulkUpsert(association.target))

  router.put(`${base}/:associationId`,
    middlewares.setup(),
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model),
    function * (next) {

      const query = this.restql.parsedQuery || {}
      const where = query.where || {}

      where.id          = this.params.associationId
      where[foreignKey] = this.params.id

      this.restql.parsedQuery.where = where

      yield* next

    },
    middlewares.findOne(association.target),
    function * (next) {

      const data = this.response.body
      this.request.body[foreignKey] = data.id
      this.request.body.id = this.params.associationId

      yield* next

    },
    middlewares.upsert(association.target))

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

  const get   = `get${capitalizeFirstLetter(plural)}`
  const count = `count${capitalizeFirstLetter(plural)}`

  router.put(base, 
    middlewares.setup(),
    middlewares.findById(model),
    middlewares.parseRequestBody(['object', 'array']),
    function * (next) {

      this.restql.params.data = this.response.body
      yield* next

    },
    middlewares.upsert(association.target),
    middlewares.bulkUpsert(association.target),
    function * (next) {
      
      this.request.body = common.switchByType(this.response.body, {
        object: (data) => {
          let ret = {}
          ret[foreignKey] = this.params.id
          ret[otherKey] = data.id
          return ret
        },
        array: (data) => {
          return data.map(row => {
            let ret = {}
            ret[foreignKey] = this.params.id
            ret[otherKey] = row.id
            return ret
          })
        }
      }) 

      yield* next

    },
    middlewares.upsert(through.model), 
    middlewares.bulkUpsert(through.model),
    function * (next) {
      
      const ids  = common.switchByType(this.response.body, {
        object: (data) => {
          return data[otherKey]
        },
        array: (data) => {
          return data.map(row => {
            return row[otherKey]
          })
        }
      }) 

      let data = this.restql.params.data

      data = 
        yield data[get]({ where: { id: ids } })

      this.response.body = common.switchByType(this.response.body, {
        object : () => data[0],
        array  : () => data
      })

      yield* next

    })

  router.put(`${base}/:associationId`,
    middlewares.setup(),
    middlewares.findById(model),
    middlewares.parseRequestBody(['object']),
    function * (next) {

      this.restql.params.data = this.response.body
      yield* next

    },
    middlewares.upsert(association.target),
    function * (next) {
      
      const data = this.response.body

      this.request.body = {}
      this.request.body[foreignKey] = this.params.id
      this.request.body[otherKey]   = data.id

      yield* next

    },
    middlewares.upsert(through.model), 
    function * (next) {
      
      const id = this.response.body[otherKey]
      let data = this.restql.params.data

      data = 
        yield data[get]({ where: { id } })

      this.response.body = data[0]

      yield* next

    })

}

/**
 * load DELETE /user/:id/tags and DELETE /user/:id/tags/:associationId
 */
loaders.model.association.plural.hasMany.del = (router, base, model, association, options) => {

  const {
    foreignKey, as
  } = association
  
  router.del(base, 
    middlewares.setup(),
    middlewares.findById(model),
    middlewares.parseQuery(model, options),
    function * (next) {
      
      const query = this.restql.parsedQuery || {}
      const where = query.where || {}

      if (!Object.keys(where || {}).length) {
        this.response.status = 204
        return
      }

      where[foreignKey] = this.params.id
      this.restql.parsedQuery.where = where

      yield* next

    },
    middlewares.destroy(association.target))

  router.del(`${base}/:associationId`, 
    middlewares.setup(),
    middlewares.findById(model),
    function * (next) {

      const query = this.restql.parsedQuery || {}
      const where = query.where || {}

      where.id          = this.params.associationId
      where[foreignKey] = this.params.id

      this.restql.parsedQuery.where = where

      yield* next

    },
    middlewares.findOne(association.target),
    middlewares.destroy(association.target))

}

/**
 * load DELETE /user/:id/tags and DELETE /user/:id/tags/:associationId
 */
loaders.model.association.plural.belongsToMany.del = (router, base, model, association, options) => {
  router.del(base, function * () {})
  router.del(`${base}/:associationId`, function * () {})
}

module.exports = loaders;
