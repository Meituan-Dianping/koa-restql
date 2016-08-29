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

const {
  sequelize, createMockData
}  = prepare

const models = sequelize.models

describe ('where', function () {

  let server

  before (function () {

    let app = koa()
      , restql = new RestQL(models)

    app.use(restql.routes())
    server = request(http.createServer(app.callback()))

  })

  describe('qs parse array', function() {

    const model = models.user
    const count = 100

    before (function () {

      return prepare.reset().then(() => 
        createMockData(model, ['name'], count))

    })

    it ('should return 200 | get /user, with id = 1', function (done) {

      const id = 1
      const querystring = qs.stringify({ id })

      server
        .get(`/user?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          body.forEach(user => {
            assert(user.id === id)
            assert(user.name)
          })

          done()

        })

    })


    it('should return 206 | get /user with id = [1, 2, ...]', function(done) {

      const iterator = new Array(25).fill(0)
      const ids = iterator.map((value, index) => index)

      const querystring = qs.stringify({ id: ids })

      server
        .get(`/user?${querystring}`)
        .expect(206)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          assert(body.length === 20)
          debug(body)

          done()

        })
      
    })
    
  })

})
