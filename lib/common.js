'use strict';

const Router        = require('koa-router');
const Promise       = require('yaku');
const debug         = require('debug');
const RoutersConfig = require('./routersConfig');

const getPackages = () => {
  return {
    debug, Router, Promise, RoutersConfig
  }
}

module.exports = getPackages();

