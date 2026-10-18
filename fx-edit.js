/* Case-study pages: the text is already on the page, and named agents revise it
   as you scroll. They fix typos, cut filler words, swap stiff wording for plain
   wording, retitle headings (three attempts each) and type in extra paragraphs.
   Nothing is authored: drafts are generated from the final Markdown text with a
   seeded RNG, so every page always ends on exactly the real text.
   Progress only moves forward, like the home page.                          */
(function () {
  var isCase = !!document.querySelector('.case');
  var art = document.querySelector('.case') || document.querySelector('main');
  if (!art) return;
  if ((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]nofx/.test(location.search)) return;

  var AG = [['Proofreader Agent', '#3b82f6'], ['Copywriter Agent', '#10b981'], ['Editor Agent', '#f59e0b'],
            ['Stylist Agent', '#8b5cf6'], ['Reviewer Agent', '#ec4899'], ['Fact-checker Agent', '#eab308']];
  var ARROW = '<svg class="ar" viewBox="0 0 16 16"><path d="M1.5 1.5l5.6 13 2.1-5.3 5.3-2.1z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var IBEAM = '<svg class="ib" viewBox="0 0 10 20"><path d="M2 1.5h6M5 1.5v17M2 18.5h6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>';
  var STIFF = { use: 'utilise', uses: 'utilises', used: 'utilised', help: 'facilitate', start: 'commence', show: 'demonstrate',
    make: 'construct', makes: 'constructs', build: 'engineer', quickly: 'expeditiously', also: 'additionally', need: 'require',
    needs: 'requires', about: 'approximately', give: 'provide', keep: 'maintain', check: 'verify', before: 'prior to', end: 'terminate' };
  var FILLER = ['really ', 'basically ', 'essentially ', 'simply ', 'quite '];
  var PLACEHOLDER = ['Untitled', 'Section', 'Overview', 'Notes', 'Details', 'Draft', 'TBD'];

  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function sm(a, b, x) { return ease(cl((x - a) / (b - a))); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var s = seed || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function typo(w, r) {
    for (var tries = 0; tries < 6; tries++) {
      var i = 1 + Math.floor(r() * (w.length - 3)), t = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
      if (t !== w) return t;
    }
    return w.slice(0, -1);
  }
  function matchCase(from, to) { return from[0] === from[0].toUpperCase() && from[0] !== from[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to; }

  function textNodes(root) {
    var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (w.nextNode()) {
      var n = w.currentNode;
      if (n.parentElement.closest('code,pre,a,.frame')) continue;
      if (n.nodeValue.trim()) out.push(n);
    }
    return out;
  }

  var layer = document.getElementById('cursors');
  var gx = document.querySelector('.gx'), gy = document.querySelector('.gy');
  var root = document.documentElement;
  var els = [].slice.call(art.querySelectorAll('h1,h2,h3,p:not(.conf),li'))
    .filter(function (el) { return isCase || el.tagName !== 'H1'; }); // on the home page the headline belongs to Retitle Agent
  var paraIx = 0, ord = 0;
  var SHARE = isCase ? .40 : .45; // only this share of blocks gets revised; the rest is left alone
  var gates = els.map(function (el, i) { return (Math.imul(hash(el.textContent + '#' + i) ^ 0x85ebca6b, 0xc2b2ae35) >>> 0) / 4294967296 < SHARE; });
  if (!els.some(function (el, i) { return gates[i] && /^H[123]$/.test(el.tagName); })) {
    var h2 = els.findIndex(function (el) { return el.tagName === 'H2'; });
    if (h2 > -1) gates[h2] = true; // always let at least one heading change
  }
  var vh0 = window.innerHeight;

  var units = els.map(function (el, i) {
    if (!gates[i]) return null;
    var u = { el: el, i: i, ag: AG[i % AG.length], ops: [], done: 0, peak: 0, st: -1 };
    var text = el.textContent, r = rng(hash(text) ^ (i * 2654435761 >>> 0));
    var isHead = /^H[123]$/.test(el.tagName);
    u.timed = el.getBoundingClientRect().top < vh0 * .85;
    if (u.timed) u.ord = ord++;
    el.style.position = 'relative';

    if (isHead) { // three wrong attempts at the title, then the right one
      var final = text.trim(), a = PLACEHOLDER[Math.floor(r() * PLACEHOLDER.length)];
      var b = PLACEHOLDER[Math.floor(r() * PLACEHOLDER.length)];
      if (b === a) b = PLACEHOLDER[(PLACEHOLDER.indexOf(a) + 1) % PLACEHOLDER.length];
      var seq = [a, b, final.length > 5 ? typo(final, r) : final + 's', final];
      el.textContent = '';
      var span = document.createElement('span');
      span.className = 'tk';
      span.textContent = seq[0];
      el.appendChild(span);
      for (var k = 0; k < 3; k++) u.ops.push({ el: span, kind: 'fix', from: seq[k], to: seq[k + 1] });
    } else if (isCase && el.tagName === 'P' && !el.classList.contains('sub') && ++paraIx % 3 === 0 && text.length > 90) {
      u.type = true; // this paragraph is typed in by an agent instead of revised
      u.chars = [];
      textNodes(el).forEach(function (n) {
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          var wsp = document.createElement('span'); wsp.className = 'w';
          for (var q = 0; q < tok.length; q++) { var c = document.createElement('span'); c.className = 'c'; c.textContent = tok[q]; wsp.appendChild(c); u.chars.push(c); }
          frag.appendChild(wsp);
        });
        n.parentNode.replaceChild(frag, n);
      });
      u.shown = 0;
      el.classList.add('ready');
    } else {
      var words = [];
      textNodes(el).forEach(function (n) {
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          var m = /^(\W*)([A-Za-z]{4,})(\W*)$/.exec(tok);
          if (!m) { frag.appendChild(document.createTextNode(tok)); return; }
          if (m[1]) frag.appendChild(document.createTextNode(m[1]));
          var sp = document.createElement('span'); sp.className = 'tk'; sp.textContent = m[2];
          frag.appendChild(sp); words.push(sp);
          if (m[3]) frag.appendChild(document.createTextNode(m[3]));
        });
        n.parentNode.replaceChild(frag, n);
      });
      var n = words.length, used = [];
      function pick() { for (var t = 0; t < 12; t++) { var w = words[Math.floor(r() * n)]; if (used.indexOf(w) < 0) { used.push(w); return w; } } return null; }
      // stiff wording that gets rewritten plainly
      for (var s = 0; s < n && u.ops.length < 1; s++) {
        var low = words[s].textContent.toLowerCase();
        if (STIFF[low]) { var orig = words[s].textContent; used.push(words[s]); u.ops.push({ el: words[s], kind: 'fix', from: matchCase(orig, STIFF[low]), to: orig }); }
      }
      var nTypo = n >= 3 ? 1 + (n >= 25 ? 1 : 0) + (n >= 50 ? 1 : 0) : 0;
      for (var t = 0; t < nTypo; t++) { var w = pick(); if (w) u.ops.push({ el: w, kind: 'fix', from: typo(w.textContent, r), to: w.textContent }); }
      var nFill = n >= 12 ? 1 + (n >= 40 ? 1 : 0) : 0;
      for (var f = 0; f < nFill; f++) {
        var anchor = pick(); if (!anchor) continue;
        var fl = document.createElement('span'); fl.className = 'fl'; fl.textContent = FILLER[Math.floor(r() * FILLER.length)];
        anchor.parentNode.insertBefore(fl, anchor);
        u.ops.push({ el: fl, kind: 'del' });
      }
      u.ops.sort(function (a, b) { return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1; });
      u.ops.forEach(function (o) { if (o.kind === 'fix') { o.el.textContent = o.from; o.el.classList.add('wr'); } });
    }

    if (isHead) u.ops[0].el.classList.add('wr');
    if (u.ops.length || u.type) {
      var fr = document.createElement('i'); fr.className = 'frame'; fr.setAttribute('aria-hidden', 'true');
      fr.style.setProperty('--ac', u.ag[1]); fr.style.setProperty('--fw', 1); fr.style.setProperty('--fh', 1);
      fr.innerHTML = '<b></b><b></b><b></b><b></b>';
      el.appendChild(fr); u.frame = fr;
      var c = document.createElement('div'); c.className = 'cur'; c.style.setProperty('--ac', u.ag[1]);
      c.innerHTML = ARROW + IBEAM + '<span>' + u.ag[0] + '</span>';
      layer.appendChild(c); u.cur = c;
    }
    el.style.opacity = 0;
    return u;
  }).filter(Boolean);

  function applyOp(u, o) {
    var el = o.el;
    el.style.setProperty('--ac', u.ag[1]);
    if (o.kind === 'fix') {
      el.textContent = o.to;
      var last = u.ops.filter(function (x) { return x.el === el; }).pop();
      el.classList.toggle('wr', o !== last);
    } else el.classList.add('rm');
    el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl');
  }

  function render(u, p, r, vw, vh) {
    var st = p >= 1 ? 2 : p > 0 ? 1 : 0;
    if (st !== 1 && u.st === st) return;
    u.st = st;
    u.el.style.opacity = u.type ? 1 : sm(0, .12, p);
    var n = u.ops.length, x, y, text = false;

    if (u.type) {
      var k = p >= 1 ? u.chars.length : Math.floor(cl((p - .2) / .75) * u.chars.length);
      if (k !== u.shown) {
        for (var a = Math.min(k, u.shown), b = Math.max(k, u.shown), j = a; j < b; j++) u.chars[j].classList.toggle('on', j < k);
        u.shown = k;
      }
      if (u.cur && st === 1) {
        if (k > 0) { var cr = u.chars[k - 1].getBoundingClientRect(); x = cr.right; y = cr.top; text = true; }
        else { x = r.left; y = r.top; }
      }
    } else if (n) {
      var q = cl((p - .18) / .77) * n, count = p >= 1 ? n : (q >= .6 ? Math.floor(q - .6) + 1 : 0);
      while (u.done < count) applyOp(u, u.ops[u.done++]);
      if (st === 1) {
        var cur = Math.min(Math.floor(q), n - 1), f = q - cur;
        var tr = u.ops[cur].el.getBoundingClientRect();
        var from = cur > 0 ? u.ops[cur - 1].el.getBoundingClientRect() : { left: r.left - 40, top: r.top - 30 };
        var e = ease(cl(f / .6));
        x = from.left + (tr.left - from.left) * e; y = from.top + (tr.top + tr.height * .5 - from.top) * e;
      }
    }

    if (u.frame) u.frame.style.opacity = st === 1 ? 1 : 0;
    if (u.cur) {
      if (st !== 1 || x == null) { u.cur.style.opacity = 0; u.cx = null; return; }
      u.cur.classList.toggle('text', text);
      u.cur.style.opacity = Math.min(1, p / .05) * Math.min(1, (1 - p) / .06);
      u.cur.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      u.cx = x; u.cy = y;
    }
  }

  var ticking = false, t0 = performance.now(), hold = false;
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  function update() {
    ticking = false;
    var vh = window.innerHeight, vw = window.innerWidth, sy = window.pageYOffset;
    var maxS = Math.max(0, document.documentElement.scrollHeight - vh);
    var bonus = cl(1 - (maxS - sy) / (vh * .5)) * vh * .45;
    var now = performance.now(), live = false, lead = null, more = false;
    var rects = units.map(function (u) { return u.el.getBoundingClientRect(); });
    units.forEach(function (u, k) {
      var p;
      if (u.timed && u.peak < 1 && sy < 60) {
        p = hold ? 0 : cl((now - t0 - 300 - u.ord * 500) / 2800);
        if (p < 1) more = true;
      } else p = cl((vh * .95 + bonus - rects[k].top) / (vh * .5));
      if (p < u.peak) p = u.peak;
      u.peak = p;
      render(u, p, rects[k], vw, vh);
      if (p > 0 && p < 1) { live = true; if (!lead && u.cx != null) lead = u; }
    });
    root.classList.toggle('live', live);
    if (lead) { gx.style.transform = 'translateX(' + lead.cx.toFixed(0) + 'px)'; gy.style.transform = 'translateY(' + lead.cy.toFixed(0) + 'px)'; }
    if (more) request();
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { units.forEach(function (u) { u.st = -1; }); request(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
  /* intro: a ring of agents, then the page appears and the revisions start */
  var intro = document.getElementById('intro');
  if (intro && root.classList.contains('intro') && window.pageYOffset < 40) {
    hold = true;
    var ring = intro.querySelector('.ring');
    for (var k = 0; k < 16; k++) {
      var c = document.createElement('div');
      c.className = 'cur';
      c.style.setProperty('--ac', AG[k % AG.length][1]);
      c.style.setProperty('--k', k);
      c.innerHTML = ARROW;
      ring.appendChild(c);
    }
    setTimeout(function () {
      intro.classList.add('out');
      setTimeout(function () { intro.remove(); hold = false; t0 = performance.now(); request(); }, 500);
    }, 1700);
  } else if (intro) intro.remove();

  request();
})();
