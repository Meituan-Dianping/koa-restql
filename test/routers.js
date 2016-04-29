'use strict';

const models  = require('../lib/models');
const routers = require('../lib/routers');
const common  = require('./common');

const _      = common._;
const assert = common.assert;
const Router = common.Router;
const debug  = common.debug('kr:test:routers');

const loadModels  = models.load;
const loadRouters = routers.load;

describe('loadRouters (models -> routers)', function () {

  it ('should return a object', function () {

    let models  = loadModels(common.sequelize)
      , router  = new Router()
      , routers = loadRouters(router, models, {})
      , stack   = router.stack;
      
      assert(stack.length > 0);
      debug(router);
  })
})
