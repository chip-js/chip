
module.exports = {
  curliesInAttributes: false,
  animateAttribute: '[animate]',

  binders: {
    '(keydown.*)': require('fragments-built-ins/binders/key-events')(null, 'keydown'),
    '(keyup.*)': require('fragments-built-ins/binders/key-events')(null, 'keyup'),
    '(enter)': require('fragments-built-ins/binders/key-events')('enter'),
    '(esc)': require('fragments-built-ins/binders/key-events')('esc'),
    '(*)': require('fragments-built-ins/binders/events')(),
    '{*}': require('fragments-built-ins/binders/properties')(),
    '*?': require('fragments-built-ins/binders/attribute-names')(),
    '[content]': require('fragments-built-ins/binders/component-content')(),
    '[show]': require('fragments-built-ins/binders/show')(false),
    '[hide]': require('fragments-built-ins/binders/show')(true),
    '[for]': require('fragments-built-ins/binders/repeat')('[by]'),
    '#*': require('fragments-built-ins/binders/ref')(),
    '[text]': require('fragments-built-ins/binders/text')(),
    '[html]': require('fragments-built-ins/binders/html')(),
    '[src]': require('fragments-built-ins/binders/properties')('src'),
    '[log]': require('fragments-built-ins/binders/log')(),
    '[class]': require('fragments-built-ins/binders/class')(),
    '[.*]': require('fragments-built-ins/binders/classes')(),
    '[style.*]': require('fragments-built-ins/binders/styles')(),
    '[autofocus]': require('fragments-built-ins/binders/autofocus')(),
    '[autoselect]': require('fragments-built-ins/binders/autoselect')(),
    '[name]': require('fragments-built-ins/binders/radio')('[value]'),
    '[value]': require('fragments-built-ins/binders/value')(
      '[value-events]',
      '[value-field]'
    ),
    '[component]': require('fragments-built-ins/binders/component')(function(componentName) {
      return this.fragments.app.component(componentName);
    }, '[unwrap]'),
    '[if]': require('fragments-built-ins/binders/if')('[else-if]', '[else]', '[unless]', '[unless-if]'),
    '[unless]': require('fragments-built-ins/binders/if')('[else-if]', '[else]', '[unless]', '[unless-if]'),
    '[route]': require('./binders/route')()
  },

  formatters: {
    addQuery: require('fragments-built-ins/formatters/add-query'),
    at: require('fragments-built-ins/formatters/at'),
    autolink: require('fragments-built-ins/formatters/autolink'),
    bool: require('fragments-built-ins/formatters/bool'),
    br: require('fragments-built-ins/formatters/br'),
    dateTime: require('fragments-built-ins/formatters/date-time'),
    date: require('fragments-built-ins/formatters/date'),
    escape: require('fragments-built-ins/formatters/escape'),
    filter: require('fragments-built-ins/formatters/filter'),
    first: require('fragments-built-ins/formatters/first'),
    float: require('fragments-built-ins/formatters/float'),
    format: require('fragments-built-ins/formatters/format'),
    int: require('fragments-built-ins/formatters/int'),
    json: require('fragments-built-ins/formatters/json'),
    keys: require('fragments-built-ins/formatters/keys'),
    last: require('fragments-built-ins/formatters/last'),
    limit: require('fragments-built-ins/formatters/limit'),
    log: require('fragments-built-ins/formatters/log'),
    lower: require('fragments-built-ins/formatters/lower'),
    map: require('fragments-built-ins/formatters/map'),
    newline: require('fragments-built-ins/formatters/newline'),
    p: require('fragments-built-ins/formatters/p'),
    reduce: require('fragments-built-ins/formatters/reduce'),
    reverse: require('fragments-built-ins/formatters/reverse'),
    slice: require('fragments-built-ins/formatters/slice'),
    sort: require('fragments-built-ins/formatters/sort'),
    time: require('fragments-built-ins/formatters/time'),
    upper: require('fragments-built-ins/formatters/upper'),
    values: require('fragments-built-ins/formatters/values')
  },

  animations: {
    'fade': require('fragments-built-ins/animations/fade')(),
    'slide': require('fragments-built-ins/animations/slide')(),
    'slide-h': require('fragments-built-ins/animations/slide-horizontal')(),
    'slide-move': require('fragments-built-ins/animations/slide-move')(),
    'slide-move-h': require('fragments-built-ins/animations/slide-move-horizontal')(),
    'slide-fade': require('fragments-built-ins/animations/slide-fade')(),
    'slide-fade-h': require('fragments-built-ins/animations/slide-fade-horizontal')()
  }

};
