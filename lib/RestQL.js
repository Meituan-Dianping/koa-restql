'use strict';

const _      = require('lodash')
const router = require('./router');

/**
 * @module koa-restql
 */

module.exports = RestQL;

/**
 * Create a new Restql
 *
 * @param {Object}  [models={}]
 * @param {Object}  [options={}]
 */

function RestQL (models, options) {
  
  if (!(this instanceof RestQL)) {
    return new RestQL(models, options);
  }

  options = options || {}

  this.options = _.defaultsDeep(options, {
    query: {
      _limit: 20
    },
    qs: {
      arrayLimit         : 1000,
      strictNullHandling : true
    }
  })

  if (!models) {
    throw new Error('paramter models does not exist')
  }

  this.models = models
  this.router = router.load(models, this.options)

  this.routes = () => {
    return this.router.routes()
  }

}
