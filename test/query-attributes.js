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

describe ('attributes', function () {

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

  it ('should return 200 | get /user, with attributes', function (done) {

    const querystring = qs.stringify({
      _attributes: [ 'id', 'name' ]
    })

    const id = 1

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(user => {
          debug(user)
          assert(user.id)
          assert(user.name)
        })

        done()

      })


  })
  
  it ('should return 200 | get /user/:id/characters, with attributes', function (done) {

    const querystring = qs.stringify({
      _attributes: [ 'id', 'name' ]
    })

    const id = 1

    models.user.findById(id).then(user => {

      server
        .get(`/user/${user.id}/characters?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          body.forEach(character=> {
            debug(character)
            assert(character.id)
            assert(character.name)
            assert(!character.house_id)
            assert(character.is_bastard === undefined)
          })

          done()

        })

    }).catch(done)


  })

})
