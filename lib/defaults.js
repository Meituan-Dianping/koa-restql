'use strict'

const debug       = require('debug')('koa-restql:defaults');
const middlewares = require('./middlewares');

const get  = middlewares.get;
const post = middlewares.post;
const put  = middlewares.put;
const del  = middlewares.del;

module.exports = {
  methods : [{
    name : 'get',
    path : '/',
    fn   : get,
    mount : {
      association : true
    }
  }, {
    name : 'post',
    path : '/',
    fn   : post,
    mount : {
      association : true
    }
  }, {
    name : 'put',
    path : '/',
    fn   : put,
    mount : {
      associationOnly    : true,
      singleResourceOnly : true
    }
  }, {
    name : 'get',
    path : '/:id',
    fn   : get,
    mount : {
      association        : true,
      pluralResourceOnly : true
    }
  }, {
    name : 'put',
    path : '/:id',
    fn   : put,
    mount : {
      association        : true,
      pluralResourceOnly : true
    }
  }, {
    name : 'del',
    path : '/:id',
    fn   : del,
    mount : {
      association        : true,
      pluralResourceOnly : true
    }
  }]
}

