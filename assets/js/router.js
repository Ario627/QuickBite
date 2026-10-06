(function (SC) {
  "use strict";

  const routes = [];
  let outlet = null;
  let active = null;
  let fallback = null;
  let first = true;

  function compile(pattern) {
    const keys = [];
    const segments = pattern
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        if (segment.charCodeAt(0) === 58) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      });
    const source = segments.length ? `/${segments.join("/")}/?` : "/?";
    return { keys, pattern: new RegExp(`^${source}$`) };
  }

  function add(pattern, handler) {
    routes.push(Object.assign(compile(pattern), { handler }));
    return SC.router;
  }

  function fallbackTo(handler) {
    fallback = handler;
    return SC.router;
  }

  function location_() {
    const raw = window.location.hash.replace(/^#/, "");
    const [rawPath, rawQuery] = raw.split("?");
    const path = rawPath && rawPath.startsWith("/") ? rawPath : `/${rawPath || ""}`;
    return { path: path === "/" ? "/" : path.replace(/\/+$/, ""), query: new URLSearchParams(rawQuery || "") };
  }

  function resolve(path) {
    for (let index = 0; index < routes.length; index += 1) {
      const route = routes[index];
      const match = route.pattern.exec(path);
      if (!match) continue;
      const params = {};
      route.keys.forEach((key, position) => {
        params[key] = decodeURIComponent(match[position + 1]);
      });
      return { route, params };
    }
    return { route: null, params: {} };
  }

  function context() {
    const { path, query } = location_();
    return Object.assign({ path, query }, resolve(path));
  }

  function render() {
    const ctx = context();

    if (active && typeof active.destroy === "function") active.destroy();
    active = null;

    let view;
    try {
      const handler = ctx.route ? ctx.route.handler : fallback;
      view = handler ? handler(ctx) : null;
    } catch (error) {
      view = SC.views.error(ctx, error);
      window.console.error(error);
    }

    if (!view) view = SC.views.error(ctx, new Error("view kosong"));

    document.title = view.title || "QuickBite";
    document.body.dataset.route = ctx.path;
    document.body.dataset.view = view.name || ctx.path.replace(/\W+/g, "") || "beranda";

    outlet.replaceChildren(view.el);

    if (typeof view.mount === "function") view.mount(view.el);
    active = view;

    SC.layout.syncNav(ctx.path);
    SC.layout.enter(outlet);
    SC.motion.wake(outlet);
    SC.motion.countAll(outlet);
    SC.motion.fresh(outlet);

    if (first) {
      first = false;
    } else {
      window.scrollTo(0, 0);
      outlet.focus({ preventScroll: true });
      SC.layout.announce(view.announce || view.title || "");
    }
  }

  function go(path, options) {
    const settings = options || {};
    const target = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (window.location.hash === target) {
      render();
      return;
    }
    if (settings.replace) window.history.replaceState(null, "", target);
    else window.location.hash = target;
    if (settings.replace) render();
  }

  function start(node) {
    outlet = node;
    outlet.setAttribute("tabindex", "-1");
    if (!window.location.hash || window.location.hash === "#") {
      window.history.replaceState(null, "", "#/");
    }
    window.addEventListener("hashchange", render);
    render();
  }

  SC.router = { add, fallback: fallbackTo, start, go, context };
})(window.SC || (window.SC = {}));
