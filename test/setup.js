'use strict';

const common = require('./common');

const debug  = common.debug('kr:test:setup');
const config = common.config;

before('setup', function () {

  let sequelize = common.sequelize;
  common.loadMockModels('./test/mockModels');

  debug('setup');
})
