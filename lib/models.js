'use strict';

const common = require('./common');
const debug  = common.debug('koa-restql:models');

const parseAssociations = (srcAssociations) => {
  let targetAssociations = {};

  Object.keys(srcAssociations).forEach(key => {
    let association = srcAssociations[key]
      , source   = association.source
      , target   = association.target
      , as       = association.as
      , options  = association.options
      , associationType     = association.associationType
      , isSingleAssociation = association.isSingleAssociation;
    
    targetAssociations[key] = {
      source, target, as, isSingleAssociation, 
      associationType, options
    }
  })

  return targetAssociations;
}

module.exports.load = (sequelize, options) => {

  let keys   = Object.keys(sequelize.models)
    , models = {};

  keys.forEach(key => {

    let model        = sequelize.models[key]
      , name         = key
      , attributes   = model.attributes
      , associations = parseAssociations(model.associations);

    models[key] = {
      db: model,
      name, attributes, associations
    };
  })

  debug(models);
  return models;

}
