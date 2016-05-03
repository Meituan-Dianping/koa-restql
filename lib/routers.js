'use strict';

const common        = require('./common');
const debug         = common.debug('koa-restql:routers');
const Router        = common.Router;
const RoutersConfig = common.RoutersConfig;

const global = {};

const checkMountCondition = (method, opts) => {

  opts   = opts || {};
  method = method || {};

  let isMounted           = method.isMounted || {}
    , isAssociation       = opts.isAssociation
    , isSingleAssociation = opts.isSingleAssociation;

  if (isAssociation) {
    if (!isMounted.association && !isMounted.associationOnly)
      return false;

    if (isMounted.singleResourceOnly && !isSingleAssociation)
      return false;

    if (isMounted.pluralResourceOnly && isSingleAssociation)
      return false;

  } else {
    if (isMounted.associationOnly)
      return false;
  }

  return true;
}

const createResourceRouters = (path, model, opts) => {
   
  opts = opts || {};

  let models = global.models || {}
    , router = global.router || {};

  RoutersConfig.methods.forEach(method => {
    let isMounted = checkMountCondition(method, opts);
    if (isMounted) {
      router[method.name](`${path}${method.path}`, method.fn(model));
    }
  })

  if (opts.isAssociation || !model.associations)
    return;

  Object.keys(model.associations).forEach(key => {
    let association         = model.associations[key]
      , targetName          = association.target.name
      , isSingleAssociation = association.isSingleAssociation
      , associationModel    = global.models[targetName]
      , associationPath     = `:${model.name}_id/${association.as}`;

    debug(`create ${model.name} association ${targetName} routers`);
    createResourceRouters(`${path}/${associationPath}`, associationModel, {
      isAssociation       : true,
      isSingleAssociation : association.isSingleAssociation
    });
  })
}

module.exports.load = (router, models, opts) => {

  global.models = models;
  global.router = router;

  Object.keys(models).forEach(key => {
    let model = models[key]
      , path  = `${key}`;
    createResourceRouters(path, model);
  })
  return router;
}

module.exports.checkMountCondition = checkMountCondition;
