'use strict'

const debug = require('debug')('koa-restql:defaults');

module.exports = {
  methods : [{
    name : 'get',
  }, {
    name : 'post',
    mount : {
      singular : false
    }
  }, {
    name : 'put',
    mount : {
      singular : true
    }
  }, {
    name : 'del',
    mount : {
      singular : true
    }
  }]
}

