var async = require('async');
var table = require('./table');

var rods = function(knex, opts) {
  var self = this;
  this.knex    = knex;
  this._pre    = {};
  this._post   = {}

  if (!opts) opts = {}
  this._id = opts.id;

  this.pre = function(ev, func) {
    this._pre[ev] = func
  }

  this.post = function(ev, func) {
    this._post[ev] = func;
  }

  this.table = function(name, opts) {
    var t = table.new(name);
    t._table = name;
    t._knex   = knex;
    t.get    = get;
    t.fetch  = fetch;
    t.select  = select;
    t.first  = first;
    t._pre   = self._pre;
    t._post  = self._post;

    if (!opts) opts = {};
    t._id = opts.id || this._id || "id";

    return t;
  }

  function get(q, callback) {
    var self = this;

    if((typeof q) == 'string' || (typeof q) == 'number') {
      var id = q;
      q = {}
      q[self._id] = id;
    }

    knex.first()
        .from(self._table)
        .where(q)
        .asCallback(function(err, data) {
          if (err) {
            callback(err, null);
          } else {
            data._isNew = false;
            callback(null, new self(data));
          }
        });
  }

  function fetch(q, callback) {
    var self = this;

    var sql = knex.select().from(self._table)

    if((typeof q) == 'string' || (typeof q) == 'number') {
      var id = q;
      q = {}
      q[self._id] = id;
    }

    if (Array.isArray(q)) {
      sql.whereIn(self._id, q);
    } else {
      sql.where(q);
    }

    sql.asCallback(function(err, data) {
      if (err) {
        callback(err, null);
      } else {
        var objs = data.map(function(x) {
          x._isNew = false;
          return new self(x);
        })
        callback(null, objs);
      }
    });
  }

  function select() {
    var self = this;
    var ret = knex.select(elf._table + '.*').from(self._table);
    ret.__self = self;
    ret.__populate = [];
    ret.exec = exec;
    return ret;
  }

  function first() {
    var self = this;
    var ret = knex.first(self._table + '.*').from(self._table);
    ret.__self = self;
    ret.__populate = [];
    ret.exec = exec;
    ret.populate = populate;
    return ret;
  }

  function populate(_to, _from, _with, multi) {
    var m = multi || false;
    this.__populate.push({_to: _to, _from: _from, _with: _with, multi: m});
    return this;
  }

  function exec(callback) {
    var self = this;
    return this
            .asCallback(function(err, data) {
              if (err) {
                callback(err, null);
              } else {
                if (Array.isArray(data)) {
                  var objs = data.map(function(x) {
                    x._isNew = false;
                    return new self.__self(x);
                  })
                  callback(null, objs);
                } else {
                  data._isNew = false;
                  var obj = new self.__self(data);
                  _populate(obj, self.__populate, function(err) {
                    if (err) return callback(err);
                    callback(null, obj);
                  });
                }
              }
            });
  }

  function _populate(obj, populate, callback) {
    async.eachSeries(populate, function(x, cb) {
      if (x.multi) {
        x._from.fetch(x._with(obj), function(err, data) {
          if (err) return cb(err);
          obj[x._to] = data;
          cb();
        });
      } else {
        x._from.get(x._with(obj), function(err, data) {
          if (err) return cb(err);
          obj[x._to] = data;
          cb();
        });
      }
    }, function(err) {
      callback(err);
    });
  }

  return this;
}


module.exports = rods;
