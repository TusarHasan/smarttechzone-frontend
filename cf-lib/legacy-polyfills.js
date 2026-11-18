/* পুরনো ব্রাউজারের (Chrome 49-60 ধরনের) জন্য ছোট polyfill। শুধু যেটা নেই সেটাই যোগ হয়; আধুনিক ব্রাউজারে এই ফাইল লোডই হয় না। ES5 সিনট্যাক্সে লেখা। */
(function () {
  'use strict';
  var w = window, O = Object, P = Promise, S = String.prototype, A = Array.prototype;
  function def(obj, name, fn) {
    if (!obj[name]) { try { O.defineProperty(obj, name, { value: fn, writable: true, configurable: true }); } catch (e) { obj[name] = fn; } }
  }
  def(O, 'entries', function (o) { var k = O.keys(o), i = k.length, r = new Array(i); while (i--) r[i] = [k[i], o[k[i]]]; return r; });
  def(O, 'values', function (o) { var k = O.keys(o), i = k.length, r = new Array(i); while (i--) r[i] = o[k[i]]; return r; });
  def(O, 'fromEntries', function (it) { var r = {}; for (var i = 0, a = A.slice.call(it); i < a.length; i++) r[a[i][0]] = a[i][1]; return r; });
  def(S, 'padStart', function (n, f) { var s = String(this); n = n >> 0; f = f === undefined ? ' ' : String(f); if (s.length >= n || !f) return s; var p = ''; while (p.length < n - s.length) p += f; return p.slice(0, n - s.length) + s; });
  def(S, 'padEnd', function (n, f) { var s = String(this); n = n >> 0; f = f === undefined ? ' ' : String(f); if (s.length >= n || !f) return s; var p = ''; while (p.length < n - s.length) p += f; return s + p.slice(0, n - s.length); });
  def(S, 'trimStart', function () { return String(this).replace(/^\s+/, ''); });
  def(S, 'trimEnd', function () { return String(this).replace(/\s+$/, ''); });
  def(S, 'replaceAll', function (a, b) { return a instanceof RegExp ? String(this).replace(a, b) : String(this).split(String(a)).join(b); });
  def(A, 'flat', function (d) { d = d === undefined ? 1 : d; return (function f(a, d) { return a.reduce(function (r, x) { return r.concat(Array.isArray(x) && d > 0 ? f(x, d - 1) : [x]); }, []); })(this, d); });
  def(A, 'flatMap', function (fn, t) { return this.map(fn, t).flat(1); });
  def(A, 'includes', function (x, i) { var a = O(this), n = a.length >>> 0; i = i | 0; if (i < 0) i = Math.max(n + i, 0); for (; i < n; i++) { if (a[i] === x || (x !== x && a[i] !== a[i])) return true; } return false; });
  if (P && P.prototype && !P.prototype['finally']) {
    P.prototype['finally'] = function (cb) {
      var C = this.constructor || P;
      return this.then(function (v) { return C.resolve(cb()).then(function () { return v; }); },
                       function (e) { return C.resolve(cb()).then(function () { throw e; }); });
    };
  }
  if (P && !P.allSettled) {
    P.allSettled = function (list) {
      return P.all(A.slice.call(list).map(function (p) {
        return P.resolve(p).then(function (v) { return { status: 'fulfilled', value: v }; }, function (e) { return { status: 'rejected', reason: e }; });
      }));
    };
  }
  /* DOM */
  function toNode(x) { return typeof x === 'string' || typeof x === 'number' ? document.createTextNode(String(x)) : x; }
  function mix(args) { var f = document.createDocumentFragment(); for (var i = 0; i < args.length; i++) f.appendChild(toNode(args[i])); return f; }
  [w.Element && Element.prototype, w.Document && Document.prototype, w.DocumentFragment && DocumentFragment.prototype].forEach(function (p) {
    if (!p) return;
    def(p, 'append', function () { this.appendChild(mix(arguments)); });
    def(p, 'prepend', function () { this.insertBefore(mix(arguments), this.firstChild); });
  });
  [w.Element && Element.prototype, w.CharacterData && CharacterData.prototype].forEach(function (p) {
    if (!p) return;
    def(p, 'before', function () { if (this.parentNode) this.parentNode.insertBefore(mix(arguments), this); });
    def(p, 'after', function () { if (this.parentNode) this.parentNode.insertBefore(mix(arguments), this.nextSibling); });
    def(p, 'replaceWith', function () { if (this.parentNode) this.parentNode.replaceChild(mix(arguments), this); });
    def(p, 'remove', function () { if (this.parentNode) this.parentNode.removeChild(this); });
  });
  if (w.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = A.forEach;
  if (w.HTMLCollection && !HTMLCollection.prototype.forEach) { try { HTMLCollection.prototype.forEach = A.forEach; } catch (e) {} }
  if (w.Element && !Element.prototype.matches) Element.prototype.matches = Element.prototype.webkitMatchesSelector || Element.prototype.msMatchesSelector;
  if (w.Element && !Element.prototype.closest) Element.prototype.closest = function (s) { var e = this; while (e && e.nodeType === 1) { if (e.matches(s)) return e; e = e.parentElement; } return null; };
  /* AbortController: fetch সত্যিই থামাতে পারে না, কিন্তু কোড যেন না ভাঙে (signal/abort ইভেন্ট ঠিক থাকে) */
  if (!w.AbortController) {
    var AS = function () { this.aborted = false; this._l = []; this.onabort = null; };
    AS.prototype.addEventListener = function (t, f) { if (t === 'abort') this._l.push(f); };
    AS.prototype.removeEventListener = function (t, f) { var i = this._l.indexOf(f); if (i > -1) this._l.splice(i, 1); };
    AS.prototype.dispatchEvent = function (e) { if (typeof this.onabort === 'function') this.onabort(e); this._l.slice().forEach(function (f) { f.call(this, e); }, this); return true; };
    w.AbortController = function () { this.signal = new AS(); };
    w.AbortController.prototype.abort = function () { if (this.signal.aborted) return; this.signal.aborted = true; this.signal.dispatchEvent({ type: 'abort', target: this.signal }); };
  }
  /* IntersectionObserver না থাকলে (Chrome < 51 / পুরনো WebView): সব এলিমেন্টকে সাথে সাথে "দৃশ্যমান" ধরে কলব্যাক দেয় */
  if (!w.IntersectionObserver) {
    w.IntersectionObserver = function (cb) { this._cb = cb; };
    w.IntersectionObserver.prototype.observe = function (el) { var s = this; setTimeout(function () { s._cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], s); }, 0); };
    w.IntersectionObserver.prototype.unobserve = w.IntersectionObserver.prototype.disconnect = function () {};
  }
  if (!w.requestIdleCallback) w.requestIdleCallback = function (f) { return setTimeout(function () { f({ didTimeout: false, timeRemaining: function () { return 10; } }); }, 1); };
  if (!w.CSS) w.CSS = {};
  if (!w.CSS.supports) w.CSS.supports = function () { return false; };
})();
