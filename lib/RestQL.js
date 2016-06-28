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

  this.options = options || {};

  if (!models) {
    throw new Error('paramter models does not exist');
  }

  this.models = models;
  this.router = router.load(models, this.options);

  this.routes = () => {
    return this.router.routes();
  }
}
