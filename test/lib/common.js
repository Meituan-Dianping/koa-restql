'use strict';

const fs        = require('fs');
const qs        = require('qs');
const koa       = require('koa');
const util      = require('util');
const path      = require('path');
const http      = require('http');
const debug     = require('debug');
const assert    = require('assert');
const request   = require('supertest');
const Sequelize = require('sequelize');
const Router    = require('koa-router');

const mock      = require('../mock/data');
const methods   = require('../../lib/methods');

const database  = process.env.TEST_DB || "mysql://koa-restql-test:test@localhost/koa-restql-test#UT8";

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
  logging: debug('sequelize')
});

const models = {};
const associationModels = [];

const loadMockModels = (modelsPath, schema) => {

  let ret = {}
  fs.readdirSync(modelsPath).forEach(filename => {

    let modelPath      = path.resolve(modelsPath, filename)
      , stats          = fs.lstatSync(modelPath)
      , isDirectory    = stats.isDirectory()
      , validNameRegex = /^(.+)\.(js|json)/
      , isValidFile    = validNameRegex.test(filename) || isDirectory;

    // keep .js, .json or directory
    if (!isValidFile) return;

    // load model recursively
    if (isDirectory) {
      let schema = path.relative(__dirname + '../mock/models/', modelPath);
      schema = schema.match(/(\w+)$/);
      if (!schema)
        return;

      [ schema ] = schema;
      models[filename] = loadMockModels(modelPath, schema.replace('/','_'));
      return;
    }       

    let model      = require(modelPath)
      , name       = filename.match(validNameRegex)[1]
      , options    = model.options || {}
      , attributes = model.attributes(Sequelize);
    
    options.schema = schema;
    ret[name] = models[name] = sequelize.define(name, attributes, options);

    if ('associate' in models[name])
      associationModels.push(models[name]);

  });

  return ret;
}

const loadMockData = () => {
  let models   = sequelize.models
    , promises = [];

  return sequelize.sync({
    force: true
  }).then(() => {
    Object.keys(mock).forEach(key => {
      let data  = mock[key]
        , model = models[key];

      promises.push(Promise.all(data.map(
        row => model.create(row)
      )));
    })

    return Promise.all(promises);
  })
}

loadMockModels('test/mock/models');
associationModels.forEach(model => {
  model.associate(models);
})

module.exports = {
  qs,
  koa,
  path, 
  util,
  debug, 
  http, 
  assert,
  methods,
  sequelize,
  Sequelize,
  request,
  Router,
  loadMockData,
}
