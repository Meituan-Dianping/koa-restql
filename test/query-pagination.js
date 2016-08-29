'use strict'

const qs      = require('qs')
const koa     = require('koa')
const http    = require('http')
const uuid    = require('node-uuid')
const assert  = require('assert')
const request = require('supertest')
const debug   = require('debug')('koa-restql:test:pagination')

const test    = require('./lib/test')
const prepare = require('./lib/prepare')
const RestQL  = require('../lib/RestQL')

const {
  sequelize, createMockData
}  = prepare

const models = sequelize.models

describe ('pagination', function () {

  let server

  before (function () {

    let app = koa()
      , restql = new RestQL(models)

    app.use(restql.routes())
    server = request(http.createServer(app.callback()))

  })

  describe ('model', function () {

    const model = models.user
    const count = 100

    before (function () {

      return prepare.reset().then(() => 
        createMockData(model, ['name'], count))

    })

    it ('should return 206 | get /user', function (done) {

      server
        .get('/user')
        .expect(206)
        .expect('X-Range', 'objects 0-20/100')
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 20)
          done()

        })

    })

    it ('should return 206 | get /user, with offset', function (done) {

      const querystring = qs.stringify({
        _offset: 50
      })

      server
        .get(`/user?${querystring}`)
        .expect(206)
        .expect('X-Range', 'objects 50-70/100')
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 20)
          done()

        })

    })

    it ('should return 206 | get /user, with offset + limit > count', function (done) {

      const querystring = qs.stringify({
        _offset: 90
      })

      server
        .get(`/user?${querystring}`)
        .expect(206)
        .expect('X-Range', 'objects 90-100/100')
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 10)
          done()

        })

    })

    it ('should return 200 | get /user, limit > count', function (done) {

      const querystring = qs.stringify({
        _limit: 200
      })

      server
        .get(`/user?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === count)
          done()

        })

    })

  })

  describe ('model with association', function () {

    const model       = models.house
    const association = models.character

    const id    = 1
    const count = 100

    before (function () {

      return prepare.reset().then(() => {
        return model.create({
          name: uuid()
        }).then(house => {
          return createMockData(association, ['name'], count, {
            house_id: house.id
          })
        })
      })

    })

    it ('should return 206 | get /house/:id/members', function (done) {

      server
        .get(`/gameofthrones/house/${id}/members`)
        .expect(206)
        .expect('X-Range', 'objects 0-20/100')
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 20)
          done()

        })

    })

    it ('should return 206 | get /house/:id/members, with offset', function (done) {

      const querystring = qs.stringify({
        _offset: 20
      })

      server
        .get(`/gameofthrones/house/${id}/members?${querystring}`)
        .expect(206)
        .expect('X-Range', 'objects 20-40/100')
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 20)
          done()

        })

    })

    it ('should return 206 | get /house/:id/members, with offset + limit > count', function (done) {

      const querystring = qs.stringify({
        _offset: 90
      })

      server
        .get(`/gameofthrones/house/${id}/members?${querystring}`)
        .expect(206)
        .expect('X-Range', 'objects 90-100/100')
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 10)
          done()

        })

    })

    it ('should return 200 | get /house/:id/members, limit > count', function (done) {

      const querystring = qs.stringify({
        _limit: 200
      })

      server
        .get(`/gameofthrones/house/${id}/members?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === count)
          done()

        })

    })

  })

})
