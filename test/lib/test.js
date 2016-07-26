'use strict'

const assert  = require('assert')
const debug   = require('debug')('koa-restql:test:assert')

const assertObject = (data, expect) => {

  assert(data)
  assert(expect)

  const keys = Object.keys(expect)
  keys.forEach(key => {
    assert(data[key] !== undefined)
    assert(data[key] === expect[key])
  })

}

const assertModelById = (model, id, expect, done) => {
  
  assert(id)
  return model.findById(id).then(res => {
    assert(res)
    assertObject(res.dataValues, expect)
    if (done) done()
  })

}

const deleteObjcetTimestamps = (data) => {
  delete data.created_at
  delete data.updated_at
  delete data.deleted_at
}

module.exports.assertObject    = assertObject
module.exports.assertModelById = assertModelById
module.exports.deleteObjcetTimestamps = deleteObjcetTimestamps

