/* Nova Kanata — interactions */
(() => {
  "use strict";

  // Set this to a GoHighLevel inbound webhook URL to send quote requests to the CRM.
  const GHL_WEBHOOK_URL = "";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  /* ---------- year ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduceMotion && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id.length > 1 ? $(id) : null;
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  /* ---------- header ---------- */
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = $(".menu-toggle");
  const menu = $(".mobile-menu");
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- lazy-play background videos only when visible ---------- */
  const autoVids = $$("video[autoplay]");
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.play().catch(() => {}); }
      else target.pause();
    });
  }, { threshold: 0.05 });
  autoVids.forEach((v) => vio.observe(v));

  /* ---------- before / after ---------- */
  $$("[data-ba]").forEach((ba) => {
    const range = $(".ba-range", ba);
    const set = (v) => ba.style.setProperty("--pos", v + "%");
    range.addEventListener("input", () => set(range.value));
    set(range.value);
    // gentle intro sweep so people notice it's interactive
    if (!reduceMotion) {
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        let t0 = null;
        const sweep = (t) => {
          if (!t0) t0 = t;
          const k = Math.min((t - t0) / 2200, 1);
          const v = 50 + Math.sin(k * Math.PI * 2) * 28 * (1 - k);
          range.value = v; set(v);
          if (k < 1) requestAnimationFrame(sweep);
        };
        requestAnimationFrame(sweep);
      }, { threshold: 0.6 });
      io.observe(ba);
    }
  });

  /* ---------- colour studio ---------- */
  const glowColours = { charcoal: "rgba(201,169,106,.35)", grey: "rgba(170,178,186,.45)", brown: "rgba(176,120,72,.4)" };
  $$(".swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      const pick = sw.dataset.pick;
      $$(".swatch").forEach((s) => { s.classList.toggle("is-active", s === sw); s.setAttribute("aria-checked", String(s === sw)); });
      $$(".studio-gate").forEach((g) => g.classList.toggle("is-active", g.dataset.colour === pick));
      const glow = $("[data-glow]");
      if (glow) glow.style.background = `radial-gradient(circle, ${glowColours[pick]}, transparent 65%)`;
    });
  });

  /* ---------- showroom reel ---------- */
  const reel = $(".reel");
  if (reel) {
    const v = $(".reel-video", reel);
    $(".reel-play", reel).addEventListener("click", () => {
      v.controls = true; v.play(); reel.classList.add("is-playing");
    });
    v.addEventListener("ended", () => { reel.classList.remove("is-playing"); v.controls = false; });
  }

  /* ---------- lightbox ---------- */
  const lb = $(".lightbox");
  const lbImg = $("img", lb);
  $$(".m-item").forEach((btn) => btn.addEventListener("click", () => {
    lbImg.src = btn.dataset.full; lbImg.alt = $("img", btn).alt; lb.hidden = false; lenis && lenis.stop();
  }));
  const closeLb = () => { lb.hidden = true; lenis && lenis.start(); };
  lb.addEventListener("click", (e) => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLb(); });

  /* ---------- quote form ---------- */
  const form = $(".qform");
  if (form) {
    const steps = $$(".q-step", form);
    const total = steps.length;
    const bar = $(".q-progress span", form);
    const count = $(".q-count b", form);
    const next = $(".q-next", form), back = $(".q-back", form), submit = $(".q-submit", form);
    const err = $(".q-error", form);
    let i = 0;

    const show = (n) => {
      i = n;
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
      bar.style.width = ((i + 1) / total) * 100 + "%";
      count.textContent = i + 1;
      back.hidden = i === 0;
      next.hidden = i === total - 1;
      submit.hidden = i !== total - 1;
      err.textContent = "";
    };

    const validStep = () => {
      const s = steps[i];
      const radios = [...new Set($$("input[type=radio][required]", s).map((r) => r.name))];
      for (const name of radios) {
        if (!$(`input[name="${name}"]:checked`, s)) { err.textContent = "Please choose an option to continue."; return false; }
      }
      let ok = true;
      $$("input:not([type=radio])", s).forEach((inp) => {
        let good = inp.value.trim() !== "";
        if (inp.name === "email") good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
        if (inp.name === "phone") good = inp.value.replace(/\D/g, "").length >= 10;
        if (inp.name === "postal") good = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(inp.value.trim());
        inp.classList.toggle("is-bad", !good);
        if (!good) ok = false;
      });
      if (!ok) err.textContent = "Please check the highlighted fields.";
      return ok;
    };

    // auto-advance on single-choice steps for a snappy feel
    steps.forEach((s, k) => {
      s.addEventListener("change", (e) => {
        if (e.target.type !== "radio") return;
        const names = [...new Set($$("input[type=radio]", s).map((r) => r.name))];
        const allChosen = names.every((n) => $(`input[name="${n}"]:checked`, s));
        if (allChosen && k < total - 1) setTimeout(() => show(k + 1), 260);
      });
    });

    next.addEventListener("click", () => { if (validStep()) show(i + 1); });
    back.addEventListener("click", () => show(i - 1));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validStep()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      data.source = "novakanata-demo-site";
      if (GHL_WEBHOOK_URL) {
        try { await fetch(GHL_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }
        catch (_) { /* demo: still show success */ }
      }
      $("[data-name]", form).textContent = (data.name || "there").split(" ")[0];
      steps.forEach((s) => s.classList.remove("is-active"));
      $(".q-success", form).hidden = false;
      form.classList.add("is-done");
      err.textContent = "";
    });
    show(0);
  }

  /* ---------- animations ---------- */
  // "?static" shows everything without animation (used for screenshots / print)
  if (!hasGsap || reduceMotion || new URLSearchParams(location.search).has("static")) return;
  document.documentElement.classList.add("anim");
  gsap.registerPlugin(ScrollTrigger);

  // hero intro
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(".hero-title .line > *", { y: 0, duration: 1.3, stagger: 0.14 }, 0.15)
    .to(".hero .reveal", { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.55)
    .from(".frame-main", { opacity: 0, y: 60, scale: 0.96, duration: 1.4 }, 0.3)
    .from(".frame-small", { opacity: 0, x: -40, duration: 1.2 }, 0.7)
    .from(".glass-chip", { opacity: 0, y: 20, duration: 1 }, 1.0);

  // generic reveals (outside hero)
  $$(".reveal").filter((el) => !el.closest(".hero")).forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });

  // parallax
  $$(".parallax").forEach((el) => {
    const speed = parseFloat(el.dataset.speed || 0.1);
    gsap.to(el, { yPercent: speed * 100, ease: "none",
      scrollTrigger: { trigger: el.closest("section"), start: "top bottom", end: "bottom top", scrub: true } });
  });

  // cross-section callouts
  gsap.from(".callout", { opacity: 0, x: (k) => (k % 2 ? 30 : -30), duration: 1, stagger: 0.18, ease: "power3.out",
    scrollTrigger: { trigger: ".board-diagram", start: "top 70%", once: true } });
  gsap.from(".c-line", { scaleX: 0, transformOrigin: "center", duration: 0.8, stagger: 0.18, delay: 0.2,
    scrollTrigger: { trigger: ".board-diagram", start: "top 70%", once: true } });
  gsap.fromTo(".board-img", { rotate: -4, scale: 0.94 }, { rotate: 2, scale: 1.02, ease: "none",
    scrollTrigger: { trigger: ".board-diagram", start: "top bottom", end: "bottom top", scrub: true } });

  // number counters
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count;
    const o = { v: 0 };
    el.textContent = "0";
    gsap.to(o, { v: end, duration: 2, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });

  // process line
  const line = $(".steps-line");
  if (line) {
    ScrollTrigger.create({ trigger: ".steps", start: "top 75%", end: "bottom 60%", scrub: true,
      onUpdate: (st) => line.style.setProperty("--p", st.progress.toFixed(3)) });
  }

  // gallery: slight staggered drift
  gsap.utils.toArray(".m-item").forEach((el, k) => {
    gsap.to(el, { y: (k % 3) * -18, ease: "none",
      scrollTrigger: { trigger: ".masonry", start: "top bottom", end: "bottom top", scrub: true } });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
