'use strict';

const models = require('../lib/models');
const common = require('./common');

const assert = common.assert;
const debug  = common.debug('kr:test:models');

const loadModels = models.load;

describe('loadModels (path -> models)', function () {

  it ('should return a object', function () {
    let models = loadModels(common.sequelize);

    let keys = Object.keys(models);
    assert.equal(keys.length, 5);

    keys.forEach(key => {
      let model = models[key];
      debug(model);
      assert(typeof model === 'object');
      assert(typeof model.name === 'string');
      assert(typeof model.attributes === 'object');
      assert(typeof model.associations === 'object');
    })
  })
})
