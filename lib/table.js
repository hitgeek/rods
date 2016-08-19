
var table = function(obj) {
  this._isNew = true;
  Object.assign(this, obj);
  this._original = Object.assign({}, this);
}

table.prototype.save = function(args, callback) {
  var self = this;
  var o    = Object.assign({}, self);
  var orig = this._original;
  var t    = self.constructor._table;
  var knex = self.constructor._knex;
  var id   = self.constructor._id;
  var pre  = self.constructor._pre['save'];
  var post = self.constructor._post['save'];

  delete o._original;

  if (typeof args == 'function') {
    callback = args;
    args = {};
  }

  if (pre) {
    pre.call(self, args, o);
  }

  delete o._isNew;
  if (self._isNew) {
    knex(t)
      .insert(o, [id])
      .asCallback(function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          self[id] = data[0][id];
          self._isNew = false;
          delete self._original;
          self._original = Object.assign({}, self);
          callback(null, self);
          if (post) {
            post.call(self, args, orig, o);
          }
        }
      });
  } else {
      var q = {}
      q[id] = self[id];
      knex(t)
        .where(q)
        .update(o)
        .asCallback(function(err) {
          if (err) {
            callback(err, null);
          } else {
            delete self._original;
            self._original = Object.assign({}, self);
            callback(null, self);
            if(post) {
              post.call(self, args, orig, o);
            }
          }
        });
  }
}

module.exports = table;
module.exports.new = function(name) {
  var self = this;

  var t = function(obj){
    self.call(this, obj);
  }
  t.prototype = Object.create(self.prototype);
  t.prototype.constructor = t;

  return t;
}