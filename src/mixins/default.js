
module.exports = function(app) {

  return {

    app: app,
    sync: app.sync,
    syncNow: app.syncNow,
    afterSync: app.afterSync,
    onSync: app.onSync,
    offSync: app.offSync,

    observe: function() {
      return this.watch.apply(this, arguments);
    }

  };
};
