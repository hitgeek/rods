#rods
a micro SQL ORM using knex

```
npm install [pg, mysql, mariasql, sqlite3]
npm install knex
npm install rods
```

###Connecting via knex
see knex documentation for complete list of connection options
```js
var knex = require('knex')({
   client: 'pg',
   connection: {
      host: '',
      username: '',
      password: ''
   }
})
var rods = require('rods')(knex)
```

###Mapping Tables
```js

var db = {};

//map tables using the table name
//tables should already exists
//see knex documentation for Schema Building and Migrations
db.user = rods.table('users');
```

###Create Models
ORM does not check if object properties are valid. If invalid object properties do not match DB properties an error is thrown
```js

var u = new db.user({
  id: id, // <optional> depending on DB settings, id will be returned after save, if not set
  username: 'admin',
  password: 'ha$hedp@ssw0rd',
  admin: false;
});

u.save(function(err, res) {
//res is the newly created DB record. id should be there if not set;
});
```

###Retreving Models
`.get()` returns a single model, `.fetch()` returns multiple models
```js

db.user.get(1, function(err, u) {
  u.admin = true;
  u.save(function(err) {
    
  });
});
db.user.get('id-if-it-is-a-string', function(err, u) {});
db.user.get({id: 'value', function(err, u) {});

db.user.fetch([1, 2, 3], function(err, users) {

});

db.user.fetch(['id-1', 'id-2', 'id-3'], function(err, users) {});
db.user.fetch({admin: true}, function(err, users) {});
```

###Bridge to knex
Use any features of knex with `.first()` and `.select()`. Just end the chain with `.exec()`
```js

db.user
  .first()
  .join('user_groups', 'users.id', 'user_groups.user_id')
  .join('groups', 'user_groups.group_id', 'groups.id')
  .where('groups.name' '=', 'Administrators')
  .exec(function(err, u) { 
    //returns 1 user
  });

db.user
  .select()
  .join('user_groups', 'users.id', 'user_groups.user_id')
  .join('groups', 'user_groups.group_id', 'groups.id')
  .where('groups.name' '=', 'Administrators')
  .exec(function(err, users) { 
    //returns multiple users
  });

```

###Hooks
hooks run before and after save. useful for history tracking, or settings common properties like 'modified_by'

```js
//GLOBAL HOOKS
var rods = require('rods')(knex)

rods.pre('save', function(args, data) {
  //args is an optional argument before the callback in .save()
  //pre hooks must be synchronous
  console.log('pre save with args ' + args);
  data.modified_by = args.id;
  data.modified_at = Date.now();
})

rods.post('save', function(args, original, updated) {
  //args is same as above
  //original and updated are what you expect
  //post hooks are fire and forget. .save will return before post hooks finish
  console.log('post hook');
  var userWhoMadeTheChange = args;
  trackTheseChangesSomewhere(userWhoMadeTheChange, original, updated)
})

//TABLE HOOKS

//***TABLE HOOKS OVERRIDE GLOBALS HOOKS***//
//only 1 hook will work
db.user = rods.table('users');
db.user.pre('save', preSave);
db.user.post('save', postSave);

var u = new db.user();
u.save(args, function(err) {
  //these are the args passed to hooks
});

```

###Options

1. id: ORM requires each table have 1 single column primary key. It assumes that primary key is named 'id'. You can change this, globally or for a single table.
```js
//my ids are named "ID"
var rods = require('rods')(knex, {
  id: 'ID'
});

//this table username is the primary key
db.user = rods.table('users', {
  id: 'username'
});


```


