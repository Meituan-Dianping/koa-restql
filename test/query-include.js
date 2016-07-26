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

describe ('include', function () {

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

  it ('should return 200 | get /user, include characters, string', function (done) {

    const querystring = qs.stringify({
      _include: 'characters'
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.characters))
        })

        done()

      })

  })

  it ('should return 200 | get /user, include characters, object', function (done) {

    const querystring = qs.stringify({
      _include: {
        association: 'characters'
      }
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.characters))
        })

        done()

      })

  })

  it ('should return 200 | get /user, include characters, array', function (done) {

    const querystring = qs.stringify({
      _include: [{
        association: 'characters'
      }]
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.characters))
        })

        done()

      })

  })

  it ('should return 200 | get /user, include characters, with attributes', function (done) {

    const querystring = qs.stringify({
      _include: [{
        association: 'characters',
        attributes: ['id', 'name']
      }]
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.characters))
          row.characters.forEach(character => {
            debug(character)
            assert(character.id)
            assert(character.name)
            assert(!character.house_id)
          })
        })

        done()

      })

  })
  
  it ('should return 200 | get /user, include characters, with through', function (done) {

    const querystring = qs.stringify({
      _include: [{
        association: 'characters',
        through: {
          where: {
            rate: {
              $gt: 0
            }
          }
        }
      }]
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.characters))
          row.characters.forEach(character => {
            debug(character)
            assert(character.id)
            assert(character.name)
            assert(character.user_characters)
            assert(character.user_characters.rate > 0)
          })
        })

        done()

      })

  })

  it ('should return 200 | get /user, include characters, nest include house', function (done) {

    const querystring = qs.stringify({
      _include: [{
        association: 'characters',
        include: 'house'
      }]
    })

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.characters))
          row.characters.forEach(character => {
            debug(character)
            assert(character.house)
          })
        })

        done()

      })

  })

  it ('should return 200 | get /user, include characters, with require = true', function (done) {

    const user = {
      name: uuid()
    }

    const querystring = qs.stringify({
      _include: [{
        association: 'characters',
        required: 1
      }]
    })

    models.user.create(user).then(user => {

      server
        .get(`/user?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          body.forEach(row => {
            assert(row.id)
            assert(row.id !== user.id)
            assert(Array.isArray(row.characters))
            row.characters.forEach(character => {
              debug(character)
            })
          })

          done()

        })
       
    }).catch(done)

  })

  it ('should return 200 | get /user, include characters, with where', function (done) {

    const user = {
      name: uuid()
    }

    const querystring = qs.stringify({
      _include: [{
        association: 'characters',
        where: {
          house_id: 1  
        }
      }]
    })

    models.user.create(user).then(user => {

      server
        .get(`/user?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          body.forEach(row => {
            assert(row.id)
            assert(Array.isArray(row.characters))
            row.characters.forEach(character => {
              debug(character)
              assert(character.house_id === 1)
            })
          })

          done()

        })
       
    }).catch(done)

  })
  
  it ('should return 200 | get /user, include characters, with where, with required = false', function (done) { 
    
    const user = { name: uuid() }

    const querystring = qs.stringify({
      _include: [{
        association: 'characters',
        where: {
          house_id: 1  
        },
        require: 0
      }]
    })

    models.user.create(user).then(user => {

      server
        .get(`/user?${querystring}`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          assert(body.some(row => row.id === user.id))

          body.forEach(row => {
            assert(row.id)
            if (row.characters) {
              assert(Array.isArray(row.characters))
              row.characters.forEach(character => {
                debug(character)
                assert(character.house_id === 1)
            })
            }
          })

          done()

        })
       
    }).catch(done)

  })

  it ('should return 200 | get /house, include seat and characters', function (done) {

    const querystring = qs.stringify({
      _include: [
        'members', 'seat'
      ]
    })

    server
      .get(`/gameofthrones/house?${querystring}`)
      .expect(200)
      .end((err, res) => {

        if (err) return done(err)
        let body = res.body
        assert(Array.isArray(body))
        debug(body)

        body.forEach(row => {
          assert(row.id)
          assert(Array.isArray(row.members))
          assert(row.seat)
        })

        done()

      })

  })

})
