# koa-restql

[![Travis branch][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

Build **real** RESTful APIs without writing one line of code. Cool, right?

Now it works perfectly with MySQL.

[toc]

## Installation

```sh
npm install --save koa-restql
```

## Usage

```js
const koa       = require('koa')
const RestQL    = require('koa-restql')

let app = koa()
let restql = new RestQL(sequelize.models) // Build APIs from `sequelize.models`
app.use(restql.routes())
```

## How to request ***real*** RESTful APIs

### Basic

```
GET /user
```

If you just have one database table and sequelize model both named `user`, just choose [the right HTTP method][9] to visit path as exactly same name as it.

Using `querystring` in your url can add condition or limit for the request. For more details, read about [`querystring`][2].

### List

* Request

    ```
    GET /user
    ```

* Response

    ```
    HTTP/1.1 206 Partial Content
    X-Range:items 0-2/10
    ```

    ```
    [
      {
        "id": 1,
        "name": "Li Xin"
      },
      {
        "id": 2,
        "name": "Zhang Chi"
      }
    ]
    ```

    ***Note***:
    * Request for a list will always respond an array.
    * This response example include necessary HTTP headers to explain how `Partial Content` works. If the response was just part of the list, the API would like to response HTTP status code [206][1].

### Single

* Request

    ```
    GET /user/1
    ```

* Response

    ```
    {
      "id": 1,
      "name": "Li Xin"
    }
    ```

    ***Note***: Request path with id will always respond an object.

### Association

#### 1:1

To define an 1:1 association with sequelize, use [`model.hasOne()`][3] or [`model.belongsTo()`][4].

* Request

    ```
    GET /user/1/profile
    ```

* Response

    ```
    {
      "id": 1,
      "user_id": 1,
      "site": "https://github.com/crzidea"
    }
    ```
    ***Note***: This example is for `hasOne()`. If the `profile` was an association defined with `belongTo()`, there should not be `user_id` field.

#### 1:N

To define an 1:N association with sequelize, use [`model.belongsTo()`][5].

##### List

* Request

    ```
    GET /user/1/messages
    ```

* Response

    ```
    [
      {
        "id": 1,
        "content": "hello"
      },
      {
        "id": 2,
        "content": "world"
      }
    ]
    ```

##### Single

* Request

    ```
    GET /user/1/messages/2
    ```

* Response

    ```
    {
      "id": 2,
      "content": "world"
    }
    ```

#### N:M

To define an N:M association with sequelize, use [`model.belongsToMany()`][6].

Basicly, you can use the same way to request n:n association as [1:N association][7]. The difference is response.

* Request

    ```
    GET /user/1/friends/2
    ```

* Response

    ```
    {
      "id": 2,
      "name": "Zhang Chi",
      "friendship": {
        "id": 1,
        "user_id": 1,
        "friend_id": 2
      }
    }
    ```
    ***Note***: RestQL will respond the target model with another model referred `through` option.

Another noticeable problem is, you can not do the following query with association path although it is supported by sequelize:

```js
models.user.findAll(
  {
    include: models.user.association.friends
  }
)
```

But, fortunately, you can implement the query with `querystring` like this:

```
GET /user?_include%5B0%5D=friends
```

[Read more.][2]

### CRUD

RestQL could do all CRUD operations for you. Just choose the right HTTP method to access either the resource or the association path.

Supported HTTP verbs:

HTTP verb | CRUD          |
--------- | ------------- |
GET       | Read          |
POST      | Create        |
PUT       | Create/Update |
DELETE    | Delete        |


Supported HTTP method with body:

HTTP verb | List         | Single |
--------- | ------------ | ------ |
POST      | Array/Object | ×      |
PUT       | Array/Object | Object |


* `List` path examples:
    * `/resource`
    * `/resource/:id/association`, association is `1:n` relationship
    * `/resource/:id/association`, association is `n:m` relationship
* `Single` path examples:
    * `/resource/:id`
    * `/resource/:id/association`, association is `1:1` relationship
    * `/resource/:id/association/:id`, association is `1:n` relationship
    * `/resource/:id/association/:id`, association is `n:m` relationship

***Note***: `PUT` method must be used with `unique key(s)`, which means you can not use `PUT` method with a request body without an `unique key`.

To use `POST` or `PUT` method, you should put data into request body. Example:

```
POST /user

{
  "name": "Li Xin"
}
```

### querystring

It's strongly recommended that use [`qs`][8] to stringify nesting `querystring`s. And this document will assume you will use `qs` to stringify querystring from JavaScript object.

Example:

```js
qs.stringify({a: 1, b:2}) // => a=1&b=2
```

To understand RestQL querystring, there are only 3 rules:

* Every keys in querystring **not** start with `_`, will be directly used as `where` option for `sequelize#query()`. Example:

    ```js
    // query
    {
      name: "Li Xin"
    }
    // option for sequelize
    {
      where: {
        name: "Li Xin"
      }
    }
    ```

* Every keys in querystring start with `_`, will be directly used as `sequelize#query()`.

    ```js
    // query
    {
      _limit: 10
    }
    // option for sequelize
    {
      limit: 10
    }
    ```

* `include` option for `sequelize#query()` should be passed as `String` of association name.

    ```js
    // query
    {
      _include: ['friends']
    }
    // option for sequelize
    {
      include: [
        models.user.association.friends
      ]
    }
    ```

Sometimes, you want modify `query` in your own middleware. To do so, you should modify `this.restql.query` instead of `this.request.query` or `this.query`, because the `query` MUST be parsed with the package `qs`, not `querystring` (which is default package of koa).

### Access Control

There are at least 2 ways to implement the `Access Control`:

1. Add another middleware before request be handled by RestQL.
2. Add options on `sequelize#model#associations`, RestQL will handle the options.

This document will only talk about the 2nd way. And the option was only support with associations, not with models.

1. To specify which association should not be accessed by RestQL, add `ignore` option. Example:

    ```js
    models.user.hasOne(
      models.privacy,
      {
        restql: {
          ignore: true
        }
      }
    )
    ```

2. To specify an association should not be accessed by specific HTTP method, add the method to `ignore` as an array element. Example:

    ```js
    models.user.hasOne(
      models.privacy,
      {
        restql: {
          ignore: ['get']
        }
      }
    )
    ```

## Running tests

```sh
npm test
```

## License

MIT
[travis-image]: https://img.shields.io/travis/Meituan-Dianping/koa-restql/master.svg?maxAge=2592000
[travis-url]: https://travis-ci.org/Meituan-Dianping/koa-restql
[npm-image]: https://img.shields.io/npm/v/koa-restql.svg?maxAge=2592000
[npm-url]: https://www.npmjs.com/package/koa-restql
[1]: https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
[2]: #querystring
[3]: https://github.com/sequelize/sequelize/blob/master/docs/api/associations/has-one.md
[4]: https://github.com/sequelize/sequelize/blob/master/docs/api/associations/belongs-to.md
[5]: https://github.com/sequelize/sequelize/blob/master/docs/api/associations/has-many.md
[6]: https://github.com/sequelize/sequelize/blob/master/docs/api/associations/belongs-to-many.md
[7]: #1:N
[8]: https://github.com/ljharb/qs
[9]: #CRUD
