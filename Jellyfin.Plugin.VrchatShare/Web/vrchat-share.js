/**
 * VRChat Share — Jellyfin item menu hook.
 * Opens {baseUrl}/item/{jellyfinItemId} (vrchat-jellyfin deeplink contract).
 *
 * Works as:
 * - Embedded plugin script registered via JavaScript Injector
 * - Standalone paste into JS Injector (set window.__VRCHAT_SHARE_BOOT__ first, optional)
 */
(function () {
  'use strict';

  if (window.__VRCHAT_SHARE_INSTALLED__) return;
  window.__VRCHAT_SHARE_INSTALLED__ = true;

  var DATA_ID = 'vrchat-share';
  var CONTEXT_TTL_MS = 5000;
  var ITEM_ROWS = [
    'addtocollection', 'addtoplaylist', 'share', 'edit', 'editimages', 'editsubtitles',
    'identify', 'moremediainfo', 'refresh', 'delete', 'download', 'copy-stream',
    'playallfromhere', 'queueallfromhere', 'resume', 'play', 'queue', 'shuffle',
    'instantmix', 'multiSelect', 'removefromcollection'
  ];
  var ITEM_ROW_SELECTOR = ITEM_ROWS.map(function (id) { return '[data-id="' + id + '"]'; }).join(', ');
  var ALLOWED_TYPES = { Movie: 1, Episode: 1, Series: 1, Season: 1 };

  var config = Object.assign({
    enabled: true,
    baseUrl: 'https://vrchat.introvrtlounge.com',
    openInNewTab: true
  }, window.__VRCHAT_SHARE_BOOT__ || {});

  var context = null;
  var scheduled = false;

  function loadConfig() {
    var url = '/VrchatShare/config';
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        config.enabled = j.enabled !== false;
        if (j.baseUrl) config.baseUrl = String(j.baseUrl).replace(/\/$/, '');
        if (typeof j.openInNewTab === 'boolean') config.openInNewTab = j.openInNewTab;
      })
      .catch(function () { /* keep boot/defaults */ });
  }

  function detailItemId() {
    try {
      var page = document.querySelector('#itemDetailPage');
      if (!page) return null;
      return page.getAttribute('data-id') || page.dataset.id || null;
    } catch (e) {
      return null;
    }
  }

  function capture(e) {
    var el = e.target instanceof Element ? e.target : null;
    if (!el || el.closest('.actionSheet, .dialogContainer')) return;

    var more = el.closest('.btnMoreCommands');
    if (more && more.closest('#itemDetailPage')) {
      var detailId = detailItemId();
      if (!detailId) { context = null; return; }
      context = { itemId: detailId, type: null, opener: more, ts: Date.now() };
      return;
    }

    var button = e.type === 'contextmenu' ? el : el.closest('button[data-action="menu"]');
    if (!button && e.type !== 'contextmenu') return;
    var card = (button || el).closest('.card[data-id], .listItem[data-id], [data-id][data-type]');
    if (!card) {
      if (e.type !== 'contextmenu') context = null;
      return;
    }
    var itemId = card.getAttribute('data-id') || card.dataset.id;
    if (!itemId) { context = null; return; }
    context = {
      itemId: itemId,
      type: card.getAttribute('data-type') || card.dataset.type || null,
      opener: e.type === 'contextmenu' ? card : button,
      ts: Date.now()
    };
  }

  function activeScroller() {
    return document.querySelector('.actionSheetScroller') ||
      document.querySelector('.actionSheet .scrollContainer') ||
      null;
  }

  function buildRow(scroller) {
    var ref = scroller.querySelector('.actionSheetMenuItem');
    var button = document.createElement('button');
    button.setAttribute('is', 'emby-button');
    button.type = 'button';
    button.className = (ref && ref.getAttribute('class') || 'listItem listItem-button actionSheetMenuItem')
      .replace(/\bselected\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    button.dataset.id = DATA_ID;

    var icon = document.createElement('span');
    icon.className = 'actionsheetMenuItemIcon listItemIcon listItemIcon-transparent material-icons open_in_new';
    icon.setAttribute('aria-hidden', 'true');

    var body = document.createElement('div');
    body.className = 'listItemBody actionsheetListItemBody';
    var text = document.createElement('div');
    text.className = 'listItemBodyText actionSheetItemText';
    text.textContent = 'Share in VRChat';
    body.appendChild(text);
    button.append(icon, body);
    return button;
  }

  function fitSheet(scroller) {
    var sheet = scroller.closest('.actionSheet, .dialog');
    if (!sheet) return;
    var top = parseFloat(sheet.style.top);
    if (!Number.isFinite(top)) return;
    var viewport = document.documentElement.clientHeight || window.innerHeight || 0;
    var overflow = top + sheet.offsetHeight - (viewport - 10);
    if (overflow > 0) sheet.style.top = Math.max(10, top - overflow) + 'px';
  }

  function openDeeplink(itemId) {
    var base = (config.baseUrl || 'https://vrchat.introvrtlounge.com').replace(/\/$/, '');
    var target = base + '/item/' + encodeURIComponent(itemId);
    if (config.openInNewTab) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(target);
    }
  }

  function resolveType(ctx) {
    if (ctx.type && ALLOWED_TYPES[ctx.type]) return Promise.resolve(ctx.type);
    if (typeof ApiClient === 'undefined' || !ApiClient.getCurrentUserId) {
      return Promise.resolve(ctx.type || 'Movie');
    }
    var userId = ApiClient.getCurrentUserId();
    return ApiClient.getItem(userId, ctx.itemId)
      .then(function (item) { return (item && item.Type) || ctx.type || null; })
      .catch(function () { return ctx.type || null; });
  }

  function inject() {
    if (!config.enabled) return;
    var scroller = activeScroller();
    if (!scroller) return;
    var existing = scroller.querySelector('[data-id="' + DATA_ID + '"]');
    var ctx = context;
    if (!scroller.querySelector(ITEM_ROW_SELECTOR) || !ctx || Date.now() - ctx.ts > CONTEXT_TTL_MS) {
      if (existing && (!ctx || existing.dataset.vrchatItemId !== (ctx && ctx.itemId))) existing.remove();
      return;
    }
    if (existing && existing.dataset.vrchatItemId === ctx.itemId) return;
    if (existing) existing.remove();

    resolveType(ctx).then(function (type) {
      if (!scroller.isConnected) return;
      if (!type || !ALLOWED_TYPES[type]) return;
      if (scroller.querySelector('[data-id="' + DATA_ID + '"]')) return;

      // One press → one sheet; clear so later sheets do not reuse this item.
      if (context === ctx) context = null;

      var row = buildRow(scroller);
      row.dataset.vrchatItemId = ctx.itemId;
      row.addEventListener('click', function () {
        setTimeout(function () { openDeeplink(ctx.itemId); }, 0);
      });
      var share = scroller.querySelector('[data-id="share"]');
      if (share) share.before(row);
      else scroller.appendChild(row);
      fitSheet(scroller);
    });
  }

  function touchesSheet(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.target && m.target.closest && m.target.closest('.actionSheet, .actionSheetScroller, .dialogContainer')) {
        return true;
      }
      for (var j = 0; j < m.addedNodes.length; j++) {
        var node = m.addedNodes[j];
        if (node.nodeType !== 1) continue;
        if (node.matches && (node.matches('.actionSheet, .actionSheetScroller, .dialogContainer') ||
            (node.querySelector && node.querySelector('.actionSheet, .actionSheetScroller')))) {
          return true;
        }
      }
    }
    return false;
  }

  document.addEventListener('click', capture, true);
  document.addEventListener('contextmenu', capture, true);

  var observer = new MutationObserver(function (mutations) {
    if (scheduled || !context || !touchesSheet(mutations)) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      try { inject(); } catch (err) { console.warn('[VRChat Share] menu inject failed', err); }
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  loadConfig().then(function () {
    console.info('[VRChat Share] ready →', config.baseUrl + '/item/{Id}');
  });
})();
