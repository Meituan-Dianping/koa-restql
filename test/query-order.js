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

describe ('order', function () {

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

  it ('should return 200 | get /user, with order', function (done) {

    const order = [['id', 'DESC']]

    const querystring = qs.stringify({
      _order: order
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        models.user.findAll({ order }).then(users => {

          assert(body.length === users.length)

          users.forEach((user, index) => {
            assert(user.id === body[index].id)
            assert(user.name === body[index].name)
          })
          
          done()
          
        })

      })

  })
  
  it ('should return 200 | get /user/:id/characters, with order', function (done) {

    const order = [['id', 'DESC']]

    const querystring = qs.stringify({
      _order: order
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

          user.getCharacters({ order }).then(characters => {

            assert(body.length === characters.length)

            characters.forEach((character, index) => {
              assert(character.id === body[index].id)
              assert(character.name === body[index].name)
            })

            done()
          
          })

        })

    }).catch(done)


  })

})
