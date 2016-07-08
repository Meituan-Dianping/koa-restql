'use strict'

const assert  = require('assert');
const debug   = require('debug')('koa-restql:test:restql')

const RestQL  = require('../lib/RestQL')
const prepare = require('./lib/prepare')

const models  = prepare.sequelize.models;

describe ('RestQL', function () {

  it ('should create a Restql instance | new RestQL(models)', function () {
   
    const restql = new RestQL(models)
    assert(restql instanceof RestQL)

  })


  it ('should create a Restql instance | RestQL(models)', function () {
   
    const restql = RestQL(models)
    assert(restql instanceof RestQL)

  })

})

