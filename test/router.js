'use strict';

const router = require('../lib/router');
const common = require('../lib/common');
const test   = require('./common');

const assert  = test.assert;
const Router  = test.Router;
const methods = test.methods;
const debug   = test.debug('koa-restql:test:router');

const loadRouter         = router.load;
const methodShouldMount  = router.methodShouldMount;

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
  
  let paths = [ path ];

  if (!association || !path.isSingular) {
    let id = !association ? ':id' : ':associationId';
    paths.push({ name: `${path.name}/${id}`, isSingular: true });
  }

  paths.forEach(path => {
    methods.forEach(method => {
      let pathName = path.name.slice().replace(/(\:id|\:associationId)/, 1);      
      if (methodShouldMount(path, method)) {
        assert(checkRoute(router, pathName, method.name));
      } else {
        assert(!checkRoute(router, pathName, method.name));
      }
    })
  })

  if (association || !model.associations)
    return; 

  Object.keys(model.associations).forEach(key => {

    let association = model.associations[key]
      , isSingular  = !! association.isSingleAssociation
      , pathName    = paths[1].name.slice();
    
    pathName += `/${common.getAssociationName(association)}`;
    checkModelRoutes(router, { name: pathName, isSingular }, models, model, association);
  })
}

describe ('loadRouter (models -> router)', function () {
  describe ('methodShouldMount (path, method) -> boolean', function () {
    it ('should return true', function () {
      assert(methodShouldMount({ isSingular: true }, {}));
    })  

    it ('should return true', function () {
      assert(methodShouldMount({ isSingular: true }, {}));
    })  

    it ('should return true', function () {
      assert(methodShouldMount({ isSingular: true }, { isSingular: true }));
    })  

    it ('should return true', function () {
      assert(methodShouldMount({ isSingular: false }, { isSingular: false }));
    })  

    it ('should return false', function () {
      assert(!methodShouldMount({ isSingular: true }, { isSingular: false }));
    })  

    it ('should return false', function () {
      assert(!methodShouldMount({ isSingular: false }, { isSingular: true }));
    })  

    it ('should return false', function () {
      assert(!methodShouldMount({ }, { isSingular: false }));
    })  

    it ('should return false', function () {
      assert(!methodShouldMount({ }, { isSingular: true }));
    })  
  })

  it ('should return a object', function () {

    let models = test.sequelize.models
      , router = loadRouter(models)
      , stack  = router.stack;
      
    assert(stack.length > 0);
    debug(router);
      
    Object.keys(models).forEach(key => {
      let model = models[key]
      , schema = model.options.schema
      , path   = `/${key}`;

      if (schema) {
        path = `/${schema}${path}`;
      }

      checkModelRoutes(router, { name: path, isSingular: false }, models, model);
    })
  })
})
