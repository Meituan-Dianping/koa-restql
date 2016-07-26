'use strict';

const router = require('./router');

/**
 * @module koa-restql
 */

module.exports = RestQL;

/**
 * Create a new Restql
 *
 * @param {Object}  [models={}]
 * @param {Object}  [opts={}]
 */

function RestQL (models, options) {
  
  if (!(this instanceof RestQL)) {
    return new RestQL(models, options);
  }

  const defaultOptions = {
    query: {
      _limit: 20
    },
    qs: {
      allowDots          : true,
      strictNullHandling : true
    }
  }

  this.options = options || defaultOptions

  if (!models) {
    throw new Error('paramter models does not exist')
  }

  this.models = models
  this.router = router.load(models, this.options)

  this.routes = () => {
    return this.router.routes()
  }
}
