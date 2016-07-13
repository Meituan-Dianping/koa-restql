'use strict'

const qs      = require('qs')
const koa     = require('koa')
const http    = require('http')
const uuid    = require('node-uuid')
const assert  = require('assert')
const request = require('supertest')
const debug   = require('debug')('koa-restql:test:associations')

const test    = require('./lib/test')
const prepare = require('./lib/prepare')
const RestQL  = require('../lib/RestQL')

const models  = prepare.sequelize.models

describe ('model association routers', function () {

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

  describe ('hasOne association', function () {
    
    const model       = models.house
    const association = models.seat

    it ('should return 200 | get /house/:id/seat', function (done) {

      const id = 2

      model.findById(id).then(data => {

        server
          .get(`/gameofthrones/house/${id}/seat`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.house_id === id)
            done()

          })

      }).catch(done)

    })

    it.only ('should return 200 | put /house/:id/seat', function (done) {

      const id = 2
      const data = {
        name: uuid()
      }

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/house/${id}/seat`)
          .send(data)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.house_id === id)
            test.assertObject(body, data)
            test.assertModelById(association, body.house_id, data, done)

          })

      }).catch(done)

    })
  })

  describe ('belongsTo association', function () {

    const model       = models.seat
    const association = models.house

    it ('should return 200 | get /seat/:id/house', function (done) {

      const id = 3

      model.findById(id).then(data => {

        server
          .get(`/gameofthrones/seat/${id}/house`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id === data.house_id)
            done()

          })

      }).catch(done)

    })

    it ('should return 200 | put /seat/:id/house', function (done) {

      const id = 3
      const data = {
        name: uuid()
      }

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/seat/${id}/house`)
          .send(data)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id === data.house_id)
            test.assertObject(body, data)
            test.assertModelById(association, body.house_id, data, done)

          })

      }).catch(done)

    })
  })

  describe ('hasMany association', function () {

  })

  describe ('belongsToMany association', function () {

  })

})
