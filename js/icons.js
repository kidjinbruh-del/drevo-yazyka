/* icons.js — маленький SVG-набор без эмодзи (философия RFC Garden).
   Использование: <i data-ic="speaker"></i>, затем ICON.scan(). */
var ICON = (function () {
  var paths = {
    speaker: '<path d="M3 10v4h3l4 4V6L6 10H3z"/><path d="M15 9a4 4 0 0 1 0 6" fill="none"/><path d="M17.5 6.5a8 8 0 0 1 0 11" fill="none"/>',
    check: '<path d="M4 12l5 5L20 6" fill="none"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" fill="none"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6" fill="none"/>',
    chevR: '<path d="M9 5l7 7-7 7" fill="none"/>',
    leaf: '<path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16z" fill="none"/><path d="M20 4c-4 4-7 8-9 13" fill="none"/>',
    search: '<circle cx="11" cy="11" r="6" fill="none"/><path d="M16 16l5 5" fill="none"/>',
    printer: '<path d="M7 8V3h10v5" fill="none"/><rect x="4" y="8" width="16" height="8" rx="1"/><path d="M7 14h10v7H7z" fill="none"/>',
    book: '<path d="M12 6c-2-2-5-2-8-1v12c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 2z" fill="none"/><path d="M12 6v12" fill="none"/>',
    home: '<path d="M4 11l8-7 8 7" fill="none"/><path d="M6 10v10h12V10" fill="none"/>',
    play: '<path d="M8 5l12 7-12 7V5z"/>',
    star: '<path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2-5.6-3.1-5.6 3.1 1.2-6.2L3 9.5l6.3-.8z" fill="none"/>',
    grow: '<path d="M12 21v-9" fill="none"/><path d="M12 12c0-3 2-5 5-5" fill="none"/><path d="M12 12c0-3-2-5-5-5" fill="none"/><circle cx="17" cy="6" r="2"/><circle cx="7" cy="6" r="2"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 13-6M20 12a8 8 0 0 1-13 6" fill="none"/><path d="M17 3l3 4 4-2" fill="none"/>'
  };
  return {
    svg: function (name, cls) {
      var p = paths[name];
      if (!p) return "";
      return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + p + "</svg>";
    },
    render: function (name, cls) {
      var el = document.createElement("span");
      el.className = "ic-wrap";
      el.innerHTML = ICON.svg(name, cls);
      return el;
    },
    scan: function (root) {
      var els = (root || document).querySelectorAll("[data-ic]");
      for (var i = 0; i < els.length; i++) {
        els[i].innerHTML = ICON.svg(els[i].getAttribute("data-ic"));
      }
    }
  };
})();