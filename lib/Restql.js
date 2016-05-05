'use strict';

const router = require('./router');

/**
 * @module koa-restql
 */

module.exports = Restql;

/**
 * Create a new Restql
 *
 * @param {Object}  [options={}]
 * @param {Object}  [options.sequelize = null]
 */

function Restql (models, opts) {
  
  if (!(this instanceof Restql)) {
    return new Restql(ops);
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
