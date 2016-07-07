'use strict';

const fs        = require('fs')
const util      = require('util')
const path      = require('path')
const debug     = require('debug')('sequelize')
const Sequelize = require('sequelize')

const config    = require('./config')
const mock      = require('../mock/data')

const database  = process.env.TEST_DB || config.db

const sequelize = new Sequelize(database, {

  logging        : debug,
  underscored    : true,
  underscoredAll : true,

  define: {
    paranoid        : true,
    underscored     : true,
    freezeTableName : true,
    schemaDelimiter : '_',
    createdAt       : 'created_at',
    updatedAt       : 'updated_at',
    deletedAt       : 'deleted_at'
  },
})

const loadMockModels = (modelsPath) => {

  fs.readdirSync(modelsPath).forEach(filename => {

    let modelPath      = path.resolve(modelsPath, filename)
      , stats          = fs.lstatSync(modelPath)
      , isDirectory    = stats.isDirectory()
      , validNameRegex = /^(.+)\.(js|json)/
      , isValidFile    = validNameRegex.test(filename) || isDirectory

    // keep .js, .json or directory
    if (!isValidFile) return

    // load model recursively
    if (isDirectory) {

      loadMockModels(modelPath)

    } else {
      let model = require(modelPath)
        , name  = filename.match(validNameRegex)[1]

      let {
        options = {}, attributes = {}
      } = model;

      sequelize.define(name, attributes, options)
    }       
  })
}

const loadMockData = () => {

  let models   = sequelize.models
    , promises = []

  return sequelize.sync({
    force: true
  }).then(() => {
    Object.keys(models).forEach(key => {

      let data  = mock[key]
        , model = models[key]

      if (data && Array.isArray(data)) {
        promises.push(model.bulkCreate(data))
      }
    })

    return Promise.all(promises).then(() => mock)
  })
}

loadMockModels('test/mock/models')

// const models = sequelize.models;
// Object.keys(models).forEach(key => {
// 
//   let model = models[key]
// 
//   if ('associate' in model) {
//     model.associate(models)
//   }
// })


module.exports = {
  sequelize, loadMockData
}
