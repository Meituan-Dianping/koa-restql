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

describe ('model belongsToMany association routers', function () {

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

  const model       = models.user
  const through     = model.associations.characters.through.model
  const association = models.character

  it ('should return 200 | get /user/:id/partialities', function (done) {

    const id = 1

    model.findById(id).then(data => {

      server
        .get(`/user/${id}/partialities`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          
          assert(body.length === 4)
          done()

        })

    }).catch(done)

  })

  it ('should return 200 | get /user/:id/pests', function (done) {

    const id = 1

    model.findById(id).then(data => {

      server
        .get(`/user/${id}/pests`)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 1)
          done()

        })

    }).catch(done)

  })
  
  it ('should return 201 | post /user/:id/characters, object body', function (done) {

    const id = 1
    const associationId = 2

    association.findById(associationId).then(character => {
      
      assert(character)
      return character

    }).then(character => {

      character = character.dataValues
      test.deleteObjcetTimestamps(character)

      server
        .post(`/user/${id}/characters`)
        .send(character)
        .expect(201)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert('object' === typeof body)
          debug(body)
          assert(body.id)
          assert(body.user_character)
          test.assertObject(body, character)
          test.assertModelById(association, body.id, character, done)

        })

    }).catch(done)

  })

  it.only ('should return 201 | post /user/:id/characters, array body', function (done) {

    const id = 1

    const where = { user_id: id }

    through.findAll({ where }).then(user_characters => {
      return through.destroy({ where }).then(() => {
        return through.findAll({ where }).then(data => {
          assert(!data.length)
          return user_characters.map(user_character => 
            user_character.character_id)
        })
      }).then(characterIds => {
        return association.findAll({ where: { id: characterIds } })
      })
    }).then(characters => {

      characters = characters.map(character => {

        character = character.dataValues
        test.deleteObjcetTimestamps(character)

        return character
      })

      characters.push({
        name: 'Sansa'
      })

      server
        .post(`/user/${id}/characters`)
        .send(characters)
        .expect(201)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          let promises = body.map((character, index) => {
            assert(character.id)
            test.assertObject(character, characters[index])
            test.assertModelById(association, character.id, characters[index])
          })

          Promise.all(promises).then(() => done())
        })

    }).catch(done)

  })

})
