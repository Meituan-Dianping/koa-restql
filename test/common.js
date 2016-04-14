'use strict';

const fs        = require('fs');
const path      = require('path');
const debug     = require('debug');
const Sequelize = require('sequelize');

const sequelize = Sequelize(config.database, {
  logging: debug,
  underscored: true,
  underscoredAll: true,
  define: {
    schemaDelimiter: '_',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    underscored: true,
    freezeTableName: true,
  },
});

const loadMockModels = (modelsPath) => {

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
    
    let schema     = require(modelPath)
      , name       = filename.match(validNameRegex)[1]
      , options    = schema.options
      , attributes = schema.attributes(Sequelize);

    sequelize.define(name, attributes, options);
  });
}

module.exports = {
  path, 
  debug, 
  sequelize,
  Sequelize,
  loadMockModels, 
}
