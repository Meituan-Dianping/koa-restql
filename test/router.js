'use strict';

const router = require('../lib/router');
const common = require('./common');

const assert   = common.assert;
const Router   = common.Router;
const defaults = common.defaults;
const debug    = common.debug('kr:test:router');

const shouldMount = router.shouldMount;
const loadRouter  = router.load;

const checkRoute = (router, path, method) => {

  if (!router.stack) {
    debug(router.stack);
  }

  let stack = router.stack;
  method = method.toUpperCase();

  if (method.toUpperCase() === 'DEL') 
    method = 'DELETE';

  debug(method);
  debug(path);

  for (let i = 0; i < stack.length; i ++) {
    let layer = stack[i];
    if (layer.regexp.test(path) && layer.methods.indexOf(method) !== -1)
      return layer;
  }

  return false;
}

const checkModelRoutes = (router, path, models, model, association) => {
  
  defaults.methods.forEach(method => {
    if (shouldMount(method, association)) {

      let _path = String.raw`/${path}${method.path}`;
      _path = _path.replace(/(\:id|\:\w+_id)/, 1);      

      assert(checkRoute(router, _path, method.name));
    }
  })

  if (association || !model.associations)
    return; 
  
  Object.keys(model.associations).forEach(key => {
    let association = model.associations[key]
      , _path       = `${path}/:${model.name}_id/${association.as}`;

    checkModelRoutes(router, `${_path}`, models, model, association);
  })
}

describe ('loadRouter (models -> router)', function () {
  describe ('shouldMount (method, association -> boolean)', function () {
    it ('should return true', function () {
      assert(shouldMount());
    })

    it ('should return true', function () {
      let mount = {
        association : true
      };
      assert(shouldMount({ mount }));
    })

    it ('should return true', function () {
      let mount = {
        association: true
      };

      assert(shouldMount({ mount }, {}));
    })

    it ('should return false', function () {
      let mount = {
        associationOnly: true
      };
      assert(!shouldMount({ mount }));
    })

    it ('should return true', function () {
      let mount = {
        associationOnly: true
      };
      assert(shouldMount({ mount }, {}));
    })

    it ('should return true', function () {
      let mount = {
        association: true
      };
      let association = {
        isSingleAssociation: true
      };
      assert(shouldMount({ mount }, {}));
    })

    it ('should return true', function () {
      let mount = {
        association: true
      };
      assert(shouldMount({ mount }, {}));
    })

    it ('should return false', function () {
      let mount = {
        association: true,
        pluralModelOnly: true
      };
      let association = {
        isSingleAssociation: true
      };
      assert(!shouldMount({ mount }, association));
    })

    it ('should return true', function () {
      let mount = {
        association: true,
        singleModelOnly: true
      };
      assert(!shouldMount({ mount }, {}));
    })

    it ('should return true', function () {
      let mount = {
        association: true,
        singleModelOnly: true
      };
      let association = {
        isSingleAssociation: true
      };
      assert(shouldMount({ mount }, association));
    })

  })

  it ('should return a object', function () {

    let models = common.sequelize.models
      , router = loadRouter(models)
      , stack  = router.stack;
      
    assert(stack.length > 0);
    debug(router);
      
    Object.keys(models).forEach(key => {
      let model = models[key]
        , path  = `${key}`
      checkModelRoutes(router, path, models, model);
    })
  })
})
