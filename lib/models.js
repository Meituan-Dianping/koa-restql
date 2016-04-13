'use strict';

const fs        = require('fs');
const path      = require('path');
const Sequelize = require('sequelize');
const debug     = require('debug')('kr:models');

const _loadModels = (models, modelsPath) => {

  models = models || {};

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
    
    let schema       = require(modelPath)
      , name         = filename.match(validNameRegex)[1]
      , options      = schema.options
      , attributes   = schema.attributes;

    models[name] = {
      name, attributes, options,
    }
  });
}

module.exports.loadModels = (modelsPath) => {

  let models = {};
  _loadModels(models, modelsPath);

  return models;
}
