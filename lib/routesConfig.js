'use strict'

const debug    = require('debug')('koa-restql:routesConfig');
const handlers = require('./handlers');

const get  = handlers.get;
const post = handlers.post;
const put  = handlers.put;
const del  = handlers.del;

module.exports = {
  methods : [{
    name : 'get',
    path : '/',
    fn   : get,
    isMounted : {
      association : true
    }
  }, {
    name : 'post',
    path : '/',
    fn   : post,
    isMounted : {
      association : true
    }
  }, {
    name : 'put',
    path : '/',
    fn   : put,
    isMounted : {
      associationOnly    : true,
      singleResourceOnly : true
    }
  }, {
    name : 'get',
    path : '/:id',
    fn   : get,
    isMounted : {
      association        : true,
      pluralResourceOnly : true
    }
  }, {
    name : 'put',
    path : '/:id',
    fn   : put,
    isMounted : {
      association        : true,
      pluralResourceOnly : true
    }
  }, {
    name : 'del',
    path : '/:id',
    fn   : del,
    isMounted : {
      association        : true,
      pluralResourceOnly : true
    }
  }]
}

