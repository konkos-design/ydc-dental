/* Yasnovsky Dental Clinic — інтерактив сайту */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  document.documentElement.classList.add("is-ready");

  /* ---------- розбивка заголовків на слова ---------- */
  $$("[data-split]").forEach(el => {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
            w.appendChild(s); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") walk(ch);
      });
    };
    walk(el); el.classList.add("split");
  });

  /* ---------- reveal при скролі ---------- */
  const revealEls = $$("[data-reveal],[data-split],.ecg[data-draw],[data-count]");
  if ("IntersectionObserver" in window && !reduce) {
    /* clip-path приховує елемент від IO, тому для "clip" спостерігаємо за батьком */
    const map = new Map();
    revealEls.forEach(el => { const t = el.getAttribute("data-reveal") === "clip" ? el.parentElement : el; if (!map.has(t)) map.set(t, []); map.get(t).push(el); });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        (map.get(e.target) || []).forEach(el => {
          const go = () => { el.classList.add("is-in"); if (el.hasAttribute("data-count")) countUp(el); };
          if (document.documentElement.classList.contains("is-ready")) go(); else document.addEventListener("ydc:ready", go, { once: true });
        });
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
    map.forEach((_, t) => io.observe(t));
  } else revealEls.forEach(el => { el.classList.add("is-in"); if (el.hasAttribute("data-count")) el.textContent = el.dataset.count; });

  function countUp(el) {
    const end = parseFloat(el.dataset.count), dur = 1800, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 4))); el.textContent = v; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- хедер, прогрес, кнопка вгору ---------- */
  const header = $(".header"), prog = $(".scroll-progress"), topBtn = $(".fab__top");
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    if (header) {
      header.classList.toggle("is-scrolled", y > 30);
      if (!document.body.classList.contains("menu-open")) header.classList.toggle("is-hidden", y > lastY && y > 400);
    }
    if (topBtn) topBtn.classList.toggle("is-on", y > 900);
    parallax();
    lastY = y; ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  if (topBtn) topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- паралакс ---------- */
  const pEls = reduce ? [] : $$("[data-parallax]");
  function parallax() {
    pEls.forEach(el => {
      const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const sp = parseFloat(el.dataset.parallax) || .1, c = (r.top + r.height / 2 - innerHeight / 2);
      const target = el.querySelector("img") || el; target.style.transform = `translate3d(0,${(-c * sp).toFixed(1)}px,0) scale(1.12)`;
    });
  }
  onScroll();

  /* ---------- мобільне меню ---------- */
  const burger = $(".burger");
  const setMenu = open => {
    document.body.classList.toggle("menu-open", open); document.body.classList.toggle("is-locked", open);
    if (burger) burger.setAttribute("aria-expanded", open);
    const menu=$(".mmenu");if(menu){menu.setAttribute("aria-hidden",String(!open));menu.inert=!open;}
    if (open && header) header.classList.remove("is-hidden");
  };
  setMenu(false);
  if (burger) burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$(".mmenu a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") { setMenu(false); closeModal(); closeLb(); } });

  /* ---------- магнітні кнопки + ripple ---------- */
  if (fine && !reduce) $$("[data-magnetic]").forEach(b => {
    b.addEventListener("mousemove", e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
    b.addEventListener("mouseleave", () => { b.style.transform = ""; });
  });
  document.addEventListener("click", e => {
    const b = e.target.closest(".btn,.chip,.rail-btn"); if (!b) return;
    const r = b.getBoundingClientRect(), s = document.createElement("span"), size = Math.max(r.width, r.height);
    s.className = "ripple"; s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 700);
  });

  /* ---------- 3D-нахил карток ---------- */
  if (fine && !reduce) $$("[data-tilt]").forEach(el => {
    el.addEventListener("mousemove", e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-6px)`; });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  /* ---------- каруселі з перетягуванням ---------- */
  $$("[data-rail]").forEach(rail => {
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - sx; moved = Math.abs(dx); if (moved > 5) rail.classList.add("is-drag"); rail.scrollLeft = sl - dx; });
    window.addEventListener("pointerup", () => { if (!down) return; down = false; setTimeout(() => rail.classList.remove("is-drag"), 0); });
    rail.addEventListener("click", e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    rail.addEventListener("dragstart", e => e.preventDefault());
    const id = rail.id;
    $$(`[data-rail-prev="${id}"],[data-rail-next="${id}"]`).forEach(btn => btn.addEventListener("click", () => {
      const card = rail.firstElementChild; const w = card ? card.getBoundingClientRect().width + 20 : 300;
      rail.scrollBy({ left: btn.hasAttribute("data-rail-next") ? w : -w, behavior: "smooth" });
    }));
  });

  /* ---------- до / після ---------- */
  $$(".ba").forEach(ba => {
    let active = false, touched = false;
    ba.setAttribute("role","slider"); ba.setAttribute("aria-label","Порівняння до та після"); ba.setAttribute("aria-valuemin","0"); ba.setAttribute("aria-valuemax","100"); ba.setAttribute("aria-valuenow","50");
    const value = p => {ba.style.setProperty("--pos",p+"%");ba.setAttribute("aria-valuenow",String(Math.round(p)));};
    const set = x => { const r = ba.getBoundingClientRect(); const p = Math.max(0, Math.min(100, (x - r.left) / r.width * 100)); touched=true; value(p); };
    ba.addEventListener("pointerdown", e => { active = true; touched = true; set(e.clientX); if (e.pointerType === "mouse") ba.setPointerCapture(e.pointerId); });
    ba.addEventListener("pointermove", e => { if (active || e.pointerType === "mouse" && fine && e.buttons === 0 && ba.dataset.hover !== "off") { if (active) set(e.clientX); } });
    ba.addEventListener("pointerup", () => active = false);
    ba.addEventListener("pointercancel", () => active = false);
    ba.addEventListener("touchmove", e => { if (e.touches[0]) set(e.touches[0].clientX); }, { passive: true });
    ba.setAttribute("tabindex", "0");
    ba.addEventListener("keydown", e => {const steps={ArrowLeft:-5,ArrowDown:-5,ArrowRight:5,ArrowUp:5}; if(!(e.key in steps) && e.key!=="Home" && e.key!=="End")return; e.preventDefault();touched=true;const cur=Number(ba.getAttribute("aria-valuenow"));value(e.key==="Home"?0:e.key==="End"?100:Math.max(0,Math.min(100,cur+steps[e.key])));});
    // підказка-анімація при появі
    if (!reduce && "IntersectionObserver" in window) {
      const o = new IntersectionObserver(en => { if (en[0].isIntersecting) { o.disconnect(); let t0 = null; const anim = t => { if (!t0) t0 = t; const p = (t - t0) / 1600; if (p > 1 || touched) return; value(50 + Math.sin(p * Math.PI * 2) * 18); requestAnimationFrame(anim); }; setTimeout(() => requestAnimationFrame(anim), 500); } }, { threshold: .6 });
      o.observe(ba);
    }
  });

  /* ---------- технології: sticky-перемикання ---------- */
  const techItems = $$(".tech__item"), techImgs = $$(".tech__media img"), techNum = $(".tech__num");
  if (techItems.length && "IntersectionObserver" in window) {
    const o = new IntersectionObserver(en => en.forEach(e => {
      if (!e.isIntersecting) return; const i = techItems.indexOf(e.target);
      techItems.forEach((t, k) => t.classList.toggle("is-active", k === i));
      techImgs.forEach((im, k) => im.classList.toggle("is-active", k === i));
      if (techNum) techNum.textContent = "0" + (i + 1);
    }), { rootMargin: "-45% 0px -45% 0px" });
    techItems.forEach(t => o.observe(t));
  }

  /* ---------- статус роботи ---------- */
  const H = (window.YDC && window.YDC.hours) || {};
  function kyivNow(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Kyiv',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k).value;return {d:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday')),h:Number(get('hour'))+Number(get('minute'))/60};}
  function statusNow() {
    const {d,h}=kyivNow(), today = H[d];
    if (Array.isArray(today) && h >= today[0] && h < today[1]) return { cls: "", txt: `Зараз відчинено · до ${today[1]}:00` };
    if (today === "appt") return { cls: "is-appt", txt: "Субота — за попереднім записом" };
    // наступне відкриття
    for (let k = 0; k < 7; k++) {
      const dd = (d + k) % 7, t = H[dd];
      if (Array.isArray(t) && (k > 0 || h < t[0])) return { cls: "is-closed", txt: `Зачинено · відкриємось ${k === 0 ? "сьогодні" : k === 1 ? "завтра" : ["у неділю","у понеділок","у вівторок","у середу","у четвер","у п'ятницю","у суботу"][dd]} о ${String(t[0]).padStart(2, "0")}:00` };
    }
    return { cls: "is-closed", txt: "Зачинено" };
  }
  $$("[data-open-status]").forEach(el => { const s = statusNow(); const dot = el.querySelector(".dot"); if (dot) dot.className = "dot " + s.cls; const t = el.querySelector("[data-status-text]"); if (t) t.textContent = s.txt; });
  $$("[data-hours] [data-day]").forEach(r => { if (+r.dataset.day === kyivNow().d) r.classList.add("is-today"); });

  /* ---------- модальні вікна ---------- */
  let lastFocus = null;
  function openModal(id) { const m = document.getElementById(id); if (!m) return; lastFocus = document.activeElement; m.classList.add("is-open"); m.setAttribute("aria-hidden", "false"); document.body.classList.add("is-locked"); setTimeout(() => { const f = m.querySelector("input,button.modal__close"); if (f) f.focus(); }, 300); }
  function closeModal() { $$(".modal.is-open").forEach(m => { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }); if (!document.body.classList.contains("menu-open")) document.body.classList.remove("is-locked"); if (lastFocus) lastFocus.focus({ preventScroll: true }); }
  window.YDCModal = { open: openModal, close: closeModal };
  document.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  /* ---------- лайтбокс ---------- */
  const lb = $(".lightbox"); let lbItems = [], lbIdx = 0, lbFocus = null;
  function showLb(i) { if (!lb) return; lbIdx = (i + lbItems.length) % lbItems.length; const it = lbItems[lbIdx]; const img = $("img", lb); img.style.opacity = 0; img.onload = () => img.style.opacity = 1; img.src = it.href; img.alt = it.dataset.cap || ""; $(".lightbox__cap", lb).textContent = it.dataset.cap || ""; }
  function closeLb() { if (lb && lb.classList.contains("is-open")) { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden","true"); document.body.classList.remove("is-locked"); if(lbFocus) lbFocus.focus({preventScroll:true}); } }
  document.addEventListener("click", e => {
    const g = e.target.closest(".g-item"); if (g && lb) { e.preventDefault(); lbItems = $$(".g-item:not(.is-hidden)"); showLb(lbItems.indexOf(g)); lbFocus = g; lb.classList.add("is-open"); lb.setAttribute("aria-hidden","false"); document.body.classList.add("is-locked"); setTimeout(() => {if(lb.classList.contains("is-open"))lb.querySelector(".lb-close").focus({preventScroll:true});}, 50); return; }
    if (e.target.closest(".lb-close") || e.target === lb) closeLb();
    if (e.target.closest(".lb-prev")) showLb(lbIdx - 1);
    if (e.target.closest(".lb-next")) showLb(lbIdx + 1);
  });
  document.addEventListener("keydown", e => { if (!lb || !lb.classList.contains("is-open")) return; if (e.key === "ArrowLeft") showLb(lbIdx - 1); if (e.key === "ArrowRight") showLb(lbIdx + 1); });
  if (lb) { let sx = 0; lb.addEventListener("touchstart", e => sx = e.touches[0].clientX, { passive: true }); lb.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) showLb(lbIdx + (dx < 0 ? 1 : -1)); }); }

  /* ---------- фільтри (галерея, відгуки, лікарі) ---------- */
  $$("[data-filter-group]").forEach(group => {
    const target = group.dataset.filterGroup;
    group.addEventListener("click", e => {
      const chip = e.target.closest(".chip"); if (!chip) return;
      $$(".chip", group).forEach(c => {c.classList.toggle("is-active", c === chip); c.setAttribute("aria-pressed",String(c === chip));}); chip.setAttribute("aria-pressed", "true");
      const f = chip.dataset.filter;
      $$(`${target} [data-tags]`).forEach(item => {
        const show = f === "all" || item.dataset.tags.split(" ").includes(f);
        item.classList.toggle("is-hidden", !show);
        if (show && !reduce) { item.style.animation = "none"; item.offsetHeight; item.style.animation = "fadeUp .6s var(--ease) both"; }
      });
    });
  });

  /* ---------- модалка лікаря ---------- */
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-doc]"); if (!c || !window.YDC_DOCTORS) return;
    e.preventDefault();
    const d = window.YDC_DOCTORS[+c.dataset.doc], svcs = (window.YDC_SERVICES || []).filter(s => d.svc.includes(s.id));
    const box = $("#doc .doc-modal"); if (!box) return;
    const base = c.dataset.base || "";
    box.innerHTML = `<img src="${base}img/doctors/${d.img}.jpg" alt="${d.n}" width="535" height="736"><div><h3>${d.n}</h3><p class="doc-modal__role">${d.r}</p>${svcs.length ? `<p class="muted" style="margin-bottom:10px">Напрямки роботи:</p><ul>${svcs.map(s => `<li><a href="${base}poslugy.html#${s.id}">${s.title}</a></li>`).join("")}</ul>` : `<p class="muted">Запис на прийом за телефоном <a href="tel:${window.YDC.phone2}" style="font-weight:700;color:var(--ink)">${window.YDC.phone2View}</a></p>`}<a class="btn" href="tel:${d.svc.length ? window.YDC.phone : window.YDC.phone2}">Зателефонувати</a></div>`;
    openModal("doc");
  });


  document.addEventListener('keydown', e => {
    if(e.key!=='Tab')return;
    const dialog=document.querySelector('.lightbox.is-open,.modal.is-open');if(!dialog)return;
    const items=Array.from(dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')).filter(x=>!x.disabled && x.getClientRects().length);
    if(!items.length)return;const first=items[0],last=items[items.length-1];
    if(e.shiftKey && (document.activeElement===first || !dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey && (document.activeElement===last || !dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  });

  /* ---------- toast ---------- */
  window.YDCToast = msg => { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.classList.add("is-on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("is-on"), 2600); };
  $$("[data-copy]").forEach(b => b.addEventListener("click", () => { const v = b.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => YDCToast("Скопійовано: " + v)).catch(() => YDCToast(v)); }));

  /* ---------- рік у футері ---------- */
  $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
})();
