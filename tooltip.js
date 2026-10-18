/* The "Explainer" agent. Headings and stack terms that might confuse a non-specialist
   (matched against content/glossary.json) get a dotted underline. Hover one and a
   cursor trails your mouse and types out a plain-language explanation.
   Touch devices: tap the term instead.                                      */
(function () {
  var data = document.getElementById('glossary');
  if (!data) return;
  var gloss;
  try { gloss = JSON.parse(data.textContent); } catch (e) { return; }

  [].slice.call(document.querySelectorAll('h1,h2,h3,.chip')).forEach(function (el) {
    var t = el.textContent.toLowerCase();
    for (var i = 0; i < gloss.length; i++) {
      if (t.indexOf(gloss[i].match) > -1) {
        el.setAttribute('data-tip', gloss[i].tip);
        el.setAttribute('aria-description', gloss[i].tip);
        return;
      }
    }
  });

  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var layer = document.getElementById('cursors');
  if (!layer) return;

  var cur = document.createElement('div');
  cur.className = 'cur tipcur';
  cur.style.setProperty('--ac', '#10b981');
  cur.innerHTML = '<svg class="ar" viewBox="0 0 16 16"><path d="M1.5 1.5l5.6 13 2.1-5.3 5.3-2.1z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg><span>Explainer Agent</span>';
  var box = document.createElement('div');
  box.className = 'tipbox';
  layer.appendChild(cur);
  layer.appendChild(box);

  var active = null, target = { x: -99, y: -99 }, pos = { x: -99, y: -99 }, typer = 0, running = false, inside = false, hideTimer = 0;

  function start() { if (!running) { running = true; requestAnimationFrame(tick); } }
  function show(el) {
    clearTimeout(hideTimer);
    if (active === el) return;
    active = el;
    var text = el.getAttribute('data-tip'), n = 0;
    box.textContent = '';
    clearInterval(typer);
    typer = setInterval(function () {
      n += 2;
      box.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(typer);
    }, 16);
    box.style.opacity = 1;
  }
  function hideTip() { active = null; clearInterval(typer); box.style.opacity = 0; }
  function leave() { inside = false; hideTip(); cur.style.opacity = 0; }

  function tick() {
    pos.x += (target.x - pos.x) * .16;
    pos.y += (target.y - pos.y) * .16;
    cur.style.transform = 'translate3d(' + (pos.x + 14).toFixed(1) + 'px,' + (pos.y + 16).toFixed(1) + 'px,0)';
    var w = box.offsetWidth, h = box.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var bx = pos.x + 28, by = pos.y + 44;
    if (bx + w > vw - 12) bx = Math.max(12, pos.x - w - 10);
    if (by + h > vh - 12) by = Math.max(12, pos.y - h - 14);
    box.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
    if (inside || active) requestAnimationFrame(tick); else running = false;
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    if (!inside) { inside = true; pos.x = e.clientX; pos.y = e.clientY; }
    target.x = e.clientX; target.y = e.clientY;
    cur.style.opacity = 1;
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el); else if (active) hideTip();
    start();
  });
  document.documentElement.addEventListener('pointerleave', leave);
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch') return;
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { hideTip(); return; }
    active = null; show(el);
    target.x = pos.x = e.clientX; target.y = pos.y = e.clientY;
    cur.style.opacity = 0; start();
    hideTimer = setTimeout(hideTip, 5000);
  });
})();
