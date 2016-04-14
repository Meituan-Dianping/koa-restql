'use strict';

const common = require('./common');
const debug  = common.debug('kr:models');

module.exports.load = (sequelize) => {

  let keys   = common._.keys(sequelize.models)
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
