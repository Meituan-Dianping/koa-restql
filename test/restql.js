'use strict'

const RestQL = require('../lib/RestQL');
const common = require('./lib/common');

const qs      = common.qs;
const koa     = common.koa;
const util    = common.util;
const http    = common.http;
const Router  = common.Router;
const assert  = common.assert;
const request = common.request;
const models  = common.sequelize.models;
const debug   = common.debug('koa-restql:test:restql');

describe ('RestQL', function () {
  it ('should create new Restql', function (done) {
   
    let restql = new RestQL(models);
    assert(restql instanceof RestQL);

    restql = null;
    restql = RestQL(models);
    assert(restql instanceof RestQL);

    done();
  })
})

