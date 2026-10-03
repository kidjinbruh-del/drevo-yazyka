/* ==========================================================================
   Слой приложения для «Древа языка».

   Сайт работает и в браузере. Здесь всё, что нужно именно телефону:
   тёмная тема с переключателем, нижняя панель вкладок вместо верхнего меню,
   выгрузка и загрузка «своего дерева» файлом, цвет статус-бара в тон теме.
   Никаких аккаунтов и сети: файл уходит через системное «Поделиться».
   ========================================================================== */

(function () {
  'use strict';

  var STATE_KEY = 'drevo_state_v1';
  var SUB_KEY = 'drevo_sub_v1';
  var THEME_KEY = 'dy_theme';
  var isApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var plugins = (window.Capacitor && window.Capacitor.Plugins) || {};

  /* ---------- тема ------------------------------------------------------ */

  function resolveTheme(pref) {
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(pref) {
    var t = resolveTheme(pref);
    document.documentElement.setAttribute('data-theme', t);
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b1410';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', bg);
    if (plugins.StatusBar) {
      // Плагин красит статус-бар; в браузере он просто отсутствует.
      try { plugins.StatusBar.setBackgroundColor({ color: bg }).catch(function () {}); } catch (e) {}
      try { plugins.StatusBar.setStyle({ style: t === 'dark' ? 'LIGHT' : 'DARK' }).catch(function () {}); } catch (e) {}
    }
    return t;
  }

  function currentPref() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }

  /* ---------- нижняя панель вкладок ------------------------------------- */

  var TABS = [
    { href: 'index.html', ic: '🌳', label: 'Дерево' },
    { href: 'rules.html', ic: '📚', label: 'Правила' },
    { href: 'quiz.html', ic: '✏️', label: 'Тренировка' },
    { href: 'parent.html', ic: '🏠', label: 'Родителям' }
  ];

  function buildTabbar() {
    var here = location.pathname.split('/').pop() || 'index.html';
    var bar = document.createElement('nav');
    bar.className = 'app-tabbar';
    bar.setAttribute('aria-label', 'Разделы');
    TABS.forEach(function (t) {
      var a = document.createElement('a');
      a.href = t.href;
      var ic = document.createElement('span');
      ic.className = 'tab-ic';
      ic.textContent = t.ic;
      var tx = document.createElement('span');
      tx.textContent = t.label;
      a.appendChild(ic);
      a.appendChild(tx);
      if (here === t.href || (t.href === 'rules.html' && here === 'rule.html')) {
        a.setAttribute('aria-current', 'page');
      }
      bar.appendChild(a);
    });
    document.body.appendChild(bar);
  }

  /* ---------- кнопки в шапке -------------------------------------------- */

  function buildTools() {
    var pad = document.querySelector('.grade-pad');
    if (!pad || document.querySelector('.app-tools')) return;
    var tools = document.createElement('div');
    tools.className = 'app-tools';

    var theme = document.createElement('button');
    theme.className = 'icon-btn';
    theme.title = 'Тема: как в системе';
    theme.setAttribute('aria-label', 'Сменить тему');
    function paintThemeBtn() {
      var p = currentPref();
      theme.textContent = p === 'auto' ? '🌗' : (p === 'dark' ? '🌙' : '☀️');
      theme.title = 'Тема: ' + (p === 'auto' ? 'как в системе' : p === 'dark' ? 'тёмная' : 'светлая');
    }
    paintThemeBtn();
    theme.onclick = function () {
      var order = ['auto', 'dark', 'light'];
      var next = order[(order.indexOf(currentPref()) + 1) % order.length];
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
      paintThemeBtn();
      toast(next === 'auto' ? 'Тема — как в системе' : (next === 'dark' ? 'Тёмная тема' : 'Светлая тема'));
    };

    var share = document.createElement('button');
    share.className = 'icon-btn';
    share.title = 'Поделиться деревом';
    share.setAttribute('aria-label', 'Поделиться деревом');
    share.textContent = '↗';
    share.onclick = function () { shareProgress(); };

    tools.appendChild(theme);
    tools.appendChild(share);
    pad.appendChild(tools);
  }

  /* ---------- выгрузка и загрузка «своего дерева» ----------------------- */

  function progressPayload() {
    var state = {};
    var sub = {};
    try { state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch (e) {}
    try { sub = JSON.parse(localStorage.getItem(SUB_KEY) || '{}'); } catch (e) {}
    return {
      app: 'drevo-yazyka',
      format: 1,
      exportedAt: new Date().toISOString(),
      state: state,
      submissions: sub
    };
  }

  function shareProgress() {
    var payload = JSON.stringify(progressPayload(), null, 2);
    var name = 'drevo-yazyka-progress.json';
    if (isApp && plugins.Filesystem && plugins.Share) {
      plugins.Filesystem.writeFile({
        path: name,
        data: payload,
        directory: 'CACHE',
        encoding: 'utf8'
      }).then(function () {
        return plugins.Filesystem.getUri({ path: name, directory: 'CACHE' });
      }).then(function (r) {
        return plugins.Share.share({ title: 'Моё дерево языка', text: 'Прогресс по правилам русского языка', url: r.uri, dialogTitle: 'Поделиться деревом' });
      }).then(function () {
        toast('Файл отправлен');
      }).catch(function (e) {
        toast('Не получилось поделиться: ' + (e && e.message ? e.message : e), true);
      });
      return;
    }
    // Браузер: обычное скачивание файла.
    var blob = new Blob([payload], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Файл сохранён');
  }

  function importProgress() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result || ''));
          if (!data || !data.state) throw new Error('в файле нет состояния');
          localStorage.setItem(STATE_KEY, JSON.stringify(data.state));
          if (data.submissions) localStorage.setItem(SUB_KEY, JSON.stringify(data.submissions));
          toast('Дерево загружено');
          setTimeout(function () { location.reload(); }, 600);
        } catch (e) {
          toast('Файл не прочитан: ' + (e && e.message ? e.message : e), true);
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  /* ---------- всплывашки ------------------------------------------------- */

  function toast(text, bad) {
    var t = document.getElementById('dy-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dy-toast';
      t.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:calc(var(--tab-h) + env(safe-area-inset-bottom) + 18px)',
        'transform:translateX(-50%)', 'background:var(--card)', 'color:var(--text)',
        'border:1px solid var(--line)', 'border-radius:12px', 'padding:10px 16px',
        'font:600 13px/1.3 "Segoe UI",Roboto,system-ui,sans-serif', 'z-index:60',
        'box-shadow:var(--shadow)', 'opacity:0', 'transition:opacity .18s', 'pointer-events:none',
        'max-width:86vw', 'text-align:center'
      ].join(';');
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = '1';
    if (bad) t.style.borderColor = 'var(--bad)'; else t.style.borderColor = 'var(--leaf)';
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.opacity = '0'; }, 1900);
  }

  /* ---------- мелочи ----------------------------------------------------- */

  function guardExternalLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/^(https?:)?\/\//.test(href)) {
        e.preventDefault();
        if (isApp && plugins.Share) {
          plugins.Share.share({ title: 'Ссылка', url: href.indexOf('//') === 0 ? 'https:' + href : href });
        } else {
          window.open(href, '_blank', 'noopener');
        }
      }
    });
  }

  function init() {
    applyTheme(currentPref());
    buildTools();
    buildTabbar();
    guardExternalLinks();
    // Кнопка загрузки — только на странице родителя, там ей место.
    if (/parent\.html$/.test(location.pathname)) {
      var pad = document.querySelector('.grade-pad');
      if (pad && !document.querySelector('.dy-import')) {
        var b = document.createElement('button');
        b.className = 'icon-btn dy-import';
        b.title = 'Загрузить своё дерево';
        b.setAttribute('aria-label', 'Загрузить своё дерево');
        b.textContent = '📥';
        b.onclick = importProgress;
        pad.appendChild(b);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Публичный интерфейс: страницы и тесты могут до него дотянуться.
  window.DrevoApp = {
    applyTheme: applyTheme,
    currentPref: currentPref,
    shareProgress: shareProgress,
    importProgress: importProgress,
    toast: toast,
    isApp: isApp
  };
})();