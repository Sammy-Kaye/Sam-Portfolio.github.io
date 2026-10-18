/* "Agents build the page as you scroll."
   Every [data-b] element is a build unit. Its progress t (0..1) comes from its
   position in the viewport (or from time, for the hero), so scrolling back
   un-builds it. Phases of t:
     0.00-0.12  a named cursor flies in to the element's top-left corner
     0.12-0.35  it drags out a dashed selection frame
     0.35-1.00  the content appears: text is typed in, boxes fill, fades fade
   data-b="type"  text typed in character by character (plain text only)
   data-b="box"   container whose border/background fills in
   data-b="fade"  anything else that fades in
   data-quiet     no frame / cursor, just the fade
   data-intro     built on a timer at page load instead of by scroll        */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('fx')) return;

  var AG = [['Layout', '#3b82f6'], ['Copy', '#10b981'], ['Type', '#f59e0b'],
            ['Style', '#8b5cf6'], ['Review', '#ec4899'], ['Ship', '#eab308']];
  var ARROW = '<svg class="ar" viewBox="0 0 16 16"><path d="M1.5 1.5l5.6 13 2.1-5.3 5.3-2.1z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var IBEAM = '<svg class="ib" viewBox="0 0 10 20"><path d="M2 1.5h6M5 1.5v17M2 18.5h6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>';

  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function sm(a, b, x) { return ease(cl((x - a) / (b - a))); }

  var cursorLayer = document.getElementById('cursors');
  var guideX = document.querySelector('.gx');
  var guideY = document.querySelector('.gy');

  /* ---------- build units ---------- */
  var introCount = 0;
  var units = [].slice.call(document.querySelectorAll('[data-b]')).map(function (el, i) {
    var u = { el: el, i: i, kind: el.getAttribute('data-b'), ag: AG[i % AG.length], st: -1 };
    u.quiet = el.hasAttribute('data-quiet');
    u.intro = el.hasAttribute('data-intro');
    if (u.intro) u.ix = introCount++;
    if (u.kind === 'type') split(u);
    if (!u.quiet) { frame(u); cursor(u); }
    return u;
  });

  function split(u) {
    var el = u.el, txt = el.textContent.replace(/\s+$/, '');
    el.textContent = '';
    u.chars = [];
    txt.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(tok)); return; }
      var w = document.createElement('span');
      w.className = 'w';
      for (var k = 0; k < tok.length; k++) {
        var c = document.createElement('span');
        c.className = 'c';
        c.textContent = tok[k];
        w.appendChild(c);
        u.chars.push(c);
      }
      el.appendChild(w);
    });
    u.shown = 0;
    el.classList.add('ready');
  }

  function frame(u) {
    var f = document.createElement('i');
    f.className = 'frame';
    f.setAttribute('aria-hidden', 'true');
    f.style.setProperty('--ac', u.ag[1]);
    f.innerHTML = '<b></b><b></b><b></b><b></b>';
    u.el.appendChild(f);
    u.frame = f;
  }

  function cursor(u) {
    var c = document.createElement('div');
    c.className = 'cur';
    c.style.setProperty('--ac', u.ag[1]);
    c.innerHTML = ARROW + IBEAM + '<span>' + u.ag[0] + '</span>';
    cursorLayer.appendChild(c);
    u.cur = c;
  }

  /* ---------- apply one unit's state ---------- */
  function apply(u, t, r, vw, vh) {
    var st = t >= 1 ? 2 : t > 0 ? 1 : 0;
    if (st !== 1 && u.st === st) return;
    u.st = st;
    var el = u.el;

    if (u.kind === 'type') {
      var n = t >= 1 ? u.chars.length : Math.floor(cl((t - .35) / .6) * u.chars.length);
      if (n !== u.shown) {
        var a = Math.min(n, u.shown), b = Math.max(n, u.shown);
        for (var k = a; k < b; k++) u.chars[k].classList.toggle('on', k < n);
        u.shown = n;
      }
    } else if (u.kind === 'box') {
      el.style.setProperty('--a', sm(.3, .6, t));
    } else {
      el.style.setProperty('--a', sm(.3, .7, t));
    }

    if (u.frame) {
      var g = sm(.04, .35, t);
      u.frame.style.setProperty('--fw', g);
      u.frame.style.setProperty('--fh', g);
      u.frame.style.opacity = st !== 1 ? 0 :
        u.kind === 'type' ? 1 - cl((t - .9) / .1) : 1 - cl((t - .55) / .25);
    }

    if (u.cur) {
      if (st !== 1) { u.cur.style.opacity = 0; u.cx = null; return; }
      var S = { x: (u.i % 2 ? -30 : vw + 30), y: vh * (.15 + ((u.i * 37) % 60) / 100) };
      var TL = { x: r.left - 5, y: r.top - 5 }, BR = { x: r.right + 5, y: r.bottom + 5 };
      var x, y, f, text = false;
      if (t < .12) {
        f = ease(t / .12); x = S.x + (TL.x - S.x) * f; y = S.y + (TL.y - S.y) * f;
      } else if (t < .35) {
        f = ease((t - .12) / .23); x = TL.x + (BR.x - TL.x) * f; y = TL.y + (BR.y - TL.y) * f;
      } else if (u.kind === 'type' && u.shown > 0) {
        var cr = u.chars[Math.min(u.shown, u.chars.length) - 1].getBoundingClientRect();
        x = cr.right; y = cr.top; text = true;
      } else {
        f = ease((t - .35) / .65); x = BR.x + f * 70; y = BR.y + f * 30;
      }
      u.cur.classList.toggle('text', text);
      u.cur.style.opacity = Math.min(1, t / .05) * Math.min(1, (1 - t) / .08);
      u.cur.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      u.cx = x; u.cy = y;
    }
  }

  /* ---------- frame loop ---------- */
  var ticking = false, introMode = false, introT0 = 0;
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  function update() {
    ticking = false;
    var vh = window.innerHeight, vw = window.innerWidth, sy = window.pageYOffset;
    var maxS = Math.max(0, document.documentElement.scrollHeight - vh);
    var bonus = cl(1 - (maxS - sy) / (vh * .5)) * vh * .45; // lets the last units finish at page end
    var now = performance.now(), live = false, lead = null, more = false;

    var rects = units.map(function (u) { return u.el.getBoundingClientRect(); });
    units.forEach(function (u, k) {
      var t;
      if (u.intro && introMode) {
        t = introT0 ? cl((now - introT0 - u.ix * 160) / 1500) : 0;
        if (t < 1) more = true;
      } else {
        t = cl((vh * .96 + bonus - rects[k].top - (u.i % 4) * 28) / (vh * .3));
      }
      apply(u, t, rects[k], vw, vh);
      if (t > 0 && t < 1) { live = true; if (!lead && u.cx != null) lead = u; }
    });

    root.classList.toggle('live', live);
    if (lead) {
      guideX.style.transform = 'translateX(' + lead.cx.toFixed(0) + 'px)';
      guideY.style.transform = 'translateY(' + lead.cy.toFixed(0) + 'px)';
    }
    if (more || (introMode && !introT0)) request();
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { units.forEach(function (u) { u.st = -1; }); request(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { units.forEach(function (u) { u.st = -1; }); request(); });

  /* ---------- intro: ring of cursors, then the hero builds itself ---------- */
  var intro = document.getElementById('intro');
  if (intro && window.pageYOffset < 40) {
    introMode = true;
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
      setTimeout(function () { intro.remove(); introT0 = performance.now(); request(); }, 500);
    }, 1700);
  } else if (intro) {
    intro.remove();
  }

  request();
})();
