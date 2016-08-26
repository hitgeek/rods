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

###Mapping Models
```js

var db = {};

//map models using the table name
//tables should already exists
//see knex documentation for Schema Building and Migrations
db.user = rods.model('users');
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

###Population
Population provides a convient syntax for populating foreign references with associated objects. Population does individual queries for each reference, so it may not be the most efficient option. 

Population must be used with `.first()` and `select()`

```.populate(to, from, with, multi)```

to: name of property to be assigned

from: the db.table object to get/fetch from

with: the query to use inside of get/fetch

multi: true/false (true=the property is an array) (optional defaults to false)

```js
//In this example user can have multiple groups. user_group is a cross reference table between user & group
//Notice how the results of the 1st populate are used in the second populate
db.user
   .first()
   .populate('user_groups', db.user_group, function(x) {
     return {user_id: x.id}; //query that will be used for db.user_group.fetch
   }, true)
   .populate('groups', db.group, function(x) {
     return x.user_groups.map(x => x.group_id); //query used for db.group.fetch
   }, true)
   .exec(function(err, u) {
     assert.equal(u.groups[0].name, 'admins');
     done();
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


