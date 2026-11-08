/**
 * VRChat Share — Jellyfin item overflow-menu hook (JF12 modern + legacy).
 * Opens {baseUrl}/item/{jellyfinItemId}. Lives in the ⋮ sheet only.
 */
(function () {
  'use strict';

  if (window.__VRCHAT_SHARE_INSTALLED__) return;
  window.__VRCHAT_SHARE_INSTALLED__ = true;

  var DATA_ID = 'vrchat-share';
  var CONTEXT_TTL_MS = 8000;
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
    baseUrl: '',
    openInNewTab: true
  }, window.__VRCHAT_SHARE_BOOT__ || {});

  var context = null;
  var scheduled = false;

  // Remove the mistaken 0.1.1 detail-page text button if a stale inject left it behind.
  try {
    var stray = document.getElementById('vrchat-share-detail-btn');
    if (stray) stray.remove();
  } catch (e) { /* ignore */ }

  function loadConfig() {
    return fetch('/VrchatShare/config', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        config.enabled = j.enabled !== false;
        if (j.baseUrl) config.baseUrl = String(j.baseUrl).replace(/\/$/, '');
        if (typeof j.openInNewTab === 'boolean') config.openInNewTab = j.openInNewTab;
      })
      .catch(function () { /* keep boot/defaults */ });
  }

  /** JF12 modern details: /web/#/details?id=<guid> */
  function itemIdFromLocation() {
    try {
      var href = String(window.location.href || '');
      var hash = String(window.location.hash || '');
      var search = String(window.location.search || '');
      var candidates = [search, hash, href];
      for (var i = 0; i < candidates.length; i++) {
        var m = candidates[i].match(/[?&#]id=([a-f0-9]{32})/i)
          || candidates[i].match(/\/details\/([a-f0-9]{32})/i)
          || candidates[i].match(/[?&#]id=([0-9a-f-]{36})/i);
        if (m) return m[1].replace(/-/g, '');
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function detailItemIdLegacy() {
    try {
      var page = document.querySelector('#itemDetailPage');
      if (!page) return null;
      return page.getAttribute('data-id') || page.dataset.id || null;
    } catch (e) {
      return null;
    }
  }

  function normalizeId(id) {
    if (!id) return null;
    return String(id).replace(/-/g, '').toLowerCase();
  }

  function capture(e) {
    var el = e.target instanceof Element ? e.target : null;
    if (!el || el.closest('.actionSheet, .dialogContainer, .MuiDialog-root')) return;

    var more = el.closest('.btnMoreCommands, button.btnMoreCommands, .MuiIconButton-root.btnMoreCommands');
    if (more) {
      var fromUrl = itemIdFromLocation();
      var fromLegacy = detailItemIdLegacy();
      var fromCard = null;
      var cardNear = more.closest('.card[data-id], .listItem[data-id], [data-id][data-type]');
      if (cardNear) fromCard = cardNear.getAttribute('data-id') || cardNear.dataset.id;
      var itemId = normalizeId(fromCard || fromUrl || fromLegacy);
      if (!itemId) {
        context = null;
        console.warn('[VRChat Share] MoreCommands click but no item id');
        return;
      }
      var type = cardNear ? (cardNear.getAttribute('data-type') || cardNear.dataset.type || null) : null;
      context = { itemId: itemId, type: type, opener: more, ts: Date.now() };
      return;
    }

    var button = e.type === 'contextmenu' ? el : el.closest('button[data-action="menu"]');
    if (!button && e.type !== 'contextmenu') return;
    var card = (button || el).closest('.card[data-id], .listItem[data-id], [data-id][data-type]');
    if (!card) {
      if (e.type !== 'contextmenu') context = null;
      return;
    }
    var cardId = normalizeId(card.getAttribute('data-id') || card.dataset.id);
    if (!cardId) { context = null; return; }
    context = {
      itemId: cardId,
      type: card.getAttribute('data-type') || card.dataset.type || null,
      opener: e.type === 'contextmenu' ? card : button,
      ts: Date.now()
    };
  }

  function activeScroller() {
    return document.querySelector('.actionSheetScroller')
      || document.querySelector('.actionSheet .scrollContainer')
      || document.querySelector('.MuiDrawer-root .actionSheetScroller')
      || null;
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
    var id = normalizeId(itemId);
    if (!id) return;
    var base = String(config.baseUrl || '').replace(/\/$/, '');
    if (!base) {
      console.warn('[VRChat Share] BaseUrl is not configured — set it in Dashboard → Plugins → VRChat Share');
      return;
    }
    var target = base + '/item/' + encodeURIComponent(id);
    console.info('[VRChat Share] opening', target);
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
      .catch(function () { return ctx.type || 'Movie'; });
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
      if (type && !ALLOWED_TYPES[type]) return;
      if (scroller.querySelector('[data-id="' + DATA_ID + '"]')) return;

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
      console.debug('[VRChat Share] injected menu row for', ctx.itemId, type);
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
    var strayBtn = document.getElementById('vrchat-share-detail-btn');
    if (strayBtn) strayBtn.remove();
    if (scheduled || !context || !touchesSheet(mutations)) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      try { inject(); } catch (err) { console.warn('[VRChat Share] menu inject failed', err); }
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  loadConfig().then(function () {
    console.info('[VRChat Share] ready →', config.baseUrl + '/item/{Id} (overflow menu only)');
  });
})();
