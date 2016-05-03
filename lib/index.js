'use strict';

const models = require('./models');
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

function Restql (options) {
  
  if (!(this instanceof Restql)) {
    return new Restql(options);
  }

  this.options = options || {};

  let sequelize = this.options.sequelize;
  let router    = this.options.router;

  if (!sequelize) {
    throw new Error('sequelize is not defined')
  }

  if (!router) {
    throw new Error('router is not defined');
  }

  this.models = models.load(sequelize, options);
  this.router = router.load(router, models, options);
}
