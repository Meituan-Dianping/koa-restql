'use strict'

const koa  = require('koa')

const prepare = require('../test/lib/prepare')
const RestQL  = require('../lib/RestQL')

const models  = prepare.sequelize.models

const app = koa()
const restql = new RestQL(models)

app.use(restql.routes())
app.listen('3000', '0.0.0.0')
