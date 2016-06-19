'use strict'

const debug = require('debug')('koa-restql:methods');

/**
 * when isSingular === undefined
 * method can be mounted on either singular or plural path
 *
 * when isSingular === true
 * method can just be mounted on a singular path
 *
 * when isSingular === false
 * method can just be mounted on a plural path
 */

module.exports = [
  { name : 'get' }, 
  { name : 'post' , isSingular : false }, 
  { name : 'put'  , isSingular : true  }, 
  { name : 'del'  , isSingular : true  }
]
