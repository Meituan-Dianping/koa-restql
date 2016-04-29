'use strict';

const common  = require('./common');
const models  = require('./models');
const routers = require('./routers');

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

  let sequelize = this.options.sequelize || null;

  if (!sequelize) {
    throw new Error('sequelize is not defined')
  }

  this.models  = models.load(sequelize, options);
  this.router  = new Router;
  this.routers = routers.load(router, models, options);

  debug(router);
}
