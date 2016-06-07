'use strict';

const router = require('../lib/router');
const common = require('../lib/common');
const test   = require('./lib/common');

const assert  = test.assert;
const Router  = test.Router;
const methods = test.methods;
const debug   = test.debug('koa-restql:test:common');

const shouldIgnoreAssociation = common.shouldIgnoreAssociation;

describe ('shouldIgnoreAssociation (method, options -> boolean)', function () {
 
  let func = shouldIgnoreAssociation;

  it ('should return false', function () {
    assert(func({ name: 'get', }, { ignore: true }));
  })  

  it ('should return true', function () {
    assert(!func({ name: 'get', }, { ignore: false }));
  })  

  it ('should pass all assertions', function () {
    let options = {
      ignore: ['get', 'post']
    };

    let method = {};

    method.name = 'get';
    assert(func(method, options));

    method.name = 'post';
    assert(func(method, options));

    method.name = 'put';
    assert(!func(method, options));

    method.name = 'del';
    assert(!func(method, options));
  })  
})
