/* Пошук по прайсу та послугах — швидкий, з синонімами та підсвіткою */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const norm = s => (s || "").toLowerCase().replace(/[ʼ’`´']/g, "'").replace(/ё/g, "е").replace(/[«»"()\/\\,.:;!?+–—-]/g, " ").replace(/\s+/g, " ").trim();
  /* народні назви → терміни з прайсу */
  const SYN = {
    "чистк": ["гігієн", "відкладен"], "камін": ["гігієн", "відкладен"], "наліт": ["гігієн", "нальот"],
    "брекет": ["брекет"], "елайнер": ["ортодонт", "капа"], "кап": ["капа", "ретенц"], "прикус": ["ортодонт", "брекет"],
    "імплант": ["імплант"], "мудр": ["мудрост"], "вісімк": ["мудрост"], "видал": ["видален"], "вирв": ["видален"],
    "пломб": ["пломб"], "карієс": ["пломб", "карієс"], "канал": ["ендодонт", "канал"], "нерв": ["ендодонт", "пульп", "екстирпац"], "пульпіт": ["ендодонт", "пульп"],
    "корон": ["коронк"], "вінір": ["вінір"], "цирко": ["цирконі"], "протез": ["протез"],
    "відбіл": ["відбілюван"], "zoom": ["zoom"],
    "дит": ["дитяч", "молочн", "дитинств"], "молочн": ["молочн"],
    "знімок": ["рентген", "томограф", "ортопантомограф"], "рентген": ["рентген"], "кт": ["томограф"], "3d": ["томограф"], "томо": ["томограф"], "панорам": ["ортопантомограф"],
    "знебол": ["анестез"], "укол": ["анестез"], "анест": ["анестез"],
    "ясн": ["ясен", "пародонт"], "пародонт": ["пародонт"], "консульт": ["консультац", "огляд"], "огляд": ["огляд"], "біль": ["болю", "біль", "гостр"],
    "синус": ["синус"], "кістк": ["кістков", "остеопласт"], "вуздеч": ["вуздеч"], "фтор": ["фтор"], "герметик": ["герметик", "фісур"]
  };
  function alts(tok) {
    if (/^(біль|болить|болі|болю)$/.test(tok)) return ["болю", "гостр"];
    const out = new Set([tok]);
    if (tok.length >= 6) out.add(tok.slice(0, -1));
    if (tok.length >= 8) out.add(tok.slice(0, -2));
    Object.keys(SYN).forEach(k => { if (tok.startsWith(k) || (k.startsWith(tok) && tok.length >= 3)) SYN[k].forEach(v => out.add(v)); });
    return Array.from(out);
  }
  function makeMatcher(q) {
    const toks = norm(q).split(" ").filter(t => t.length > 0);
    if (!toks.length) return null;
    const groups = toks.map(alts);
    const isCode = /^\d+(\.\d+)?$/.test(q.trim());
    const test = text => {
      if (isCode) return text.split(" ")[0] === q.trim() || text.split(" ")[0].startsWith(q.trim() + ".");
      const w = norm(text).split(" ");
      return groups.every(g => g.some(a => w.some(x => x.startsWith(a) || (a.length >= 5 && x.includes(a)))));
    };
    const words = Array.from(new Set(groups.flat())).filter(w => w.length > 1).sort((a, b) => b.length - a.length);
    return { test, words, toks };
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function highlight(text, m) {
    let html = esc(text); if (!m || !m.words.length) return html;
    const re = new RegExp("(" + m.words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['ʼ’]")).join("|") + ")", "gi");
    return html.replace(re, "<mark>$1</mark>");
  }
  const fmt = n => n.toLocaleString("uk-UA").replace(/\u00a0/g, " ");
  window.YDCSearch = { norm, makeMatcher, highlight, fmt };

  function bindInput(input, cb) {
    const wrap = input.closest(".search"); let t;
    const run = () => { if (wrap) wrap.classList.toggle("has-value", !!input.value); cb(input.value); };
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 90); });
    const clr = wrap && wrap.querySelector(".search__clear");
    if (clr) clr.addEventListener("click", () => { input.value = ""; run(); input.focus(); });
    document.addEventListener("keydown", e => { if (e.key === "/" && document.activeElement !== input && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });
    return run;
  }
  function bindHints(scope, input) { $$("[data-hint]", scope).forEach(b => b.addEventListener("click", () => { input.value = b.dataset.hint; input.dispatchEvent(new Event("input")); input.focus(); })); }
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c); };

  /* ====== СТОРІНКА ЦІН ====== */
  const priceRoot = $("#price-list");
  if (priceRoot && window.YDC_PRICES) {
    const icons = window.YDC_ICONS || {};
    const data = window.YDC_PRICES;
    const total = data.reduce((a, c) => a + c.items.length, 0);
    priceRoot.innerHTML = data.map((c, ci) => `
      <section class="pcat" id="cat-${ci}" data-cat="${ci}">
        <button class="pcat__head" type="button" aria-expanded="false" aria-controls="cat-body-${ci}">
          <span class="pcat__ico">${icons[c.icon] || icons.tooth || ""}</span>
          <span class="pcat__title"><b>${c.cat}</b><small data-cnt>${c.items.length} ${plural(c.items.length, "послуга", "послуги", "послуг")}</small></span>
          <span class="pcat__tog">${icons.chev || ""}</span>
        </button>
        <div class="pcat__body" id="cat-body-${ci}"><div class="pcat__inner">
          ${c.items.map(it => `<div class="prow" data-text="${esc(it[0] + " " + it[1] + " " + c.cat)}"><span class="prow__code">${it[0]}</span><span class="prow__name">${esc(it[1])}</span><span class="prow__price">${it[3] ? "<small>від</small>" : ""}${fmt(it[2])}<em>грн</em></span></div>`).join("")}
        </div></div>
      </section>`).join("");
    const cats = $$(".pcat", priceRoot), meta = $("#price-meta"), empty = $("#price-empty"), navLinks = $$(".price-nav a"), chips = $$("#price-chips .chip");
    let activeCat = "all";
    const setOpen = (c, o) => { c.classList.toggle("is-open", o); c.querySelector(".pcat__head").setAttribute("aria-expanded", o); };
    cats.forEach((c, i) => c.querySelector(".pcat__head").addEventListener("click", () => setOpen(c, !c.classList.contains("is-open"))));
    if (cats[0]) setOpen(cats[0], true);

    const input = $("#price-search");
    const apply = q => {
      const m = makeMatcher(q); let shown = 0, catsShown = 0;
      cats.forEach((c, ci) => {
        const inCat = activeCat === "all" || +activeCat === ci;
        let n = 0;
        $$(".prow", c).forEach(r => {
          const ok = inCat && (!m || m.test(r.dataset.text));
          r.classList.toggle("is-hidden", !ok);
          const nm = r.querySelector(".prow__name"); nm.innerHTML = highlight(nm.textContent, m);
          if (ok) n++;
        });
        c.classList.toggle("is-hidden", n === 0);
        c.querySelector("[data-cnt]").textContent = m ? `знайдено: ${n}` : `${n} ${plural(n, "послуга", "послуги", "послуг")}`;
        if (m) setOpen(c, n > 0);
        if (n) { shown += n; catsShown++; }
        const nl = navLinks[ci]; if (nl) { nl.classList.toggle("is-empty", n === 0); const sm = nl.querySelector("small"); if (sm) sm.textContent = n; }
      });
      if (!m && activeCat === "all") cats.forEach((c, i) => { if (!c.dataset.touched) setOpen(c, i === 0); });
      if (!m && activeCat !== "all") cats.forEach(c => { if (!c.classList.contains("is-hidden")) setOpen(c, true); });
      if (meta) meta.innerHTML = m ? (shown ? `Знайдено <b>${shown}</b> ${plural(shown, "послугу", "послуги", "послуг")} у ${catsShown} ${plural(catsShown, "розділі", "розділах", "розділах")}` : "") : `Усього в прайсі <b>${total}</b> ${plural(total, "послуга", "послуги", "послуг")} · ${data.length} розділів`;
      if (empty) { empty.classList.toggle("is-on", shown === 0); const eq = $("[data-empty-q]", empty); if (eq) eq.textContent = q; }
      try { const u = new URL(location); if (q) u.searchParams.set("q", q); else u.searchParams.delete("q"); history.replaceState(null, "", u); } catch (e) {}
    };
    cats.forEach(c => c.querySelector(".pcat__head").addEventListener("click", () => c.dataset.touched = "1"));
    const run = bindInput(input, apply);
    bindHints(document, input);
    chips.forEach(ch => ch.addEventListener("click", () => {
      chips.forEach(x => { x.classList.toggle("is-active", x === ch); x.setAttribute("aria-pressed", x === ch); });
      activeCat = ch.dataset.cat; apply(input.value);
      if (activeCat !== "all") { const t = document.getElementById("cat-" + activeCat); if (t) setTimeout(() => t.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
    }));
    navLinks.forEach((a, i) => a.addEventListener("click", e => { e.preventDefault(); setOpen(cats[i], true); cats[i].dataset.touched = "1"; cats[i].scrollIntoView({ behavior: "smooth", block: "start" }); }));
    if ("IntersectionObserver" in window) {
      const o = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { const i = +e.target.dataset.cat; navLinks.forEach((a, k) => a.classList.toggle("is-active", k === i)); } }), { rootMargin: "-30% 0px -60% 0px" });
      cats.forEach(c => o.observe(c));
    }
    const q0 = new URLSearchParams(location.search).get("q");
    if (q0) { input.value = q0; }
    const c0 = new URLSearchParams(location.search).get("cat");
    if (c0 !== null) { const ch = chips.find(x => x.dataset.cat === c0); if (ch) { ch.click(); } }
    run();
  }

  /* ====== СТОРІНКА ПОСЛУГ ====== */
  const svcRoot = $("#svc-list");
  if (svcRoot) {
    const rows = $$(".svc-row", svcRoot), input = $("#svc-search"), meta = $("#svc-meta"), empty = $("#svc-empty");
    const priceBox = $("#svc-prices");
    const apply = q => {
      const m = makeMatcher(q); let n = 0;
      rows.forEach(r => {
        const ok = !m || m.test(r.dataset.text); r.classList.toggle("is-hidden", !ok); if (ok) n++;
        const h = r.querySelector("h3"); h.innerHTML = highlight(h.textContent, m);
      });
      // збіги в прайсі — показуємо прямо тут
      let pm = [];
      if (m && window.YDC_PRICES) window.YDC_PRICES.forEach(c => c.items.forEach(it => { if (m.test(it[1] + " " + c.cat)) pm.push([it, c.cat]); }));
      if (priceBox) {
        priceBox.innerHTML = pm.length ? `<p class="eyebrow" style="margin:0 0 14px">У прайсі знайдено: ${pm.length}</p>` + pm.slice(0, 6).map(([it, cat]) => `<a class="qres" href="tsiny.html?q=${encodeURIComponent(q)}"><span>${highlight(it[1], m)}<small>${cat}</small></span><b>${it[3] ? "від " : ""}${fmt(it[2])} грн</b></a>`).join("") + (pm.length > 6 ? `<a class="link-arrow" style="margin-top:8px" href="tsiny.html?q=${encodeURIComponent(q)}">Усі ${pm.length} результатів у прайсі ${(window.YDC_ICONS || {}).arrow || ""}</a>` : "") : "";
        priceBox.style.display = pm.length ? "grid" : "none";
      }
      if (meta) meta.innerHTML = m ? `Напрямків: <b>${n}</b>` : `Усього напрямків: <b>${rows.length}</b>`;
      if (empty) empty.classList.toggle("is-on", n === 0 && !pm.length);
    };
    const run = bindInput(input, apply); bindHints(document, input); run();
  }

  /* ====== ШВИДКИЙ ПОШУК НА ГОЛОВНІЙ ====== */
  const qs = $("#quick-search");
  if (qs && window.YDC_PRICES) {
    const res = $("#quick-res");
    const all = []; window.YDC_PRICES.forEach(c => c.items.forEach(it => all.push([it, c.cat])));
    const apply = q => {
      const m = makeMatcher(q);
      if (!m) { res.innerHTML = ""; return; }
      const found = all.filter(([it, cat]) => m.test(it[1] + " " + cat));
      res.innerHTML = found.length ? found.slice(0, 5).map(([it, cat], i) => `<a class="qres" style="animation-delay:${i * .05}s" href="tsiny.html?q=${encodeURIComponent(q)}"><span>${highlight(it[1], m)}<small>${cat}</small></span><b>${it[3] ? "від " : ""}${fmt(it[2])} грн</b></a>`).join("") + `<a class="link-arrow" href="tsiny.html?q=${encodeURIComponent(q)}">Усі результати (${found.length}) ${(window.YDC_ICONS || {}).arrow || ""}</a>` : `<p class="muted" style="margin:6px 4px">Нічого не знайдено. Зателефонуйте нам — підкажемо вартість.</p>`;
    };
    bindInput(qs, apply); bindHints(qs.closest("section") || document, qs);
    qs.closest("form") && qs.closest("form").addEventListener("submit", e => { e.preventDefault(); location.href = "tsiny.html?q=" + encodeURIComponent(qs.value); });
  }
})();
