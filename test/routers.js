'use strict';

const models  = require('../lib/models');
const routers = require('../lib/routers');
const common  = require('./common');

const assert        = common.assert;
const Router        = common.Router;
const RoutersConfig = common.RoutersConfig;
const debug         = common.debug('kr:test:routers');

const checkMountCondition = routers.checkMountCondition;
const loadModels = models.load;
const loadRouter = routers.load;

const checkRouter = (router, path, method) => {

  if (!router.stack) {
    debug(router.stack);
  }

  let stack = router.stack;
  method = method.toUpperCase();

  if (method.toUpperCase() === 'DEL') 
    method = 'DELETE';

  debug(path);
  debug(method);

  for (let i = 0; i < stack.length; i ++) {
    let layer = stack[i];
    if (layer.regexp.test(path) && layer.methods.indexOf(method) !== -1)
      return layer;
  }

  return false;
}

const checkResourceRouter = (router, path, models, model, opts) => {
  
  opts = opts || {};

  RoutersConfig.methods.forEach(method => {
    if (checkMountCondition(method, opts)) {
      let mountedPath = String.raw`${path}${method.path}`;
      mountedPath = mountedPath.replace(/(\:id|\:\w+_id)/, 1);      
      assert(checkRouter(router, mountedPath, method.name));
    }
  })

  let associations = model.associations;
  if (opts.isAssociation || !model.associations)
    return; 
  
  Object.keys(model.associations).forEach(key => {
    let association         = model.associations[key]
      , targetName          = association.target.name
      , isSingleAssociation = association.isSingleAssociation
      , associationModel    = models[targetName]
      , associationPath     = `:${model.name}_id/${association.as}`;

    let opts = {
      isAssociation: true,
      isSingleAssociation,  
    }
    
    checkResourceRouter(router, `${path}/${associationPath}`, models, associationModel, opts);
  })
}

describe('loadRouter (models -> router)', function () {
  describe ('checkMountCondition (method, opts -> boolean)', function () {
    it ('should return true', function () {
      assert(checkMountCondition());
    })

    it ('should return true', function () {
      let isMounted = {
        association : true
      };
      assert(checkMountCondition({ isMounted }));
    })

    it ('should return true', function () {
      let isMounted = {
        association: true
      };
      let opts = {
        isAssociation: true
      };
      assert(checkMountCondition({ isMounted }, opts));
    })

    it ('should return false', function () {
      let isMounted = {
        associationOnly: true
      };
      assert(!checkMountCondition({ isMounted }));
    })

    it ('should return true', function () {
      let isMounted = {
        associationOnly: true
      };
      let opts = {
        isAssociation: true
      };
      assert(checkMountCondition({ isMounted }, opts));
    })

    it ('should return true', function () {
      let isMounted = {
        association: true
      };
      let opts = {
        isAssociation: true,
        isSingleAssociation: true
      };
      assert(checkMountCondition({ isMounted }, opts));
    })

    it ('should return true', function () {
      let isMounted = {
        association: true
      };
      let opts = {
        isAssociation: true,
      };
      assert(checkMountCondition({ isMounted }, opts));
    })

    it ('should return false', function () {
      let isMounted = {
        association: true,
        pluralResourceOnly: true
      };
      let opts = {
        isAssociation: true,
        isSingleAssociation: true
      };
      assert(!checkMountCondition({ isMounted }, opts));
    })

    it ('should return true', function () {
      let isMounted = {
        association: true,
        singleResourceOnly: true
      };
      let opts = {
        isAssociation: true
      };
      assert(!checkMountCondition({ isMounted }, opts));
    })

    it ('should return true', function () {
      let isMounted = {
        association: true,
        singleResourceOnly: true
      };
      let opts = {
        isAssociation: true,
        isSingleAssociation: true
      };
      assert(checkMountCondition({ isMounted }, opts));
    })

  })

  it ('should return a object', function () {

    let models = loadModels(common.sequelize)
      , router = loadRouter(new Router(), models, {})
      , stack  = router.stack;
      
    assert(stack.length > 0);
    debug(router);
      
    Object.keys(models).forEach(key => {
      let model = models[key]
        , path  = `${key}`
      checkResourceRouter(router, path, models, model);
    })
  })
})
