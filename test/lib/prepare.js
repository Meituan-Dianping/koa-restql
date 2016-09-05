'use strict';

const fs        = require('fs')
const _         = require('lodash')
const util      = require('util')
const path      = require('path')
const uuid      = require('node-uuid')
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

const loadMockModels = (modelsPath, schema) => {

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

      loadMockModels(modelPath, filename)

    } else {
      let model = require(modelPath)
        , name  = filename.match(validNameRegex)[1]

      let {
        options = {}, attributes
      }= model;

      if (schema) {
        options.schema = schema
      }

      if ('function' !== typeof attributes) {
        throw new Error(`model ${name}'s attributes is not found`);
      }

      sequelize.define(name, attributes(Sequelize), options)
    }       
  })
}

const reset = () => {

  return sequelize.sync({

    logging : debug,
    force   : true

  })

}

const loadMockData = () => {

  let models   = sequelize.models
    , promises = []

  return sequelize.sync({

    logging : debug,
    force   : true

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

const models = sequelize.models;
Object.keys(models).forEach(key => {

  let model = models[key]

  if ('associate' in model) {
    model.associate(models)
  }

  debug(`model: ${model.name}, 
    associations: [${Object.keys(model.associations).join()}]`)
})

const createMockData = (model, attributes, count, defaultValues) => {

  const data = []

    for (let i = 0; i < count; i ++) {
      let row = {}
      attributes.forEach(attribute => row[attribute] = uuid())
        _.assign(row, defaultValues || {})
        data.push(row)
    }

  return model.bulkCreate(data)

}


module.exports = {
  sequelize, loadMockData, reset, createMockData
}
