'use strict'

const qs    = require('qs');
const debug = require('debug')('koa-restql:common');

module.exports.getAssociationName = (association) => {
    let isSingular  = association.isSingleAssociation
      , name        = association.options.name;

    return isSingular ? name.singular : name.plural;
}

const unionAttributes = (_attributes, attributes) => {

  if (!_attributes || !Array.isArray(_attributes) || !_attributes.length)
    return;
  
  return _attributes.filter(attr => !!attributes[attr]);
}

const unionWhere = (_where, attributes) => {
  if (!_where || typeof _where !== 'object')
    return;

  let where;

  Object.keys(_where).forEach(key => {
    if (attributes[key]) {
      where = where || {};
      where[key] = _where[key];
    }
  })

  return where;
}

const unionOrder = (_order, attributes) => {
  if (!_order)
    return;

  if (Array.isArray(_order)) {
    if (!_order.length)
      return;

    return _order.filter(item => {
      if (!item)
        return false;
      
      let name;
      if (Array.isArray(item)) {
        name = item[0];
      } else if (typeof item === 'string'){
        name = item.split(' ')[0];
      }
      return name && !!attributes[name];
    }).map(item => {
      if (typeof item === 'string') {
        return item.split(' ');
      }
      return item;
    })
  } else if (typeof _order === 'string') {
    let order = _order.split(' ');
    if (attributes[order[0]]) {
      return [order];
    }   
  } 
}

module.exports.parseQuerystring = (querystring, model) => {
  let _order, _where, _attributes
    , attributes = model.attributes
    , query      = qs.parse(querystring);
  
  debug(query);

  _where      = unionWhere(query, attributes);
  _attributes = unionAttributes(query._attrs, attributes);
  _order      = unionOrder(query._order, attributes);

  debug(_where);
  debug(_attributes);
  debug(_order);

  return {
    _order      : _order,
    _where      : _where,
    _attributes : _attributes || Object.keys(model.attributes)
  };
}
