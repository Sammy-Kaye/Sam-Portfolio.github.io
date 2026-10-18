/* Two hovering agents on the home page (the third, "Explainer", lives in tooltip.js).
   Retitle Agent   goes back over the headline and keeps trying other job titles.
   Arrange Agent   drags the stack cards around like a carousel, one drag-and-drop at a time. */
(function () {
  if ((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]nofx/.test(location.search)) return;
  var layer = document.getElementById('cursors');
  if (!layer) return;

  var ARROW = '<svg class="ar" viewBox="0 0 16 16"><path d="M1.5 1.5l5.6 13 2.1-5.3 5.3-2.1z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var IBEAM = '<svg class="ib" viewBox="0 0 10 20"><path d="M2 1.5h6M5 1.5v17M2 18.5h6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>';
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function mkCursor(label, color) {
    var c = document.createElement('div');
    c.className = 'cur hover';
    c.style.setProperty('--ac', color);
    c.innerHTML = ARROW + IBEAM + '<span>' + label + '</span>';
    layer.appendChild(c);
    return c;
  }
  function watch(el, cb) {
    var vis = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (cb) cb(vis); }, { threshold: .35 }).observe(el);
    else vis = true;
    return function () { return vis && !document.hidden; };
  }
  function waitFor(cond) { return (function loop() { return cond() ? Promise.resolve() : sleep(300).then(loop); })(); }

  /* ---------- Retitle ---------- */
  var h1 = document.querySelector('.hero h1');
  if (h1) (function () {
    var TITLES = ['AI Automations Engineer.', 'AI Solutions Engineer.', 'Full-Stack Developer.', 'C# Developer.', 'React Developer.',
      'n8n Automation Engineer.', 'Forward Deployed Engineer.', 'Integration Engineer.', 'AI Implementation Engineer.', '.NET Developer.'];
    var cur = mkCursor('Retitle Agent', '#ec4899');
    var inView = watch(h1);
    var built = function () {
      var cs = h1.querySelectorAll('.c');
      if (!cs.length) return true; // nothing is typed in from scratch any more
      for (var i = 0; i < cs.length; i++) if (!cs[i].classList.contains('on')) return false;
      return true;
    };
    var vis, node, marker, mode = 'idle', pos = { x: -50, y: 300 }, raf = 0;

    function target() {
      var r = h1.getBoundingClientRect(), t = Date.now() / 1000;
      if (mode === 'edit') { var m = marker.getBoundingClientRect(); return { x: m.right, y: m.top + m.height * .12 }; }
      return { x: r.right - Math.min(r.width * .18, 120) + Math.sin(t * 1.3) * 10, y: r.bottom + 6 + Math.cos(t * 1.7) * 6 };
    }
    function tick() {
      var on = inView() && built();
      var t = target();
      var k = mode === 'edit' ? .45 : .06;
      pos.x += (t.x - pos.x) * k; pos.y += (t.y - pos.y) * k;
      cur.style.transform = 'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,0)';
      cur.style.opacity = on ? 1 : 0;
      cur.classList.toggle('text', mode === 'edit');
      raf = requestAnimationFrame(tick);
    }

    async function run() {
      await waitFor(built);
      var original = h1.textContent;
      h1.textContent = '';
      var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = original;
      vis = document.createElement('span'); vis.className = 'rt'; vis.setAttribute('aria-hidden', 'true');
      node = document.createTextNode(original);
      marker = document.createElement('i'); marker.className = 'ct';
      vis.appendChild(node); vis.appendChild(marker);
      h1.appendChild(sr); h1.appendChild(vis);
      h1.classList.add('rt-on');
      tick();
      var i = 0;
      for (;;) {
        await waitFor(inView);
        await sleep(2800);
        await waitFor(inView);
        i = (i + 1) % TITLES.length;
        var next = TITLES[i];
        mode = 'edit';
        await sleep(500);                       // fly to the end of the line
        vis.classList.add('sel'); await sleep(520);   // select the old title
        vis.classList.remove('sel');
        var s = node.nodeValue;
        while (s.length) { s = s.slice(0, -1); node.nodeValue = s; await sleep(18); }
        await sleep(180);
        for (var k = 0; k < next.length; k++) { node.nodeValue = next.slice(0, k + 1); await sleep(45 + Math.random() * 40); }
        await sleep(350);
        mode = 'idle';
      }
    }
    run();
  })();

  /* ---------- Arrange: drag-and-drop carousel ---------- */
  var deck = document.querySelector('.stack');
  if (deck) (function () {
    var cur = mkCursor('Arrange Agent', '#8b5cf6');
    var inView = watch(deck);
    var pos = { x: -60, y: 400 }, want = null, grabbing = false;

    function built() {
      var cs = [].slice.call(deck.children);
      return cs.every(function (c) { var a = c.style.getPropertyValue('--a'); return a === '' || parseFloat(a) > .98; });
    }
    function idleSpot() {
      var r = deck.getBoundingClientRect(), t = Date.now() / 1000;
      return { x: r.right - 70 + Math.sin(t * 1.1) * 12, y: r.top - 26 + Math.cos(t * 1.5) * 6 };
    }
    function frame() {
      var t = want ? want() : idleSpot();
      var k = grabbing ? 1 : (want ? .2 : .06);
      pos.x += (t.x - pos.x) * k; pos.y += (t.y - pos.y) * k;
      cur.style.transform = 'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,0)';
      cur.style.opacity = inView() ? 1 : 0;
      requestAnimationFrame(frame);
    }

    async function move() {
      var cards = [].slice.call(deck.children), first = cards[0], last = cards[cards.length - 1];
      var dr = deck.getBoundingClientRect();
      var fr = first.getBoundingClientRect(), lr = last.getBoundingClientRect();
      var rel = { x: fr.left - dr.left, y: fr.top - dr.top };
      var dx = lr.left - fr.left, dy = lr.top - fr.top;
      var gx = Math.min(60, fr.width * .3), gy = 34; // where the agent grabs the card
      var off = { x: 0, y: 0 };

      // fly to the card
      want = function () { var d = deck.getBoundingClientRect(); return { x: d.left + rel.x + gx + off.x, y: d.top + rel.y + gy + off.y }; };
      await sleep(900);
      // grab
      first.classList.add('grab');
      grabbing = true;
      await sleep(180);
      // drag to the last slot along a lifted arc
      var dur = 1250, t0 = performance.now();
      await new Promise(function (res) {
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur), e = ease(p), lift = Math.sin(p * Math.PI) * 26;
          off.x = dx * e; off.y = dy * e - lift;
          first.style.transform = 'translate(' + off.x.toFixed(1) + 'px,' + off.y.toFixed(1) + 'px) rotate(' + (Math.sin(p * Math.PI) * -2.2).toFixed(2) + 'deg) scale(1.035)';
          if (p < 1) requestAnimationFrame(step); else res();
        })(t0);
      });
      // drop: re-order the DOM, the others slide into the gap
      var before = cards.map(function (c) { return c.getBoundingClientRect(); });
      first.style.transform = '';
      first.classList.remove('grab');
      deck.appendChild(first);
      var settle = [];
      cards.forEach(function (c, i) {
        if (c === first) return;
        var a = before[i], b = c.getBoundingClientRect();
        var mx = a.left - b.left, my = a.top - b.top;
        if (mx || my) c.animate([{ transform: 'translate(' + mx + 'px,' + my + 'px)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
      first.animate([{ transform: 'scale(1.035)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
      grabbing = false; off.x = off.y = 0; want = null;
      await sleep(700);
    }

    (async function run() {
      await waitFor(function () { return inView() && built(); });
      frame();
      for (;;) {
        await waitFor(function () { return inView() && built(); });
        await sleep(1800);
        await waitFor(function () { return inView() && built(); });
        await move();
      }
    })();
  })();
})();
