var assert = require('assert');
var fs     = require('fs');
var knex   = require('knex');
var rods   = require('../lib');

var db = {};
var u;

describe('rods', function() {

  before(function(done) {
    knex = knex({
      client: 'sqlite',
      connection: { filename: './test/db.sqlite' },
      useNullAsDefault: true
    });

    knex.schema.createTable('users', function (table) {
      table.increments();
      table.string('name');
      table.timestamps();
    }).then(function() {
      return knex.schema.createTable('groups', function (table) {
        table.increments();
        table.string('name');
        table.timestamps();
      });
    }).then(function() {
      return knex.schema.createTable('user_groups', function (table) {
        table.increments();
        table.string('user_id');
        table.string('group_id');
        table.timestamps();
      });
    }).then(function() {
      rods = rods(knex);
    }).then(function() {
      done();
    });


  });

  describe('.table()', function() {
    it('should create a table', function() {
      db.user       = rods.table('users');
      db.group      = rods.table('groups');
      db.user_group = rods.table('user_groups');
    });
  });
  describe('table', function() {
    describe('new', function() {
      it('should create a new user', function() {
        var u = new db.user({
          name: 'bob'
        });
        assert(u._isNew);
        assert.equal(u.name, 'bob');
      });
    });
    describe('.save()', function() {
      it('should save a user', function(done) {
        var u = new db.user({name: 'bob'});
        u.save(function(err) {
          assert.equal(null, err);
          done();
        });
      })
    });
    describe('.get()', function() {
      it('should get a user', function(done) {
        db.user.get(1, function(err, u) {
          assert.equal(null, err);
          assert.equal(u.name, 'bob');
          done();
        });
      });
    });
    describe('.fetch', function() {
      it('should fetch users', function(done) {
        var u2 = new db.user({name: 'steve'});
        u2.save(function(err) {
          db.user.fetch({}, function(err, data) {
            assert.equal(null, err);
            assert.equal(data.length, 2);
            done();
          });
        });
      });
    });
    describe('.first()', function() {
      it('should return 1 user using join', function(done) {
        var g = new db.group({name: 'admins'});
        g.save(function() {
          var ug = new db.user_group({user_id: 1, group_id: 1});
          ug.save(function() {
            db.user
                .first()
                .join('user_groups', 'users.id', '=', 'user_groups.user_id')
                .join('groups', 'user_groups.group_id', '=', 'groups.id')
                .exec(function(err, u) {
                  assert.equal(null, err);
                  assert.equal(u.name, 'bob');
                  done();
                });
          });
        });
      });
    });
    describe('.populate()', function() {
      it('should populate the model', function(done) {
        db.user_group
            .first()
            .populate('user_groups', db.user_group, function(x) {
              return {user_id: x.id};
            }, true)
            .populate('groups', db.group, function(x) {
              return x.user_groups.map(x => x.group_id);
            }, true)
            .exec(function(err, u) {
              assert.equal(u.groups[0].name, 'admins');
              done();
            });
      });
    });
  });

  after(function() {
    fs.unlinkSync('./test/db.sqlite');
  });

})


