'use strict';

const fs        = require('fs');
const path      = require('path');
const _         = require('lodash');
const debug     = require('debug');
const assert    = require('assert');
const config    = require('../config');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(config.database, {
  logging     : debug,
  underscored : true,
  underscoredAll : true,
  define: {
    paranoid    : true,
    underscored : true,
    freezeTableName : true,
    schemaDelimiter : '_',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
  },
});

const models = {};
const associationModels = [];

const _loadMockModels = (modelsPath) => {

  fs.readdirSync(modelsPath).forEach((filename) => {

    let modelPath      = path.resolve(modelsPath, filename)
      , stats          = fs.lstatSync(modelPath)
      , isDirectory    = stats.isDirectory()
      , validNameRegex = /^(.+)\.(js|json)/
      , isValidFile    = validNameRegex.test(filename) || isDirectory;

    // keep .js, .json or directory
    if (!isValidFile) return;

    // load model recursively
    if (isDirectory) {
      models[filename] = _loadModels(models, modelPath);
      return;
    }       
    
    let schema     = require(modelPath)
      , name       = filename.match(validNameRegex)[1]
      , options    = schema.options
      , attributes = schema.attributes(Sequelize)
      , model      = sequelize.define(name, attributes, options);

    models[name] = model;

    if ('associate' in model)
      associationModels.push(model);
  });
}

const loadMockModels = (modelsPath) => {

  _loadMockModels(modelsPath);
  associationModels.forEach(model => {
    model.associate(models);
  })
}

module.exports = {
  _,
  path, 
  debug, 
  assert,
  sequelize,
  Sequelize,
  loadMockModels, 
}
