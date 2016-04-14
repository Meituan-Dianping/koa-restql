'use strict';

const models = require('../lib/models');
const common = require('./common');

const _      = common._;
const assert = common.assert;
const debug  = common.debug('kr:test:models');

const loadModels = models.load;

describe('loadModels (path -> models)', function () {

  it ('should return a object', function () {
    let models = loadModels(common.sequelize);

    let keys = _.keys(models);
    assert.equal(keys.length, 3);

    keys.forEach(key => {
      let model = models[key];
      debug(model);
      assert(_.isPlainObject(model));
      assert(_.isString(model.name));
      assert(_.isPlainObject(model.attributes));
      assert(_.isPlainObject(model.associations));
    })
  })
})
