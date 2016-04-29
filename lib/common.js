'use strict';

const _      = require('lodash');
const Router = require('koa-router');
const debug  = require('debug');

const getPackages = () => {
  return {
    _, debug, Router,
  }
}

module.exports = getPackages();

