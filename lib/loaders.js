'use strict';

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
loaders.model.association.plural   = {}
loaders.model.association.singular = {}
loaders.model.association.singular.hasOne    = {}
loaders.model.association.singular.belongsTo = {}

/**
 * load GET /user and GET /user/:id
 */
loaders.model.get = (router, base, model, options) => {

  router.get(base, 
    middlewares.parseQuery(model, options),
    function * (next) {

      let status = 200

      const query = this.restql.parsedQuery

      const {
        attributes, where, order, include, limit, offset
      } = this.restql.parsedQuery

      const data = 
        yield model.findAndCount({
          attributes, where, order, include, limit, offset
        })

      const {
        count, rows
      } = data

      const xRangeHeader = `objects ${query.offset}-\
        ${query.offset + rows.length}/${count}`

      if (count > query.limit) {
        status = 206
      }

      this.response.set('X-Range', xRangeHeader)
      this.response.body   = rows
      this.response.status = status

      yield* next
    });

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
  router.get(base,
    middlewares.parseQuery(model, options),
    middlewares.findById(model),
    function * (next) {
      const query  = this.restql.parsedQuery || {}
      const name   = association.options.name
      const getter = `get${capitalizeFirstLetter(name.singular)}`

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
loaders.model.association.singular.hasOne.put = (router, base, model, association) => {

  const query = {
    include: [ association ]
  }

  router.put(base,
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model, query),
    middlewares.createHasOneAssociation(model, association))

}

/**
 * load PUT /gameofthrones/seat/:id/house
 */
loaders.model.association.singular.belongsTo.put = (router, base, model, association) => {

  const {
    foreignKey, options, as
  } = association

  const query = {
    include: [ association ]
  }

  router.put(base,
    middlewares.parseRequestBody(['object']),
    middlewares.findById(model, query),
    function * (next) {

      const data = this.response.body

      delete this.resquest.body.id
      if (data[as]) {
        this.resquest.body.id = data[foreignKey]
      }

      yield* next

    },
    middlewares.upsert(association.target))

}

/**
 * load DELETE /user/:id/profile
 */
loaders.model.association.singular.del = (router, base, model, association) => {
  router.del(base, function * () {});
}

/**
 * load GET /user/:id/tags and GET /user/:id/tags/:associationId
 */
loaders.model.association.plural.get = (router, base, model, association) => {
  router.get(base, function * () {});
  router.get(`${base}/:associationId`, function *() {})
}

/**
 * load POST /user/:id/tags
 */
loaders.model.association.plural.post = (router, base, model, association) => {
  router.post(base, function * () {});
}

/**
 * load PUT /user/:id/tags and PUT /user/:id/tags/:associationId
 */
loaders.model.association.plural.put = (router, base, model, association) => {
  router.put(base, function * () {});
  router.put(`${base}/:associationId`, function * () {});
}

/**
 * load DELETE /user/:id/tags and DELETE /user/:id/tags/:associationId
 */
loaders.model.association.plural.del = (router, base, model, association) => {
  router.del(base, function * () {});
  router.del(`${base}/:associationId`, function * () {});
}

module.exports = loaders;
