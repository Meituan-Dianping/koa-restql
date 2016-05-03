'use strict'

const getResource = (model) => {
  return function * () {
    this.body = {
      name: 'get'
    }
    this.staus = 200;
  }
}

const postResource = (model) => {
  return function * () {
    this.body = {
      name: 'post'
    }
    this.staus = 201;
  }
}

const putResource = (model) => {
  return function * () {
    this.body = {
      name: 'put',
      id: this.params.id
    }
    this.staus = 200;
  }
}

const delResource = (model) => {
  return function * () {
    this.body = {
      name: 'del',
      id: this.params.id
    }
    this.staus = 200;
  }
}

module.exports = {
  methods : [{
    name : 'get',
    path : '/',
    fn   : getResource,
    isMounted : {
      association : true
    }
  }, {
    name : 'post',
    path : '/',
    fn   : postResource,
    isMounted : {
      association : true
    }
  }, {
    name : 'put',
    path : '/',
    fn   : putResource,
    isMounted : {
      associationOnly    : true,
      singleResourceOnly : true
    }
  }, {
    name : 'get',
    path : '/:id',
    fn   : getResource,
    isMounted : {
      association        : true,
      pluralResourceOnly : true
    }
  }, {
    name : 'put',
    path : '/:id',
    fn   : putResource,
    isMounted : {
      association        : true,
      pluralResourceOnly : true
    }
  }, {
    name : 'del',
    path : '/:id',
    fn   : delResource,
    isMounted : {
      association        : true,
      pluralResourceOnly : true
    }
  }]
}

