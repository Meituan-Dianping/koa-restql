'use strict';

const _     = require('lodash');
const debug = require('debug');

const getPackages = () => {
  return {
    _, debug,
  }
}

module.exports = getPackages();

