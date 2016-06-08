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

function RestQL (models, opts) {
  
  if (!(this instanceof RestQL)) {
    return new RestQL(models, opts);
  }

  this.options = opts || {};

  if (!models) {
    throw new Error('paramter models does not exist')
  }

  this.models = models;
  this.router = router.load(models, this.options);

  this.routes = () => {
    return this.router.routes();
  }
}
