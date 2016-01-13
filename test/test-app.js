var chip = require('../index');

describe('App', function() {
  var app;

  beforeEach(function() {
    app = chip();
  });


  it('should provide event functions', function() {
    expect(app).to.have.a.property('dispatchEvent');
    expect(app.dispatchEvent).to.be.a('function');
    expect(app.on).to.be.a('function');
    expect(app.one).to.be.a('function');
    expect(app.off).to.be.a('function');
  });


  it('should have a default root element of <html>', function() {
    expect(app).to.have.a.property('rootElement', document.documentElement)
  });


  it('should create components', function() {
    app.component('my-test', {
      template: '<div id="my-test"></div>'
    });

    expect(app.fragments.binders.element['my-test']).to.not.be.null;
  });
});
