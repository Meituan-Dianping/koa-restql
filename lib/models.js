'use strict';

const common = require('./common');
const debug  = common.debug('koa-restql:models');

module.exports.load = (sequelize, options) => {

  let keys   = Object.keys(sequelize.models)
    , models = {};

  keys.forEach(key => {

    let model        = sequelize.models[key]
      , name         = key
      , attributes   = model.attributes
      , associations = model.associations;

    models[key] = {
      name, attributes, associations, 
    };
  })

  return models;

}
