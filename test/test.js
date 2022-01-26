var assert = require('assert');
var fs     = require('fs');
var knex   = require('knex');
var rods   = require('../lib');

var db = {};
var u;
var history = [];

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
    it('should create models', function() {
      db.user       = rods.model('users');
      db.group      = rods.model('groups');
      db.user_group = rods.model('user_groups');
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
    describe('.saveAsync()', async function() {
      it('should save a user', async function() {
        var u = await db.user.getAsync({name: 'bob'});
        assert.equal(u.name, 'bob');
        u.name = 'bob update';
        await u.saveAsync();
        var u = await db.user.getAsync(1);
        assert.equal(u.name, 'bob update');
        u.name = 'bob';
        await u.saveAsync();
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
    describe('.getAsync()', async function() {
      it('should get a user async', async function() {
        var u = await db.user.getAsync(1);
        assert.equal(u.name, 'bob');
      });
    });
    describe('.toObject', function() {
      it('should return the raw object', function(done) {
        db.user.get(1, function(err, u) {
          var o = u.toObject();
          assert.equal(o.id, 1);
          assert.equal(o.name, 'bob');
          assert.equal(o.created_at, null);
          assert.equal(o.updated_at, null);
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
    describe('.fetchAsync', async function() {
      it('should fetch users', async function() {
        var data = await db.user.fetchAsync({});
        assert.equal(data.length, 2);
      });
    })
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
    describe('.firstAsync()', async function() {
      it('should return 1 user using join', async function() {
        var g = new db.group({name: 'admins'});

        var u = await db.user
          .first()
          .join('user_groups', 'users.id', '=', 'user_groups.user_id')
          .join('groups', 'user_groups.group_id', '=', 'groups.id')
          .execAsync();

        assert.equal(u.name, 'bob');
      });
    });
    describe('.first()', function() {
      it('should not fail if nothing is returned', function(done) {
        db.user
            .first()
            .where({'users.id': 'thereisnotthisid'})
            .join('user_groups', 'users.id', '=', 'user_groups.user_id')
            .join('groups', 'user_groups.group_id', '=', 'groups.id')
            .exec(function(err, u) {
              assert.equal(null, err);
              assert.equal(null, u);
              done();
            });
      });
    })
    describe('.firstAsync()', async function() {
      it('should not fail if nothing is returned', async function() {
        var u = await db.user
            .first()
            .where({'users.id': 'thereisnotthisid'})
            .join('user_groups', 'users.id', '=', 'user_groups.user_id')
            .join('groups', 'user_groups.group_id', '=', 'groups.id')
            .execAsync();
        assert.equal(null, u);
      });
    })
    describe('hooks', function() {
      it('should add hooks', function(done) {
        rods.pre('save', function(args, data) {
          var timestamp = new Date();
          if (data._isNew) {
            data.created_at = timestamp;
          }
          data.updated_at = timestamp;
        });
        rods.post('save', function(args, orig, data) {
          history.push({original: orig, new: data});
        });

        var u = new db.user({name: 'john'});
        u.save(function(err) {
          assert(!err);
          db.user.get({name: 'john'}, function(err, x) {
            assert(!err);
            assert(x.created_at);
            assert(x.updated_at);
            assert(history.length == 1)
            done();
          });
        });
      });
    });
    describe('.populate()', function() {
      it('should populate the model', function(done) {
        db.user
            .first()
            .populate('user_groups', db.user_group.select(), function(x) {
              return ['user_id', x.id];
            })
            .populate('groups', db.group.select(), function(x) {
              return ['id', x.user_groups.map(x => x.group_id)];
            })
            .exec(function(err, u) {
              assert.equal(u.groups[0].name, 'admins');
              done();
            });
      });
    });
    describe('.populateAsync()', async function() {
      it('should populate the model', async function() {
        var u = await db.user
            .first()
            .populate('user_groups', db.user_group.select(), function(x) {
              return ['user_id', x.id];
            })
            .populate('groups', db.group.select(), function(x) {
              return ['id', x.user_groups.map(x => x.group_id)];
            })
            .execAsync();

        assert.equal(u.groups[0].name, 'admins');
      });
    });
    describe('.populate()', function() {
      it('should populate multiple models', function(done) {
        db.user
            .select()
            .populate('user_groups', db.user_group.select(), function(x) {
              return ['user_id', x.id];
            })
            .populate('groups', db.group.select(), function(x) {
              return ['id', x.user_groups.map(x => x.group_id)];
            })
            .exec(function(err, data) {
              assert.equal(data[0].groups[0].name, 'admins');
              done();
            });
      })
    })
    describe('.populateAsync ()', async function() {
      it('should populate multiple models', async function() {
       var data = await db.user
            .select()
            .populate('user_groups', db.user_group.select(), function(x) {
              return ['user_id', x.id];
            })
            .populate('groups', db.group.select(), function(x) {
              return ['id', x.user_groups.map(x => x.group_id)];
            })
            .execAsync();
          assert.equal(data[0].groups[0].name, 'admins');
      })
    })
  });

  after(function() {
    fs.unlinkSync('./test/db.sqlite');
  });

})


