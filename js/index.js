(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('./routers/shop_routes.coffee').start();



},{"./routers/shop_routes.coffee":20}],2:[function(require,module,exports){
;(function() {

var riot = require('riot/riot')
var flux_riot = { version: '0.2.0' }

'use strict'

flux_riot.BaseStore = (function() {

  var CHANGE_EVENT = 'STORE_CHANGE_EVENT'

  function BaseStore() {
    riot.observable(this)
  }

  BaseStore.prototype = {
    addChangeListener: function(callback) {
      this.on(CHANGE_EVENT, callback)
    },

    removeChangeListener: function(callback) {
      this.off(CHANGE_EVENT, callback)
    },

    emitChange: function() {
      this.trigger(CHANGE_EVENT)
    }
  }

  return BaseStore

})()

flux_riot.storeMixin = function(tag, store, callback) {

  tag.store = store

  tag.on('mount', function() {
    return store.addChangeListener(callback)
  })

  tag.on('unmount', function() {
    return store.removeChangeListener(callback)
  })

}

flux_riot.BaseRouter = (function() {

  var regexFuncs = []

  function regexTransfer(path) {
    var parts = path.split('/')
    var regexParts = []
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i]
      if (!(part && part.length > 0)) continue

      if (part[0] === ':') {
        regexParts.push('((?:(?!\\/).)+?)')
      } else {
        regexParts.push(part)
      }
    }
    return RegExp("^" + (regexParts.join('\\/')) + "\\/?$", "i")
  }

  function route(path) {
    if (regexFuncs.length === 0) return

    if (path === '') return regexFuncs[0][1].apply(null, [])

    for (var i = 1; i < regexFuncs.length; i++) {
      var regexFunc = regexFuncs[i]
      var m = path.match(regexFunc[0])
      if (m != null) return regexFunc[1].apply(null, m.slice(1))
    }
  }

  function routes() {
    if (!(arguments.length > 0)) return

    regexFuncs.push([ '', arguments[0] ])
    for (var i = 1; i < arguments.length; i += 2) {
      regex = regexTransfer(arguments[i])
      regexFuncs.push([ regex, arguments[i + 1] ])
    }
  }

  function start(r) {
    return riot.route.exec(r || route)
  }

  riot.route.parser(function(path) { return [path] })
  riot.route(route)

  return {
    routes: routes,
    start: start
  }

})()

flux_riot.Constants = {
  ActionSources: {
    SERVER_ACTION: 'SERVER_ACTION',
    VIEW_ACTION: 'VIEW_ACTION'
  }
}

var Dispatcher = require('flux').Dispatcher
var assign = require('object-assign')

flux_riot.Dispatcher = assign(new Dispatcher(), {
  handleServerAction: function(action) {
    return this.handleAction(action, flux_riot.Constants.ActionSources.SERVER_ACTION)
  },

  handleViewAction: function(action) {
    return this.handleAction(action, flux_riot.Constants.ActionSources.VIEW_ACTION)
  },

  handleAction: function(action, source) {
    return this.dispatch({
      source: source,
      action: action
    })
  }
})


module.exports = flux_riot

})();

},{"flux":3,"object-assign":7,"riot/riot":8}],3:[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher')

},{"./lib/Dispatcher":4}],4:[function(require,module,exports){
/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * @typechecks
 */

"use strict";

var invariant = require('./invariant');

var _lastID = 1;
var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *
 *         case 'city-update':
 *           FlightPriceStore.price =
 *             FlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

  function Dispatcher() {
    this.$Dispatcher_callbacks = {};
    this.$Dispatcher_isPending = {};
    this.$Dispatcher_isHandled = {};
    this.$Dispatcher_isDispatching = false;
    this.$Dispatcher_pendingPayload = null;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   *
   * @param {function} callback
   * @return {string}
   */
  Dispatcher.prototype.register=function(callback) {
    var id = _prefix + _lastID++;
    this.$Dispatcher_callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   *
   * @param {string} id
   */
  Dispatcher.prototype.unregister=function(id) {
    invariant(
      this.$Dispatcher_callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this.$Dispatcher_callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   *
   * @param {array<string>} ids
   */
  Dispatcher.prototype.waitFor=function(ids) {
    invariant(
      this.$Dispatcher_isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this.$Dispatcher_isPending[id]) {
        invariant(
          this.$Dispatcher_isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this.$Dispatcher_callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );
      this.$Dispatcher_invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   *
   * @param {object} payload
   */
  Dispatcher.prototype.dispatch=function(payload) {
    invariant(
      !this.$Dispatcher_isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );
    this.$Dispatcher_startDispatching(payload);
    try {
      for (var id in this.$Dispatcher_callbacks) {
        if (this.$Dispatcher_isPending[id]) {
          continue;
        }
        this.$Dispatcher_invokeCallback(id);
      }
    } finally {
      this.$Dispatcher_stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   *
   * @return {boolean}
   */
  Dispatcher.prototype.isDispatching=function() {
    return this.$Dispatcher_isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @param {string} id
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {
    this.$Dispatcher_isPending[id] = true;
    this.$Dispatcher_callbacks[id](this.$Dispatcher_pendingPayload);
    this.$Dispatcher_isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @param {object} payload
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {
    for (var id in this.$Dispatcher_callbacks) {
      this.$Dispatcher_isPending[id] = false;
      this.$Dispatcher_isHandled[id] = false;
    }
    this.$Dispatcher_pendingPayload = payload;
    this.$Dispatcher_isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {
    this.$Dispatcher_pendingPayload = null;
    this.$Dispatcher_isDispatching = false;
  };


module.exports = Dispatcher;

},{"./invariant":5}],5:[function(require,module,exports){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (false) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],6:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

"use strict";

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  if (!(obj instanceof Object && !Array.isArray(obj))) {
    throw new Error('keyMirror(...): Argument must be an object.');
  }
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

},{}],7:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			to[keys[i]] = from[keys[i]];
		}
	}

	return to;
};

},{}],8:[function(require,module,exports){
/* Riot v2.0.15, @license MIT, (c) 2015 Muut Inc. + contributors */

;(function(window) {
  // 'use strict' does not allow us to override the events properties https://github.com/muut/riotjs/blob/dev/lib/tag/update.js#L7-L10
  // it leads to the following error on firefox "setting a property that has only a getter"
  //'use strict'

  var riot = { version: 'v2.0.15', settings: {} },
      ieVersion = checkIE()

riot.observable = function(el) {

  el = el || {}

  var callbacks = {},
      _id = 0

  el.on = function(events, fn) {
    if (typeof fn == 'function') {
      fn._id = typeof fn._id == 'undefined' ? _id++ : fn._id

      events.replace(/\S+/g, function(name, pos) {
        (callbacks[name] = callbacks[name] || []).push(fn)
        fn.typed = pos > 0
      })
    }
    return el
  }

  el.off = function(events, fn) {
    if (events == '*') callbacks = {}
    else {
      events.replace(/\S+/g, function(name) {
        if (fn) {
          var arr = callbacks[name]
          for (var i = 0, cb; (cb = arr && arr[i]); ++i) {
            if (cb._id == fn._id) { arr.splice(i, 1); i-- }
          }
        } else {
          callbacks[name] = []
        }
      })
    }
    return el
  }

  // only single event supported
  el.one = function(name, fn) {
    function on() {
      el.off(name, on)
      fn.apply(el, arguments)
    }
    return el.on(name, on)
  }

  el.trigger = function(name) {
    var args = [].slice.call(arguments, 1),
        fns = callbacks[name] || []

    for (var i = 0, fn; (fn = fns[i]); ++i) {
      if (!fn.busy) {
        fn.busy = 1
        fn.apply(el, fn.typed ? [name].concat(args) : args)
        if (fns[i] !== fn) { i-- }
        fn.busy = 0
      }
    }

    if (callbacks.all && name != 'all') {
      el.trigger.apply(el, ['all', name].concat(args))
    }

    return el
  }

  return el

}
;(function(riot, evt, window) {

  // browsers only
  if (!window) return

  var loc = window.location,
      fns = riot.observable(),
      win = window,
      started = false,
      current

  function hash() {
    return loc.href.split('#')[1] || ''
  }

  function parser(path) {
    return path.split('/')
  }

  function emit(path) {
    if (path.type) path = hash()

    if (path != current) {
      fns.trigger.apply(null, ['H'].concat(parser(path)))
      current = path
    }
  }

  var r = riot.route = function(arg) {
    // string
    if (arg[0]) {
      loc.hash = arg
      emit(arg)

    // function
    } else {
      fns.on('H', arg)
    }
  }

  r.exec = function(fn) {
    fn.apply(null, parser(hash()))
  }

  r.parser = function(fn) {
    parser = fn
  }

  r.stop = function () {
    if (!started) return
    win.removeEventListener ? win.removeEventListener(evt, emit, false) : win.detachEvent('on' + evt, emit)
    fns.off('*')
    started = false
  }

  r.start = function () {
    if (started) return
    win.addEventListener ? win.addEventListener(evt, emit, false) : win.attachEvent('on' + evt, emit)
    started = true
  }

  // autostart the router
  r.start()

})(riot, 'hashchange', window)
/*

//// How it works?


Three ways:

1. Expressions: tmpl('{ value }', data).
   Returns the result of evaluated expression as a raw object.

2. Templates: tmpl('Hi { name } { surname }', data).
   Returns a string with evaluated expressions.

3. Filters: tmpl('{ show: !done, highlight: active }', data).
   Returns a space separated list of trueish keys (mainly
   used for setting html classes), e.g. "show highlight".


// Template examples

tmpl('{ title || "Untitled" }', data)
tmpl('Results are { results ? "ready" : "loading" }', data)
tmpl('Today is { new Date() }', data)
tmpl('{ message.length > 140 && "Message is too long" }', data)
tmpl('This item got { Math.round(rating) } stars', data)
tmpl('<h1>{ title }</h1>{ body }', data)


// Falsy expressions in templates

In templates (as opposed to single expressions) all falsy values
except zero (undefined/null/false) will default to empty string:

tmpl('{ undefined } - { false } - { null } - { 0 }', {})
// will return: " - - - 0"

*/


var brackets = (function(orig, s, b) {
  return function(x) {

    // make sure we use the current setting
    s = riot.settings.brackets || orig
    if (b != s) b = s.split(' ')

    // if regexp given, rewrite it with current brackets (only if differ from default)
    return x && x.test
      ? s == orig
        ? x : RegExp(x.source
                      .replace(/\{/g, b[0].replace(/(?=.)/g, '\\'))
                      .replace(/\}/g, b[1].replace(/(?=.)/g, '\\')),
                    x.global ? 'g' : '')

      // else, get specific bracket
      : b[x]

  }
})('{ }')


var tmpl = (function() {

  var cache = {},
      reVars = /(['"\/]).*?[^\\]\1|\.\w*|\w*:|\b(?:(?:new|typeof|in|instanceof) |(?:this|true|false|null|undefined)\b|function *\()|([a-z_$]\w*)/gi
              // [ 1               ][ 2  ][ 3 ][ 4                                                                                  ][ 5       ]
              // find variable names:
              // 1. skip quoted strings and regexps: "a b", 'a b', 'a \'b\'', /a b/
              // 2. skip object properties: .name
              // 3. skip object literals: name:
              // 4. skip javascript keywords
              // 5. match var name

  // build a template (or get it from cache), render with data
  return function(str, data) {
    return str && (cache[str] = cache[str] || tmpl(str))(data)
  }


  // create a template instance

  function tmpl(s, p) {

    // default template string to {}
    s = (s || (brackets(0) + brackets(1)))

      // temporarily convert \{ and \} to a non-character
      .replace(brackets(/\\{/g), '\uFFF0')
      .replace(brackets(/\\}/g), '\uFFF1')

    // split string to expression and non-expresion parts
    p = split(s, extract(s, brackets(/{/), brackets(/}/)))

    return new Function('d', 'return ' + (

      // is it a single expression or a template? i.e. {x} or <b>{x}</b>
      !p[0] && !p[2] && !p[3]

        // if expression, evaluate it
        ? expr(p[1])

        // if template, evaluate all expressions in it
        : '[' + p.map(function(s, i) {

            // is it an expression or a string (every second part is an expression)
          return i % 2

              // evaluate the expressions
              ? expr(s, true)

              // process string parts of the template:
              : '"' + s

                  // preserve new lines
                  .replace(/\n/g, '\\n')

                  // escape quotes
                  .replace(/"/g, '\\"')

                + '"'

        }).join(',') + '].join("")'
      )

      // bring escaped { and } back
      .replace(/\uFFF0/g, brackets(0))
      .replace(/\uFFF1/g, brackets(1))

    + ';')

  }


  // parse { ... } expression

  function expr(s, n) {
    s = s

      // convert new lines to spaces
      .replace(/\n/g, ' ')

      // trim whitespace, brackets, strip comments
      .replace(brackets(/^[{ ]+|[ }]+$|\/\*.+?\*\//g), '')

    // is it an object literal? i.e. { key : value }
    return /^\s*[\w- "']+ *:/.test(s)

      // if object literal, return trueish keys
      // e.g.: { show: isOpen(), done: item.done } -> "show done"
      ? '[' +

          // extract key:val pairs, ignoring any nested objects
          extract(s,

              // name part: name:, "name":, 'name':, name :
              /["' ]*[\w- ]+["' ]*:/,

              // expression part: everything upto a comma followed by a name (see above) or end of line
              /,(?=["' ]*[\w- ]+["' ]*:)|}|$/
              ).map(function(pair) {

                // get key, val parts
                return pair.replace(/^[ "']*(.+?)[ "']*: *(.+?),? *$/, function(_, k, v) {

                  // wrap all conditional parts to ignore errors
                  return v.replace(/[^&|=!><]+/g, wrap) + '?"' + k + '":"",'

                })

              }).join('')

        + '].join(" ").trim()'

      // if js expression, evaluate as javascript
      : wrap(s, n)

  }


  // execute js w/o breaking on errors or undefined vars

  function wrap(s, nonull) {
    s = s.trim()
    return !s ? '' : '(function(v){try{v='

        // prefix vars (name => data.name)
        + (s.replace(reVars, function(s, _, v) { return v ? '(d.'+v+'===undefined?'+(typeof window == 'undefined' ? 'global.' : 'window.')+v+':d.'+v+')' : s })

          // break the expression if its empty (resulting in undefined value)
          || 'x')

      + '}finally{return '

        // default to empty string for falsy values except zero
        + (nonull === true ? '!v&&v!==0?"":v' : 'v')

      + '}}).call(d)'
  }


  // split string by an array of substrings

  function split(str, substrings) {
    var parts = []
    substrings.map(function(sub, i) {

      // push matched expression and part before it
      i = str.indexOf(sub)
      parts.push(str.slice(0, i), sub)
      str = str.slice(i + sub.length)
    })

    // push the remaining part
    return parts.concat(str)
  }


  // match strings between opening and closing regexp, skipping any inner/nested matches

  function extract(str, open, close) {

    var start,
        level = 0,
        matches = [],
        re = new RegExp('('+open.source+')|('+close.source+')', 'g')

    str.replace(re, function(_, open, close, pos) {

      // if outer inner bracket, mark position
      if(!level && open) start = pos

      // in(de)crease bracket level
      level += open ? 1 : -1

      // if outer closing bracket, grab the match
      if(!level && close != null) matches.push(str.slice(start, pos+close.length))

    })

    return matches
  }

})()

// { key, i in items} -> { key, i, items }
function loopKeys(expr) {
  var ret = { val: expr },
      els = expr.split(/\s+in\s+/)

  if (els[1]) {
    ret.val = brackets(0) + els[1]
    els = els[0].slice(brackets(0).length).trim().split(/,\s*/)
    ret.key = els[0]
    ret.pos = els[1]
  }

  return ret
}

function mkitem(expr, key, val) {
  var item = {}
  item[expr.key] = key
  if (expr.pos) item[expr.pos] = val
  return item
}


/* Beware: heavy stuff */
function _each(dom, parent, expr) {

  remAttr(dom, 'each')

  var template = dom.outerHTML,
      prev = dom.previousSibling,
      root = dom.parentNode,
      rendered = [],
      tags = [],
      checksum

  expr = loopKeys(expr)

  function add(pos, item, tag) {
    rendered.splice(pos, 0, item)
    tags.splice(pos, 0, tag)
  }

  // clean template code
  parent.one('update', function() {
    root.removeChild(dom)

  }).one('premount', function() {
    if (root.stub) root = parent.root

  }).on('update', function() {

    var items = tmpl(expr.val, parent)
    if (!items) return

    // object loop. any changes cause full redraw
    if (!Array.isArray(items)) {
      var testsum = JSON.stringify(items)
      if (testsum == checksum) return
      checksum = testsum

      // clear old items
      each(tags, function(tag) { tag.unmount() })
      rendered = []
      tags = []

      items = Object.keys(items).map(function(key) {
        return mkitem(expr, key, items[key])
      })

    }

    // unmount redundant
    each(rendered, function(item) {
      if (item instanceof Object) {
        // skip existing items
        if (items.indexOf(item) > -1) {
          return
        }
      } else {
        // find all non-objects
        var newItems = arrFindEquals(items, item),
            oldItems = arrFindEquals(rendered, item)

        // if more or equal amount, no need to remove
        if (newItems.length >= oldItems.length) {
          return
        }
      }
      var pos = rendered.indexOf(item),
          tag = tags[pos]

      if (tag) {
        tag.unmount()
        rendered.splice(pos, 1)
        tags.splice(pos, 1)
        // to let "each" know that this item is removed
        return false
      }

    })

    // mount new / reorder
    var prevBase = [].indexOf.call(root.childNodes, prev) + 1
    each(items, function(item, i) {

      // start index search from position based on the current i
      var pos = items.indexOf(item, i),
          oldPos = rendered.indexOf(item, i)

      // if not found, search backwards from current i position
      pos < 0 && (pos = items.lastIndexOf(item, i))
      oldPos < 0 && (oldPos = rendered.lastIndexOf(item, i))

      if (!(item instanceof Object)) {
        // find all non-objects
        var newItems = arrFindEquals(items, item),
            oldItems = arrFindEquals(rendered, item)

        // if more, should mount one new
        if (newItems.length > oldItems.length) {
          oldPos = -1
        }
      }

      // mount new
      var nodes = root.childNodes
      if (oldPos < 0) {
        if (!checksum && expr.key) var _item = mkitem(expr, item, pos)

        var tag = new Tag({ tmpl: template }, {
          before: nodes[prevBase + pos],
          parent: parent,
          root: root,
          item: _item || item
        })

        tag.mount()

        add(pos, item, tag)
        return true
      }

      // change pos value
      if (expr.pos && tags[oldPos][expr.pos] != pos) {
        tags[oldPos].one('update', function(item) {
          item[expr.pos] = pos
        })
        tags[oldPos].update()
      }

      // reorder
      if (pos != oldPos) {
        root.insertBefore(nodes[prevBase + oldPos], nodes[prevBase + (pos > oldPos ? pos + 1 : pos)])
        return add(pos, rendered.splice(oldPos, 1)[0], tags.splice(oldPos, 1)[0])
      }

    })

    rendered = items.slice()

  })

}


function parseNamedElements(root, parent, childTags) {

  walk(root, function(dom) {
    if (dom.nodeType == 1) {
      if(dom.parentNode && dom.parentNode.isLoop) dom.isLoop = 1
      if(dom.getAttribute('each')) dom.isLoop = 1
      // custom child tag
      var child = getTag(dom)

      if (child && !dom.isLoop) {
        var tag = new Tag(child, { root: dom, parent: parent }, dom.innerHTML),
          tagName = child.name,
          ptag = parent,
          cachedTag

        while(!getTag(ptag.root)) {
          if(!ptag.parent) break
          ptag = ptag.parent
        }
        // fix for the parent attribute in the looped elements
        tag.parent = ptag

        cachedTag = ptag.tags[tagName]

        // if there are multiple children tags having the same name
        if (cachedTag) {
          // if the parent tags property is not yet an array
          // create it adding the first cached tag
          if (!Array.isArray(cachedTag))
            ptag.tags[tagName] = [cachedTag]
          // add the new nested tag to the array
          ptag.tags[tagName].push(tag)
        } else {
          ptag.tags[tagName] = tag
        }

        // empty the child node once we got its template
        // to avoid that its children get compiled multiple times
        dom.innerHTML = ''
        childTags.push(tag)
      }

      each(dom.attributes, function(attr) {
        if (/^(name|id)$/.test(attr.name)) parent[attr.value] = dom
      })
    }

  })

}

function parseExpressions(root, tag, expressions) {

  function addExpr(dom, val, extra) {
    if (val.indexOf(brackets(0)) >= 0) {
      var expr = { dom: dom, expr: val }
      expressions.push(extend(expr, extra))
    }
  }

  walk(root, function(dom) {
    var type = dom.nodeType

    // text node
    if (type == 3 && dom.parentNode.tagName != 'STYLE') addExpr(dom, dom.nodeValue)
    if (type != 1) return

    /* element */

    // loop
    var attr = dom.getAttribute('each')
    if (attr) { _each(dom, tag, attr); return false }

    // attribute expressions
    each(dom.attributes, function(attr) {
      var name = attr.name,
        bool = name.split('__')[1]

      addExpr(dom, attr.value, { attr: bool || name, bool: bool })
      if (bool) { remAttr(dom, name); return false }

    })

    // skip custom tags
    if (getTag(dom)) return false

  })

}
function Tag(impl, conf, innerHTML) {

  var self = riot.observable(this),
      opts = inherit(conf.opts) || {},
      dom = mkdom(impl.tmpl),
      parent = conf.parent,
      expressions = [],
      childTags = [],
      root = conf.root,
      item = conf.item,
      fn = impl.fn,
      tagName = root.tagName.toLowerCase(),
      attr = {},
      loopDom

  if (fn && root._tag) {
    root._tag.unmount(true)
  }
  // keep a reference to the tag just created
  // so we will be able to mount this tag multiple times
  root._tag = this

  // create a unique id to this tag
  // it could be handy to use it also to improve the virtual dom rendering speed
  this._id = ~~(new Date().getTime() * Math.random())

  extend(this, { parent: parent, root: root, opts: opts, tags: {} }, item)

  // grab attributes
  each(root.attributes, function(el) {
    attr[el.name] = el.value
  })


  if (dom.innerHTML && !/select/.test(tagName))
    // replace all the yield tags with the tag inner html
    dom.innerHTML = replaceYield(dom.innerHTML, innerHTML)


  // options
  function updateOpts() {
    each(Object.keys(attr), function(name) {
      opts[name] = tmpl(attr[name], parent || self)
    })
  }

  this.update = function(data, init) {
    extend(self, data, item)
    updateOpts()
    self.trigger('update', item)
    update(expressions, self, item)
    self.trigger('updated')
  }

  this.mount = function() {

    updateOpts()

    // initialiation
    fn && fn.call(self, opts)

    toggle(true)

    // parse layout after init. fn may calculate args for nested custom tags
    parseExpressions(dom, self, expressions)

    if (!self.parent) self.update()

    // internal use only, fixes #403
    self.trigger('premount')

    if (fn) {
      while (dom.firstChild) root.appendChild(dom.firstChild)

    } else {
      loopDom = dom.firstChild
      root.insertBefore(loopDom, conf.before || null) // null needed for IE8
    }

    if (root.stub) self.root = root = parent.root
    self.trigger('mount')

  }


  this.unmount = function(keepRootTag) {
    var el = fn ? root : loopDom,
        p = el.parentNode

    if (p) {

      if (parent) {
        // remove this tag from the parent tags object
        // if there are multiple nested tags with same name..
        // remove this element form the array
        if (Array.isArray(parent.tags[tagName])) {
          each(parent.tags[tagName], function(tag, i) {
            if (tag._id == self._id)
              parent.tags[tagName].splice(i, 1)
          })
        } else
          // otherwise just delete the tag instance
          delete parent.tags[tagName]
      } else {
        while (el.firstChild) el.removeChild(el.firstChild)
      }

      if (!keepRootTag)
        p.removeChild(el)

    }


    self.trigger('unmount')
    toggle()
    self.off('*')
    // somehow ie8 does not like `delete root._tag`
    root._tag = null

  }

  function toggle(isMount) {

    // mount/unmount children
    each(childTags, function(child) { child[isMount ? 'mount' : 'unmount']() })

    // listen/unlisten parent (events flow one way from parent to children)
    if (parent) {
      var evt = isMount ? 'on' : 'off'
      parent[evt]('update', self.update)[evt]('unmount', self.unmount)
    }
  }

  // named elements available for fn
  parseNamedElements(dom, this, childTags)


}

function setEventHandler(name, handler, dom, tag, item) {

  dom[name] = function(e) {

    // cross browser event fix
    e = e || window.event
    e.which = e.which || e.charCode || e.keyCode
    e.target = e.target || e.srcElement
    e.currentTarget = dom
    e.item = item

    // prevent default behaviour (by default)
    if (handler.call(tag, e) !== true && !/radio|check/.test(dom.type)) {
      e.preventDefault && e.preventDefault()
      e.returnValue = false
    }

    var el = item ? tag.parent : tag
    el.update()

  }

}

// used by if- attribute
function insertTo(root, node, before) {
  if (root) {
    root.insertBefore(before, node)
    root.removeChild(node)
  }
}

// item = currently looped item
function update(expressions, tag, item) {

  each(expressions, function(expr, i) {

    var dom = expr.dom,
        attrName = expr.attr,
        value = tmpl(expr.expr, tag),
        parent = expr.dom.parentNode

    if (value == null) value = ''

    // leave out riot- prefixes from strings inside textarea
    if (parent && parent.tagName == 'TEXTAREA') value = value.replace(/riot-/g, '')

    // no change
    if (expr.value === value) return
    expr.value = value

    // text node
    if (!attrName) return dom.nodeValue = value

    // remove original attribute
    remAttr(dom, attrName)

    // event handler
    if (typeof value == 'function') {
      setEventHandler(attrName, value, dom, tag, item)

    // if- conditional
    } else if (attrName == 'if') {
      var stub = expr.stub

      // add to DOM
      if (value) {
        stub && insertTo(stub.parentNode, stub, dom)

      // remove from DOM
      } else {
        stub = expr.stub = stub || document.createTextNode('')
        insertTo(dom.parentNode, dom, stub)
      }

    // show / hide
    } else if (/^(show|hide)$/.test(attrName)) {
      if (attrName == 'hide') value = !value
      dom.style.display = value ? '' : 'none'

    // field value
    } else if (attrName == 'value') {
      dom.value = value

    // <img src="{ expr }">
    } else if (attrName.slice(0, 5) == 'riot-') {
      attrName = attrName.slice(5)
      value ? dom.setAttribute(attrName, value) : remAttr(dom, attrName)

    } else {
      if (expr.bool) {
        dom[attrName] = value
        if (!value) return
        value = attrName
      }

      if (typeof value != 'object') dom.setAttribute(attrName, value)

    }

  })

}
function each(els, fn) {
  for (var i = 0, len = (els || []).length, el; i < len; i++) {
    el = els[i]
    // return false -> remove current item during loop
    if (el != null && fn(el, i) === false) i--
  }
  return els
}

function remAttr(dom, name) {
  dom.removeAttribute(name)
}

// max 2 from objects allowed
function extend(obj, from, from2) {
  from && each(Object.keys(from), function(key) {
    obj[key] = from[key]
  })
  return from2 ? extend(obj, from2) : obj
}

function checkIE() {
  if (window) {
    var ua = navigator.userAgent
    var msie = ua.indexOf('MSIE ')
    if (msie > 0) {
      return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10)
    }
    else {
      return 0
    }
  }
}

function optionInnerHTML(el, html) {
  var opt = document.createElement('option'),
      valRegx = /value=[\"'](.+?)[\"']/,
      selRegx = /selected=[\"'](.+?)[\"']/,
      valuesMatch = html.match(valRegx),
      selectedMatch = html.match(selRegx)

  opt.innerHTML = html

  if (valuesMatch) {
    opt.value = valuesMatch[1]
  }

  if (selectedMatch) {
    opt.setAttribute('riot-selected', selectedMatch[1])
  }

  el.appendChild(opt)
}

function mkdom(template) {
  var tagName = template.trim().slice(1, 3).toLowerCase(),
      rootTag = /td|th/.test(tagName) ? 'tr' : tagName == 'tr' ? 'tbody' : 'div',
      el = document.createElement(rootTag)

  el.stub = true

  if (tagName === 'op' && ieVersion && ieVersion < 10) {
    optionInnerHTML(el, template)
  } else {
    el.innerHTML = template
  }
  return el
}

function walk(dom, fn) {
  if (dom) {
    if (fn(dom) === false) walk(dom.nextSibling, fn)
    else {
      dom = dom.firstChild

      while (dom) {
        walk(dom, fn)
        dom = dom.nextSibling
      }
    }
  }
}

function replaceYield (tmpl, innerHTML) {
  return tmpl.replace(/<(yield)\/?>(<\/\1>)?/gim, innerHTML || '')
}

function $$(selector, ctx) {
  ctx = ctx || document
  return ctx.querySelectorAll(selector)
}

function arrDiff(arr1, arr2) {
  return arr1.filter(function(el) {
    return arr2.indexOf(el) < 0
  })
}

function arrFindEquals(arr, el) {
  return arr.filter(function (_el) {
    return _el === el
  })
}

function inherit(parent) {
  function Child() {}
  Child.prototype = parent
  return new Child()
}

/*
 Virtual dom is an array of custom tags on the document.
 Updates and unmounts propagate downwards from parent to children.
*/

var virtualDom = [],
    tagImpl = {}


function getTag(dom) {
  return tagImpl[dom.getAttribute('riot-tag') || dom.tagName.toLowerCase()]
}

function injectStyle(css) {
  var node = document.createElement('style')
  node.innerHTML = css
  document.head.appendChild(node)
}

function mountTo(root, tagName, opts) {
  var tag = tagImpl[tagName],
      innerHTML = root.innerHTML

  // clear the inner html
  root.innerHTML = ''

  if (tag && root) tag = new Tag(tag, { root: root, opts: opts }, innerHTML)

  if (tag && tag.mount) {
    tag.mount()
    virtualDom.push(tag)
    return tag.on('unmount', function() {
      virtualDom.splice(virtualDom.indexOf(tag), 1)
    })
  }

}

riot.tag = function(name, html, css, fn) {
  if (typeof css == 'function') fn = css
  else if (css) injectStyle(css)
  tagImpl[name] = { name: name, tmpl: html, fn: fn }
  return name
}

riot.mount = function(selector, tagName, opts) {

  var el,
      selctAllTags = function(sel) {
        sel = Object.keys(tagImpl).join(', ')
        sel.split(',').map(function(t) {
          sel += ', *[riot-tag="'+ t.trim() + '"]'
        })
        return sel
      },
      tags = []

  if (typeof tagName == 'object') { opts = tagName; tagName = 0 }

  // crawl the DOM to find the tag
  if(typeof selector == 'string') {
    if (selector == '*') {
      // select all the tags registered
      // and also the tags found with the riot-tag attribute set
      selector = selctAllTags(selector)
    }
    // or just the ones named like the selector
    el = $$(selector)
  }
  // probably you have passed already a tag or a NodeList
  else
    el = selector

  // select all the registered and mount them inside their root elements
  if (tagName == '*') {
    // get all custom tags
    tagName = selctAllTags(selector)
    // if the root el it's just a single tag
    if (el.tagName) {
      el = $$(tagName, el)
    } else {
      var nodeList = []
      // select all the children for all the different root elements
      each(el, function(tag) {
        nodeList = $$(tagName, tag)
      })
      el = nodeList
    }
    // get rid of the tagName
    tagName = 0
  }

  function push(root) {
    var name = tagName || root.getAttribute('riot-tag') || root.tagName.toLowerCase(),
        tag = mountTo(root, name, opts)

    if (tag) tags.push(tag)
  }

  // DOM node
  if (el.tagName)
    push(selector)
  // selector or NodeList
  else
    each(el, push)

  return tags

}

// update everything
riot.update = function() {
  return each(virtualDom, function(tag) {
    tag.update()
  })
}

// @deprecated
riot.mountTo = riot.mount



  // share methods for other riot parts, e.g. compiler
  riot.util = { brackets: brackets, tmpl: tmpl }

  // support CommonJS, AMD & browser
  if (typeof exports === 'object')
    module.exports = riot
  else if (typeof define === 'function' && define.amd)
    define(function() { return riot })
  else
    window.riot = riot

})(typeof window != 'undefined' ? window : undefined);

},{}],9:[function(require,module,exports){
var ActionTypes, dispatch;

dispatch = require('../dispatcher/dispatcher.coffee').dispatchViewAction;

ActionTypes = require('../constants/app_constants.coffee').ActionTypes;

module.exports = {
  add2Cart: function(product) {
    return dispatch(ActionTypes.SHOPPING_ADD_2_CART, product);
  },
  checkout: function() {
    return dispatch(ActionTypes.SHOPPING_CHECKOUT);
  }
};



},{"../constants/app_constants.coffee":17,"../dispatcher/dispatcher.coffee":18}],10:[function(require,module,exports){
var riot = require('riot');
require('./cart/cart.tag')
require('./product/shop.tag')
product_store = require('../stores/product_store.coffee')
var flux_riot = require('flux-riot')

riot.tag('app', '<div class="pure-g"> <div class="pure-u-1 pure-u-sm-3-5 list-grid"> <h1>flux-riot Shop Demo</h1> <div class="source"><a href="https://github.com/mingliangfeng/flux-riot-demo">source code</a></div> <shop></shop> </div> <div class="pure-u-1 pure-u-sm-2-5 cart-grid"> <cart></cart> </div> </div>', function(opts) {

});

},{"../stores/product_store.coffee":22,"./cart/cart.tag":11,"./product/shop.tag":16,"flux-riot":2,"riot":8}],11:[function(require,module,exports){
var riot = require('riot');
require('./item_list.tag')
var flux_riot = require('flux-riot')
Currencies = require('../../constants/app_constants.coffee').Currencies
var cart_store = require('../../stores/cart_store.coffee')

riot.tag('cart', '<div class="cart"> <h2>Your Cart</h2> <div class="uk-margin-small-bottom" if="{ !items.length }"> Please add some products to cart. </div> <item-list items="{ items }"></item-list> <div>Total: <span>{ Currencies.POUND }<strong>{ totalPrice() }</strong></span></div> <div class="text-right"> <button class="{ \'pure-button\': true, \'btn-checkout\': true, \'pure-button-disabled\': items.length <= 0}" onclick="{ checkout }">Checkout</button> </div> </div>', function(opts) {

  this.checkout = function() {
    riot.route('checkout')
  }.bind(this);

  this.totalPrice = function() {
    var totalPrice = 0.0
    this.items.forEach(function(item) {
      totalPrice += item.price * item.quantity
    })
    return totalPrice.toFixed(2)
  }.bind(this);

  this.getDataFromStore = function() {
    var all_items = cart_store.getAll()
    this.items = Object.keys(all_items).map(function(key) {
      return all_items[key]
    })
  }.bind(this);

  this.updateFromStore = function() {
    this.getDataFromStore()
    this.update()
  }.bind(this);

  flux_riot.storeMixin(this, cart_store, this.updateFromStore)

  this.getDataFromStore()

});

},{"../../constants/app_constants.coffee":17,"../../stores/cart_store.coffee":21,"./item_list.tag":12,"flux-riot":2,"riot":8}],12:[function(require,module,exports){
var riot = require('riot');
riot.tag('item-list', '<ul> <li each="{ opts.items }"> { title } - { Currencies.POUND }{ price } x { quantity } </li> </ul>', function(opts) {

});

},{"riot":8}],13:[function(require,module,exports){
var riot = require('riot');
require('./common/animation_dots.tag')
var shopping = require('../actions/shopping.coffee')

riot.tag('checkout', '<div class="checkout"> <h1>Checkout <strong>{ this.checkoutTime }</strong><animation-dots></animation-dots></h1> </div>', function(opts) {

  this.checkoutTime = 3

  this.checkout = function() {
    if (this.checkoutTime <= 0) {
      shopping.checkout()
      riot.route('#')
    } else {
      this.checkoutTime -= 1
      this.update()
      this.setTimer()
    }
  }.bind(this);

  this.setTimer = function() {
    this.timer = setTimeout(this.checkout, 1000)
  }.bind(this);

  this.clearTimer = function() {
    clearTimeout(this.timer)
  }.bind(this);

  this.on('mount', this.setTimer)
  this.on('unmount', this.clearTimer)

});

},{"../actions/shopping.coffee":9,"./common/animation_dots.tag":14,"riot":8}],14:[function(require,module,exports){
var riot = require('riot');
riot.tag('animation-dots', '<span>{ Array(dotsCount + 1).join(".") }</span>', function(opts) {

  this.dotsCount = 1
  this.timeout = opts.timeout || 200

  this.changeDots = function() {
    this.dotsCount = (this.dotsCount + 1) % 10
    this.setTimer()
    this.update()
  }.bind(this);

  this.setTimer = function() {
    this.timer = setTimeout(this.changeDots, this.timeout)
  }.bind(this);

  this.clearTimer = function() {
    clearTimeout(this.timer)
  }.bind(this);

  this.on('mount', this.setTimer)
  this.on('unmount', this.clearTimer)


});

},{"riot":8}],15:[function(require,module,exports){
var riot = require('riot');
Currencies = require('../../constants/app_constants.coffee').Currencies
var shopping = require('../../actions/shopping.coffee')

riot.tag('product-list', '<div> <div class="product" each="{ opts.items }"> <img class="product-img" riot-src="images/{ image }"></img> <div class="product-desc"> <h3>{ title } - { Currencies.POUND }{ price }</h3> <button class="{ \'pure-button\': true, \'pure-button-primary\': true, \'pure-button-disabled\': quantity <= 0}" onclick="{ parent.add2Cart }">{ quantity > 0 ? \'Add to cart\' : \'Sold out\'}</button> </div> <div class="clearfix"></div> </div> </div>', function(opts) {

  this.add2Cart = function(e) {
    if (e.item.quantity > 0) shopping.add2Cart(e.item)
  }.bind(this);

});

},{"../../actions/shopping.coffee":9,"../../constants/app_constants.coffee":17,"riot":8}],16:[function(require,module,exports){
var riot = require('riot');
require('./product_list.tag')
product_store = require('../../stores/product_store.coffee')
var flux_riot = require('flux-riot')

riot.tag('shop', '<product-list items="{ products }"></product-list>', function(opts) {

  this.getDataFromStore = function() {
    this.products = product_store.getAll()
  }.bind(this);

  this.updateFromStore = function() {
    this.getDataFromStore()
    this.update()
  }.bind(this);

  flux_riot.storeMixin(this, product_store, this.updateFromStore)

  this.getDataFromStore()


});

},{"../../stores/product_store.coffee":22,"./product_list.tag":15,"flux-riot":2,"riot":8}],17:[function(require,module,exports){
var keymirror;

keymirror = require('keymirror');

module.exports = {
  ActionTypes: keymirror({
    SHOPPING_ADD_2_CART: null,
    SHOPPING_CHECKOUT: null
  }),
  Currencies: {
    POUND: '€'
  }
};



},{"keymirror":6}],18:[function(require,module,exports){
var Dispatcher;

Dispatcher = require('flux-riot').Dispatcher;

module.exports = {
  dispatchViewAction: function(type, data) {
    return Dispatcher.handleViewAction({
      type: type,
      data: data
    });
  }
};



},{"flux-riot":2}],19:[function(require,module,exports){
var app_tag, mount, riot, unmount;

riot = require('riot/riot');

require('../components/app.tag');

require('../components/checkout.tag');

app_tag = null;

unmount = function() {
  if (app_tag) {
    return app_tag.unmount(true);
  }
};

mount = function(tag, opts) {
  return riot.mount('#app-container', tag, opts)[0];
};

module.exports = {
  showStore: function() {
    unmount();
    return app_tag = mount('app');
  },
  checkout: function() {
    unmount();
    return app_tag = mount('checkout');
  }
};



},{"../components/app.tag":10,"../components/checkout.tag":13,"riot/riot":8}],20:[function(require,module,exports){
var BaseRouter, riot, shop_presenter;

riot = require('riot/riot');

BaseRouter = require('flux-riot').BaseRouter;

shop_presenter = require('../presenters/shop_presenter.coffee');

BaseRouter.routes(shop_presenter.showStore, 'checkout', shop_presenter.checkout);

module.exports = {
  start: BaseRouter.start
};



},{"../presenters/shop_presenter.coffee":19,"flux-riot":2,"riot/riot":8}],21:[function(require,module,exports){
var API, ActionTypes, BaseStore, CartStore, Dispatcher, assign, _items;

assign = require('object-assign');

Dispatcher = require('flux-riot').Dispatcher;

ActionTypes = require('../constants/app_constants.coffee').ActionTypes;

BaseStore = require('flux-riot').BaseStore;

_items = {};

API = {
  getItems: function() {
    return _items;
  },
  clearItems: function() {
    return _items = {};
  }
};

CartStore = assign(new BaseStore(), {
  getAll: function() {
    return API.getItems();
  },
  clearCart: function() {
    return API.clearItems();
  },
  dispatchToken: Dispatcher.register(function(payload) {
    var action, all_items, product;
    action = payload.action;
    switch (action.type) {
      case ActionTypes.SHOPPING_ADD_2_CART:
        product = action.data;
        all_items = CartStore.getAll();
        if (product.id in all_items) {
          all_items[product.id].quantity += 1;
        } else {
          all_items[product.id] = {
            title: product.title,
            price: product.price,
            quantity: 1
          };
        }
        return CartStore.emitChange();
      case ActionTypes.SHOPPING_CHECKOUT:
        CartStore.clearCart();
        return CartStore.emitChange();
    }
  })
});

module.exports = CartStore;



},{"../constants/app_constants.coffee":17,"flux-riot":2,"object-assign":7}],22:[function(require,module,exports){
var API, ActionTypes, BaseStore, Dispatcher, ProductStore, assign, gid, _products;

assign = require('object-assign');

Dispatcher = require('flux-riot').Dispatcher;

ActionTypes = require('../constants/app_constants.coffee').ActionTypes;

BaseStore = require('flux-riot').BaseStore;

gid = 1;

_products = [];

API = {
  getProducts: function() {
    return _products;
  },
  initProducts: function() {
    return _products = [
      {
        id: gid++,
        title: 'iPad 4 Mini',
        image: 'ipad-mini.png',
        price: 500.01,
        quantity: 10
      }, {
        id: gid++,
        title: 'H&M T-Shirt White',
        image: 't-shirt.png',
        price: 10.99,
        quantity: 1
      }, {
        id: gid++,
        title: 'Charli XCX - Sucker CD',
        image: 'sucker.png',
        price: 19.99,
        quantity: 5
      }
    ];
  }
};

API.initProducts();

ProductStore = assign(new BaseStore(), {
  getAll: function() {
    return API.getProducts();
  },
  getProduct: function(id) {
    var product, _i, _len, _ref;
    _ref = ProductStore.getAll();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      product = _ref[_i];
      if (product.id === parseInt(id)) {
        return product;
      }
    }
  },
  dispatchToken: Dispatcher.register(function(payload) {
    var action, product;
    action = payload.action;
    switch (action.type) {
      case ActionTypes.SHOPPING_ADD_2_CART:
        product = action.data;
        product.quantity = product.quantity - 1;
        if (product.quantity <= 0) {
          return ProductStore.emitChange();
        }
        break;
      case ActionTypes.SHOPPING_CHECKOUT:
        return API.initProducts();
    }
  })
});

module.exports = ProductStore;



},{"../constants/app_constants.coffee":17,"flux-riot":2,"object-assign":7}]},{},[1]);
