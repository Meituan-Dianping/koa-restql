'use strict'

const debug = require('debug')('koa-restql:common');

module.exports.getAssociationName = (association) => {

    let isSingular  = association.isSingleAssociation
      , name        = association.options.name;

    return isSingular ? name.singular : name.plural;
}
