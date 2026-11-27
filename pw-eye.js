/* পাসওয়ার্ড দেখান/লুকান: ফেসবুকের মতো (ফিল্ডের ডানে ভেতরে চোখের আইকন; লুকানো অবস্থায় কাটা-চোখ, দেখানো অবস্থায় খোলা চোখ)।
   পেজে এই ফাইল একবার যোগ করলেই সব input[type=password] এ বসে যায়, পরে তৈরি হওয়া ফিল্ডেও (পপআপ ইত্যাদি)। */
(function () {
  if (window.__stzPwEye) return;
  window.__stzPwEye = true;

  var EYE = '<path d="M1.5 12C1.5 12 5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3.2"/>';
  var SLASH = '<path d="M4 4l16 16"/>';
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON_HIDDEN = svg(EYE + SLASH); // পাসওয়ার্ড এখন লুকানো: কাটা চোখ
  var ICON_SHOWN = svg(EYE);          // পাসওয়ার্ড এখন দেখা যাচ্ছে: খোলা চোখ

  function bn() { return /^bn/i.test(document.documentElement.lang || ''); }
  function label(shown) {
    return bn() ? (shown ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান') : (shown ? 'Hide password' : 'Show password');
  }

  var css = document.createElement('style');
  css.textContent =
    '.pw-eye-wrap{position:relative;display:block;max-width:100%;box-sizing:border-box}' +
    '.pw-eye-wrap.pw-inline{display:inline-block;vertical-align:middle}' +
    '.pw-eye-wrap>input{padding-right:48px!important;box-sizing:border-box!important;width:100%!important;margin:0!important}' +
    '.pw-eye-wrap .pw-eye-btn{position:absolute!important;top:50%!important;right:6px!important;left:auto!important;bottom:auto!important;transform:translateY(-50%)!important;width:36px!important;height:36px!important;min-width:0!important;min-height:0!important;display:flex!important;align-items:center;justify-content:center;' +
    'background:transparent!important;border:0!important;padding:0!important;margin:0!important;cursor:pointer;color:#1c1e21!important;border-radius:50%!important;-webkit-tap-highlight-color:transparent;line-height:0;box-shadow:none!important;font-size:0!important;text-decoration:none!important}' +
    '.pw-eye-wrap .pw-eye-btn:hover{background:rgba(0,0,0,.06)!important}' +
    '.pw-eye-wrap .pw-eye-btn:focus-visible{outline:2px solid #1877f2;outline-offset:0}' +
    '.pw-eye-wrap .pw-eye-btn svg{width:24px!important;height:24px!important;display:block!important;pointer-events:none}' +
    '.pw-eye-old{display:none!important}' +
    'input[type=password]::-ms-reveal,input[type=password]::-ms-clear{display:none}';
  (document.head || document.documentElement).appendChild(css);

  // পেজে আগে থেকে থাকা পুরোনো টগল বাটন (👁️ ইত্যাদি) লুকিয়ে দিই, যাতে দুটো আইকন না দেখায়
  var OLD = '.pw-toggle,.password-toggle,.stzlp-eye,.toggle-password,.show-password,.eye-toggle,.pw-show';
  function hideOldToggles(input, parent) {
    var list;
    try { list = parent.querySelectorAll(OLD); } catch (e) { return; }
    var only = parent.querySelectorAll('input[type=password]').length === 1;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.classList.contains('pw-eye-btn')) continue;
      var ctl = b.getAttribute('aria-controls') || '';
      var oc = b.getAttribute('onclick') || '';
      var mine = only || (input.id && (ctl === input.id || oc.indexOf("'" + input.id + "'") > -1));
      if (mine) b.classList.add('pw-eye-old');
    }
  }

  function enhance(input) {
    if (input.__pwEye || !input.parentNode) return;
    if (input.closest && input.closest('.pw-eye-wrap')) return;
    input.__pwEye = true;

    var parent = input.parentNode;
    hideOldToggles(input, parent);
    var cs = getComputedStyle(input);
    var pcs = getComputedStyle(parent);
    var w = input.offsetWidth;
    var avail = parent.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0);
    var flexOrGrid = /flex|grid/.test(pcs.display);

    var wrap = document.createElement('span');
    wrap.className = 'pw-eye-wrap';
    wrap.style.margin = cs.margin;                   // মার্জিন বাইরের মোড়কে যায়, যাতে আইকন ফিল্ডের ঠিক মাঝখানে থাকে
    if (flexOrGrid) {
      wrap.style.flex = cs.flexGrow + ' ' + cs.flexShrink + ' ' + cs.flexBasis;
      wrap.style.gridColumn = cs.gridColumnStart + ' / ' + cs.gridColumnEnd;
      wrap.style.alignSelf = cs.alignSelf;
      wrap.style.order = cs.order;
      if (parseFloat(cs.flexGrow) === 0 && w) wrap.style.width = w + 'px';
    } else if (w && avail && w < avail - 3) {
      wrap.className += ' pw-inline';
      wrap.style.width = w + 'px';
    }

    parent.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-eye-btn';
    btn.innerHTML = ICON_HIDDEN;
    btn.title = btn.ariaLabel = label(false);
    btn.setAttribute('aria-label', label(false));
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); }); // ফিল্ডের ফোকাস না হারাতে
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      var pos = null;
      try { pos = [input.selectionStart, input.selectionEnd]; } catch (e) {}
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? ICON_SHOWN : ICON_HIDDEN;
      var l = label(show);
      btn.title = l; btn.setAttribute('aria-label', l);
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      input.focus();
      try { if (pos) input.setSelectionRange(pos[0], pos[1]); } catch (e) {}
    });
    wrap.appendChild(btn);
  }

  function scan(root) {
    var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('input[type=password]') : [];
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }

  function start() {
    scan(document);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('input[type=password]')) enhance(n);
          else if (n.querySelectorAll) scan(n);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
