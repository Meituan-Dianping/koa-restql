'use strict'

const qs      = require('qs')
const koa     = require('koa')
const http    = require('http')
const uuid    = require('node-uuid')
const assert  = require('assert')
const request = require('supertest')
const debug   = require('debug')('koa-restql:test:query')

const test    = require('./lib/test')
const prepare = require('./lib/prepare')
const RestQL  = require('../lib/RestQL')

const models  = prepare.sequelize.models

describe.skip ('subQuery', function () {

  let server

  before (function () {

    let app = koa()
      , restql = new RestQL(models)

    app.use(restql.routes())
    server = request(http.createServer(app.callback()))

  })

  beforeEach (function (done) {

    debug('reset db')
    prepare.loadMockData().then(() => {
      done()
    }).catch(done)  

  })

  it ('should return 200 | get /seat, include house, subQuery = undefined', function (done) {

    const limit = 4

    const querystring = qs.stringify({
      _attributes: ['id'],
      _include: [{
        attributes: ['id', 'house_id'],
        association: 'members',
        required: 1,
        subQuery: 0
      }, {
        attributes: ['id', 'house_id'],
        association: 'seat',
        required: 1
      }],
      _limit: limit
    })

    server
      .get(`/gameofthrones/house?${querystring}`)
      .expect(200)
      //.expect('X-Range', `objects 0-${limit}/5`)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        assert(body.length === 4)

        done()

      })

  })

})
