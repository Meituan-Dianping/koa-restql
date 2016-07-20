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

  it ('should return 200 | get /user/:id/characters', function (done) {

    const id = 1

    model.findById(id).then(user => {

      user.getCharacters().then(characters => {

        server
          .get(`/user/${id}/characters`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            
            assert(body.length === characters.length)
            done()

          })

      })

    }).catch(done)

  })

  it ('should return 200 | get /user/:id/partialities', function (done) {

    const id = 1

    model.findById(id).then(user => {

      user.getPartialities().then(partialities => {

        server
          .get(`/user/${id}/partialities`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            
            assert(body.length === partialities.length)
            done()

          })

      })

    }).catch(done)

  })

  it ('should return 200 | get /user/:id/pests', function (done) {

    const id = 1

    model.findById(id).then(user => {

      user.getPests().then(pests => {

        server
          .get(`/user/${id}/pests`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            assert(body.length === pests.length)
            done()

          })

      })

    }).catch(done)

  })

  it ('should return 404 | get /user/:id/characters', function (done) {

    const id = 100

    server
      .get(`/user/${id}/characters`)
      .expect(404)
      .end(done)

  })

  it ('should return 200 | get /user/:id/characters/:associationId', function (done) {

    const id = 1

    model.findById(id).then(user => {

      user.getCharacters().then(characters => {

        let character = characters[0]
        character = character.dataValues
        test.deleteObjcetTimestamps(character)
        delete character.user_characters

        debug(character)

        server
          .get(`/user/${id}/characters/${character.id}`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.user_characters)
            test.assertObject(body, character)
            done()

          })

      })

    }).catch(done)

  })
  
  it ('should return 404 | get /user/:id/characters/:associationId, wrong id', function (done) {

    const id = 100

    server
      .get(`/user/${id}/characters/1`)
      .expect(404)
      .end(done)

  })

  it ('should return 404 | get /user/:id/characters/:associationId, wrong associationId', function (done) {

    const id = 1

    model.findById(id).then(user => {

      assert(user)

      server
        .get(`/user/${id}/characters/100`)
        .expect(404)
        .end(done)

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
          assert(body.user_characters)
          test.assertObject(body, character)
          test.assertModelById(association, body.id, character, done)

        })

    }).catch(done)

  })

  it ('should return 201 | post /user/:id/characters, array body', function (done) {

    const id = 1

    model.findById(id).then(user => {

      assert(user)

      const characters = []

      /* exist character */
      characters.push({
        name: 'Arya' 
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

          assert(body.length === characters.length)

          let promises = body.map((character, index) => {
            assert(character.id)
            test.assertObject(character, characters[index])
            test.assertModelById(association, character.id, characters[index])
          })

          Promise.all(promises).then(() => done())

        })

    }).catch(done)

  })

  it.only ('should return 200 | put /user/:id/characters, object body', function (done) {

    const id = 1
    const associationId = 2

    association.findById(associationId).then(character => {
      
      assert(character)
      return character

    }).then(character => {

      character = character.dataValues
      test.deleteObjcetTimestamps(character)

      server
        .put(`/user/${id}/characters`)
        .send(character)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert('object' === typeof body)
          debug(body)
          assert(body.id)
          assert(body.user_characters)
          test.assertObject(body, character)
          test.assertModelById(association, body.id, character, done)

        })

    }).catch(done)

  })


  it ('should return 200 | put /user/:id/characters, array body', function (done) {

    const id = 1

    model.findById(id).then(user => {

      assert(user)

      const characters = []

      /* exist character */
      characters.push({
        name: 'Arya' 
      })

      characters.push({
        name: 'Sansa'
      })

      server
        .put(`/user/${id}/characters`)
        .send(characters)
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          assert(body.length === characters.length)

          let promises = body.map((character, index) => {
            assert(character.id)
            test.assertObject(character, characters[index])
            test.assertModelById(association, character.id, characters[index])
          })

          Promise.all(promises).then(() => done())

        })

    }).catch(done)

  })

  it ('should return 200 | put /user/:id/characters, object body, update', function (done) {

    const id = 1

    model.findById(id).then(user => {

      assert(user)
      
      user.getCharacters().then(characters => {

        assert(characters.length)
        
        let character = characters[0].dataValues
        test.deleteObjcetTimestamps(character)
        delete character.user_characters
       
        server
          .put(`/user/${id}/characters`)
          .send(character)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.user_characters)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)

          })
        
      })

    }).catch(done)

  })

  it ('should return 200 | put /user/:id/characters, array body, update', function (done) {

    const id = 1

    model.findById(id).then(user => {

      assert(user)
      
      user.getCharacters().then(characters => {

        characters = characters.map(character => {
          character = character.dataValues
          test.deleteObjcetTimestamps(character)
          delete character.user_characters
          return character
        })
       
        server
          .put(`/user/${id}/characters`)
          .send(characters)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)

            assert(body.length === characters.length)

            let promises = body.map((character, index) => {
              assert(character.id)
              test.assertObject(character, characters[index])
              test.assertModelById(association, character.id, characters[index])
            })

            Promise.all(promises).then(() => done())

          })
        
      })

    }).catch(done)

  })

  it ('should return 200 | put /user/:id/characters/:associationId', function (done) {

    const id = 1

    model.findById(id).then(user => {

      assert(user)
      
      user.getCharacters().then(characters => {

        assert(characters.length)
        
        let character = characters[0].dataValues
        test.deleteObjcetTimestamps(character)
        delete character.user_characters

        character.is_bastard = !!character.is_bastard
       
        server
          .put(`/user/${id}/characters/${character.id}`)
          .send(character)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.user_characters)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)

          })
        
      })

    }).catch(done)

  })

  describe ('unique key constraint error', function () {

    it ('should return 409 | post /user/:id/characters, object body', function (done) {

      const id = 1

      model.findById(id).then(user => {

        assert(user)
        
        user.getCharacters().then(characters => {

          assert(characters.length)
          
          let character = characters[0].dataValues
          test.deleteObjcetTimestamps(character)
          delete character.user_characters
         
          server
            .post(`/user/${id}/characters`)
            .send(character)
            .expect(409)
            .end(done)
          
        })

      }).catch(done)

    })

    it ('should return 409 | post /user/:id/characters, array body', function (done) {

      const id = 1

      model.findById(id).then(user => {

        assert(user)
        
        user.getCharacters().then(characters => {

          characters = characters.map(character => {
            character = character.dataValues
            test.deleteObjcetTimestamps(character)
            delete character.user_characters
            return character
          })
         
          server
            .post(`/user/${id}/characters`)
            .send(characters)
            .expect(409)
            .end(done)
          
        })

      }).catch(done)

    })

    it ('should return 201 | post /user/:id/characters, object body', function (done) {

      const id = 1

      model.findById(id).then(user => {
        assert(user)
        return user.getCharacters().then(characters => {
          return user.setCharacters([]).then(() => {
            return user.getCharacters()
          }).then(data => {
            assert(!data.length)
            return characters
          })
        })
      }).then(characters => {

        const character = characters[0].dataValues
        test.deleteObjcetTimestamps(character)
        delete character.user_characters

        server
          .post(`/user/${id}/characters`)
          .send(character)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.user_characters)
            /* test default value */
            assert(body.user_characters.rate === 0)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)

          })

      }).catch(done)

    })

    it ('should return 201 | post /user/:id/characters, array body', function (done) {

      const id = 1

      model.findById(id).then(user => {
        assert(user)
        return user.getCharacters().then(characters => {
          return user.setCharacters([]).then(() => {
            return user.getCharacters()
          }).then(data => {
            assert(!data.length)
            return characters
          })
        })
      }).then(characters => {

        characters = characters.map(character => {

          character = character.dataValues
          test.deleteObjcetTimestamps(character)
          delete character.user_characters

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


})
