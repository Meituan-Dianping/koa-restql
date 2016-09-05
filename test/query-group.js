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

describe ('group', function () {

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

  it ('should return 200 | get /seat, include house, group = house_id', function (done) {

    const querystring = qs.stringify({
      _group: ['house_id']
    })

    server
      .get(`/gameofthrones/character?${querystring}`)
      .expect(200)
      .expect('X-Range', `objects 0-5/5`)
      .end((err, res) => {

        debug(res.headers)
        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        assert(body.length === 5)
        body.forEach(row => {
          assert(row._count > 0)
        })

        done()

      })

  })

  it ('should return 200 | get /seat, include house, group = house_id having = 1', function (done) {

    const querystring = qs.stringify({
      _group: ['house_id'],
      _having: {
        house_id: 1
      }
    })

    server
      .get(`/gameofthrones/character?${querystring}`)
      .expect(200)
      .expect('X-Range', `objects 0-1/1`)
      .end((err, res) => {

        debug(res.headers)
        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        assert(body.length === 1)

        done()

      })

  })

  it ('should return 200 | get /user/1/characters, group = house_id', function (done) {

    const id = 1

    const querystring = qs.stringify({
      _group: ['house_id'],
      _limit: 3
    })

    server
      .get(`/user/${id}/characters?${querystring}`)
      .expect(206)
      .expect('X-Range', `objects 0-3/4`)
      .end((err, res) => {

        debug(res.headers)
        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        assert(body.length === 3)

        done()

      })

  })


})
