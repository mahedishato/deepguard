/* ==========================================================================
   Shared client-side logic for the demo frontend.
   - Mock authentication (localStorage). Any username/password is accepted.
   - Shared navbar / footer rendering so every page stays consistent.
   - Analysis history (localStorage) for the Detect and History pages.
   Replace `Auth` and `History` with real API calls once the backend is wired.
   ========================================================================== */

(function () {
  "use strict";

  const AUTH_KEY = "dfd_demo_user";
  const HISTORY_KEY = "dfd_demo_history";
  const MAX_HISTORY = 50;

  /* ---------------- Auth ---------------- */
  const Auth = {
    get() {
      try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
    },
    set(user) { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); },
    clear() { localStorage.removeItem(AUTH_KEY); },
    isLoggedIn() { return !!Auth.get(); },
    login(username) {
      const name = String(username || "").trim();
      const display = name.includes("@") ? name.split("@")[0] : name;
      Auth.set({ username: name, name: display || "User", loggedInAt: Date.now() });
    },
    register(fullName, email) {
      Auth.set({ username: email, name: fullName || email.split("@")[0], loggedInAt: Date.now() });
    },
    logout() {
      Auth.clear();
      window.location.href = "login.html";
    },
    /* Call on pages that need a signed-in user. */
    require() {
      if (!Auth.isLoggedIn()) {
        const next = encodeURIComponent(location.pathname.split("/").pop() || "detect.html");
        window.location.replace("login.html?next=" + next);
        return false;
      }
      return true;
    },
    /* Call on login/register pages. */
    redirectIfLoggedIn() {
      if (Auth.isLoggedIn()) window.location.replace(nextTarget());
    },
  };

  function nextTarget() {
    const p = new URLSearchParams(location.search).get("next");
    return p && /^[\w.-]+\.html$/.test(p) ? p : "detect.html";
  }

  /* ---------------- History ---------------- */
  const History = {
    all() {
      try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
    },
    add(entry) {
      const list = History.all();
      list.unshift(entry);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); }
      catch { /* quota exceeded: drop thumbnails and retry once */
        list.forEach((e) => delete e.thumb);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); } catch {}
      }
    },
    remove(id) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(History.all().filter((e) => e.id !== id)));
    },
    clear() { localStorage.removeItem(HISTORY_KEY); },
  };

  /* ---------------- Utilities ---------------- */
  const Util = {
    stripExtension(name) { return String(name).replace(/\.[^/.]+$/, ""); },
    formatBytes(n) {
      if (!Number.isFinite(n)) return "—";
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
      return (n / (1024 * 1024)).toFixed(2) + " MB";
    },
    formatDate(ts) {
      return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    },
    /* Deterministic pseudo-score so the same file always gets the same number. */
    hashScore(str, min, max) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return min + (h % (max - min + 1));
    },
    initials(name) { return String(name || "?").trim().charAt(0).toUpperCase(); },
    escape(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    },
    toast(msg, ms = 2600) {
      let el = document.querySelector(".toast");
      if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("show"), ms);
    },
  };

  /* ---------------- Icons ---------------- */
  const Icons = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };

  /* ---------------- Navbar & footer ---------------- */
  const NAV_LINKS = [
    { href: "index.html", label: "Home" },
    { href: "detect.html", label: "Detect" },
    { href: "history.html", label: "History", auth: true },
    { href: "about.html", label: "About" },
    { href: "research.html", label: "Research" },
    { href: "contact.html", label: "Contact" },
  ];

  function currentPage() {
    return (document.body.dataset.page || location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");
  }

  function renderNav() {
    const mount = document.getElementById("site-nav");
    if (!mount) return;
    const user = Auth.get();
    const page = currentPage();
    const links = NAV_LINKS.filter((l) => !l.auth || user);
    const linkHtml = (cls) => links.map((l) =>
      `<a href="${l.href}" class="${l.href.replace(/\.html$/, "") === page ? "active" : ""}">${l.label}</a>`
    ).join("");

    const actions = user
      ? `<span class="user-chip"><span class="avatar">${Util.initials(user.name)}</span><span class="name">${Util.escape(user.name)}</span></span>
         <button class="btn btn-ghost btn-sm hide-mobile" id="nav-logout">Log out</button>`
      : `<a class="btn btn-ghost btn-sm hide-mobile" href="login.html">Sign in</a>
         <a class="btn btn-primary btn-sm" href="register.html">Get started</a>`;

    mount.className = "navbar";
    mount.innerHTML = `
      <div class="container nav-inner">
        <a class="brand" href="index.html" aria-label="Explainable Deepfake Detection — home">
          <span class="brand-mark">${Icons.logo}</span>
          <span>DeepGuard<span class="brand-sub">Explainable Deepfake Detection</span></span>
        </a>
        <nav class="nav-links" aria-label="Primary">${linkHtml()}</nav>
        <div class="nav-actions">
          ${actions}
          <button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false">${Icons.menu}</button>
        </div>
      </div>
      <div class="nav-mobile" id="nav-mobile">
        ${linkHtml()}
        <div class="divider"></div>
        ${user
          ? `<a href="#" id="nav-logout-m">Log out (${Util.escape(user.name)})</a>`
          : `<a href="login.html">Sign in</a><a href="register.html">Create account</a>`}
      </div>`;

    const toggle = document.getElementById("nav-toggle");
    const mobile = document.getElementById("nav-mobile");
    toggle.addEventListener("click", () => {
      const open = mobile.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open ? Icons.close : Icons.menu;
    });
    document.getElementById("nav-logout")?.addEventListener("click", Auth.logout);
    document.getElementById("nav-logout-m")?.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); });
  }

  function renderFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    mount.className = "footer";
    mount.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="index.html"><span class="brand-mark">${Icons.logo}</span><span>DeepGuard</span></a>
            <p class="mt-16">Explainable deepfake detection with Vision Transformers, frequency-domain fusion, and attention-rollout explanations. A thesis research project.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul><li><a href="detect.html">Detect</a></li><li><a href="history.html">History</a></li><li><a href="about.html#how-it-works">How it works</a></li></ul>
          </div>
          <div>
            <h4>Research</h4>
            <ul><li><a href="research.html">Results</a></li><li><a href="research.html#cross-dataset">Generalization</a></li><li><a href="research.html#custom">Custom dataset</a></li></ul>
          </div>
          <div>
            <h4>Project</h4>
            <ul><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li><li><a href="https://huggingface.co/mahedi420/deepfake-vit-detector" target="_blank" rel="noopener">Model on Hugging Face</a></li></ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} Explainable Deepfake Detection. Research prototype.</span>
          <span>Demo build &middot; predictions are simulated until the inference API is connected.</span>
        </div>
      </div>`;
  }

  document.addEventListener("DOMContentLoaded", () => { renderNav(); renderFooter(); });

  window.App = { Auth, History, Util, Icons };
})();
