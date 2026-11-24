/* Al Naeem Jewellery L.L.C. – 24K Bullion Stock Count
   Offline app. All data stays on this phone (localStorage). */
(function () {
  'use strict';

  var VERSION = '1.3.0';
  var KEY = 'alnaeem-stock-v1';
  var BAR_SIZES = [1, 2.5, 5, 10, 15.55, 20, 31.1, 50, 100];
  var DEFAULT_TABLES = [
    { id: 'pamp', title: 'Fortuna PAMP Bars', short: 'PAMP bars', sizes: BAR_SIZES.slice() },
    { id: 'local', title: 'Local Bars', short: 'Local bars', sizes: BAR_SIZES.slice() },
    { id: 'coins', title: 'Local Coins', short: 'Coins', sizes: [1, 2, 4, 5, 8, 10] }
  ];
  var P = window.StockParser;
  var R = window.StockReport;
  var app = document.getElementById('app');
  var editing = {};       // tableId -> true when "edit sizes" is on
  var locked = false;
  var hiddenAt = 0;

  /* ---------- helpers ---------- */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function key(size) { return String(+size); }
  function hund(size) { return Math.round(size * 100); }            // grams × 100, exact integer
  function fmtNum(n) { return Number((+n).toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function fmtH(h) { return fmtNum(h / 100); }                       // from hundredths
  function fmtG(h) { return fmtH(h) + ' g'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dateObj(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dateLong(iso) { var d = dateObj(iso); return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function dateShort(iso) { var d = dateObj(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function timeNow() { var d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function timeOf(isoStamp) { var d = new Date(isoStamp); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function sizeLabel(s) { return fmtNum(s) + ' g'; }
  function sizeSub(s) { return P.sameSize(s, 31.1) ? '1 oz' : (P.sameSize(s, 15.55) ? '½ oz' : ''); }
  function digitsOnly(v) {
    v = String(v).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); })
                 .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); });
    return v.replace(/\D/g, '').slice(0, 5);
  }

  /* ---------- icons ---------- */
  var gid = 0;
  function diamond(size) {
    var id = 'dg' + (gid++);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" role="img" aria-label="Al Naeem blue diamond">' +
      '<defs><linearGradient id="' + id + 'a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BFF0FF"/><stop offset=".45" stop-color="#3FA2FF"/><stop offset="1" stop-color="#0A3C9E"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6FAFF"/><stop offset="1" stop-color="#6CC4FF"/></linearGradient></defs>' +
      '<polygon points="12,12 36,12 44,21 4,21" fill="url(#' + id + 'b)"/>' +
      '<polygon points="4,21 44,21 24,43" fill="url(#' + id + 'a)"/>' +
      '<path d="M4 21H44M12 12L18 21L24 12L30 21L36 12M18 21L24 43L30 21" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>' +
      '<polygon points="12,12 36,12 44,21 24,43 4,21" fill="none" stroke="#DFF6FF" stroke-width="1.2"/>' +
      '<path d="M40 2L41.1 6.9L46 8L41.1 9.1L40 14L38.9 9.1L34 8L38.9 6.9Z" fill="#fff"/>' +
      '<path d="M8 8L8.6 10.4L11 11L8.6 11.6L8 14L7.4 11.6L5 11L7.4 10.4Z" fill="#fff" fill-opacity=".85"/></svg>';
  }
  function ico(name, color, size) {
    var c = color || 'currentColor', s = size || 18;
    var paths = {
      share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/>',
      pdf: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M12 12v6"/><path d="M9 15l3 3 3-3"/>',
      camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
      chev: '<path d="M6 9l6 6 6-6"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      minus: '<path d="M6 12h12"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
      x: '<path d="M6 6l12 12M18 6L6 18"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      clip: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
      check: '<path d="M20 6L9 17l-5-5"/>',
      alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
      send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'
    };
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
  }

  /* ---------- state ---------- */
  function blankCounts(tables, old) {
    var c = {};
    tables.forEach(function (t) {
      c[t.id] = {};
      t.sizes.forEach(function (s) {
        var k = key(s), o = old && old[t.id] && old[t.id][k];
        c[t.id][k] = { ho: o ? (o.ho | 0) : 0, br: o ? (o.br | 0) : 0 };
      });
    });
    return c;
  }
  function fresh() {
    var t = clone(DEFAULT_TABLES);
    return { v: 1, tables: t, counts: blankCounts(t), date: todayISO(), updatedAt: null, mode: 'owner', pinHash: null, ownerPhone: '', history: [], received: {}, lastPasteHash: '', ticks: {} };
  }
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.v === 1 && Array.isArray(raw.tables)) {
        raw.counts = blankCounts(raw.tables, raw.counts);
        raw.mode = raw.mode || 'owner';
        raw.date = raw.date || todayISO();
        raw.history = Array.isArray(raw.history) ? raw.history : [];
        raw.received = raw.received || {};
        raw.ticks = raw.ticks || {};
        return raw;
      }
    } catch (e) { /* fall through */ }
    return fresh();
  }
  var S = load();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save on this phone'); }
  }
  function touch() { S.updatedAt = new Date().toISOString(); persist(); }
  function tableById(id) { for (var i = 0; i < S.tables.length; i++) if (S.tables[i].id === id) return S.tables[i]; return null; }

  /* ---------- totals (all exact, grams kept in hundredths) ---------- */
  function rowCalc(t, s, counts) {
    var c = (counts || S.counts)[t.id][key(s)] || { ho: 0, br: 0 }, h = hund(s);
    return { ho: c.ho, br: c.br, pcs: c.ho + c.br, hoH: c.ho * h, brH: c.br * h, tH: (c.ho + c.br) * h };
  }
  function tableCalc(t, counts) {
    var o = { ho: 0, br: 0, pcs: 0, hoH: 0, brH: 0, tH: 0 };
    t.sizes.forEach(function (s) { var r = rowCalc(t, s, counts); for (var k in o) o[k] += r[k]; });
    return o;
  }
  function allCalc(src) {
    src = src || S;
    var o = { ho: 0, br: 0, pcs: 0, hoH: 0, brH: 0, tH: 0 };
    src.tables.forEach(function (t) { var r = tableCalc(t, src.counts); for (var k in o) o[k] += r[k]; });
    return o;
  }

  /* ---------- last count (for big-change warnings) ---------- */
  function prevCount() { return S.history && S.history.length ? S.history[0] : null; }
  function prevVal(tid, k, sh) {
    var p = prevCount();
    if (!p || !p.counts[tid] || !p.counts[tid][k]) return null;
    return p.counts[tid][k][sh] | 0;
  }
  function isJump(oldV, newV) {
    if (oldV === null || !newV) return false;
    if (oldV === 0) return newV >= 10;
    var d = Math.abs(newV - oldV);
    return d >= 5 && d >= oldV * 0.5;
  }
  function colTotal(sh) {
    var n = 0, l = sh.toLowerCase();
    S.tables.forEach(function (t) { t.sizes.forEach(function (s) { n += S.counts[t.id][key(s)][l]; }); });
    return n;
  }
  function hashStr(t) { var h = 5381; t = String(t).trim(); for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return String(h >>> 0); }
  function stampLabel(iso) { var d = new Date(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

  /* ---------- rendering ---------- */
  function isStaff() { return S.mode === 'HO' || S.mode === 'BR'; }
  function shopName(m) { return m === 'HO' ? 'Head Office' : 'Branch'; }

  function render() {
    gid = 0;
    var staff = isStaff();
    var h = '';
    h += '<header class="hdr">';
    h += '<div class="brand"><div class="badge">' + diamond(32) + '</div><div class="brand-text"><div class="brand-name">Al Naeem Jewellery L.L.C.</div><div class="brand-sub">24K BULLION STOCK COUNT</div></div>';
    h += '<button class="icon-btn" data-act="settings" aria-label="Settings">' + ico('gear', '#F3E9D2', 20) + '</button></div>';
    if (staff) h += '<div class="staff-pill">' + S.mode + ' · ' + shopName(S.mode).toUpperCase() + ' COUNT</div>' +
      '<div class="tprog"><div class="tbar"><i data-tickbar></i></div><span data-ticks></span></div>';
    h += '<div class="daterow"><span>Count date</span><label class="datebtn"><span id="dateTxt">' + esc(dateLong(S.date)) + '</span>' + ico('chev', '#F3E9D2', 16) +
         '<input type="date" id="countDate" value="' + esc(S.date) + '" aria-label="Count date"></label></div>';
    if (!staff) {
      h += '<div class="hdr-actions"><button class="btn btn-gold" data-act="share-report">' + ico('share', '#064E3B') + 'Share report</button>' +
           '<button class="btn btn-gold-o" data-act="pdf">' + ico('pdf', '#F3E9D2') + 'Save PDF</button>' +
           '<button class="btn btn-gold-o hist-btn" data-act="history" aria-label="Past counts">' + ico('history', '#F3E9D2', 20) + '</button></div>';
    } else {
      h += '<button class="btn btn-gold btn-full" data-act="staff-send">' + ico('send', 'currentColor') + '<span class="send-label">Send count on WhatsApp</span></button>';
    }
    h += '</header>';

    h += '<main class="wrap' + (staff ? ' staffmode' : '') + '">';
    if (!staff) {
      h += '<div id="clipBanner"></div>';
      h += '<div class="recv" aria-label="Counts received">' + ['HO', 'BR'].map(function (sh) {
        var r = S.received && S.received[sh];
        return r ? '<div class="rchip ok">' + ico('check', '#067647', 18) + '<span><b>' + sh + ' received</b>' + timeOf(r.at) + ' · ' + r.pcs + ' pcs</span></div>'
                 : '<button class="rchip wait" data-act="quick-paste">' + ico('clock', '#6B655A', 18) + '<span><b>' + sh + ' waiting</b>Tap to paste</span></button>';
      }).join('') + '</div>';
      h += '<section class="card sum" aria-label="Summary"><div class="sum-label">Total 24K stock · both shops</div>';
      h += '<div class="sum-big"><b data-out="a:tg"></b><span><span data-out="a:pcs"></span> pcs</span></div>';
      h += '<div class="shops"><div class="shop"><small>HEAD OFFICE · HO</small><b data-out="a:hog"></b><span><span data-out="a:ho"></span> pcs</span></div>' +
           '<div class="shop"><small>BRANCH · BR</small><b data-out="a:brg"></b><span><span data-out="a:br"></span> pcs</span></div></div>';
      h += '<div class="cats">';
      S.tables.forEach(function (t) {
        h += '<button class="cat" data-act="jump" data-t="' + t.id + '"><span>' + esc(t.title) + '</span><b><span data-out="t:' + t.id + ':tg"></span> <i>· <span data-out="t:' + t.id + ':pcs"></span> pcs</i></b></button>';
      });
      h += '</div></section>';
      h += '<button class="paste-cta" data-act="quick-paste">' + ico('clip', '#047857', 26) + '<span><b>Paste &amp; fill staff message</b><span>Copy their WhatsApp message, then tap here</span></span></button>';
    }
    h += '<nav class="tabs" aria-label="Tables">';
    S.tables.forEach(function (t, i) { h += '<button class="tab' + (i === 0 ? ' on' : '') + '" data-act="jump" data-t="' + t.id + '">' + esc(t.short) + '</button>'; });
    h += '</nav>';

    S.tables.forEach(function (t) { h += tableHTML(t, staff); });

    if (staff) {
      h += '<div class="staff-actions"><button class="btn btn-gold btn-full" data-act="staff-send">' + ico('send', 'currentColor') + '<span class="send-label">Send count on WhatsApp</span></button>' +
           '<button class="btn btn-light btn-full" data-act="staff-copy">' + ico('copy') + 'Copy message</button></div>';
    }
    h += '<button class="btn btn-danger btn-full" data-act="new-count">' + ico('trash', '#B42318') + 'New count (clear all numbers)</button>';
    h += '<div class="saved" id="savedTxt"></div>';
    h += '</main>';
    app.innerHTML = h;
    updateAll();
    setupTabsObserver();
    checkClipboard();
  }

  function tableHTML(t, staff) {
    var ed = !!editing[t.id];
    var h = '<section class="card tbl" id="tbl-' + t.id + '" aria-label="' + esc(t.title) + '">';
    h += '<div class="tbl-head"><div><h2>' + esc(t.title) + '</h2><p>' + t.sizes.length + ' sizes · totals update as you type</p></div><div class="tbl-btns">';
    h += '<button class="sbtn' + (ed ? ' on' : '') + '" data-act="edit-sizes" data-t="' + t.id + '" aria-label="' + (ed ? 'Done editing sizes' : 'Edit sizes') + '">' + (ed ? 'Done' : ico('edit', '#047857')) + '</button>';
    if (!staff) h += '<button class="sbtn" data-act="share-table" data-t="' + t.id + '">' + ico('camera', '#047857') + 'Share</button>';
    h += '</div></div>';
    if (staff) {
      h += '<div class="cols"><span class="c">DONE</span><span>SIZE</span><span class="c">' + S.mode + ' PIECES</span><span class="r">GRAMS</span></div>';
    } else {
      h += '<div class="cols"><span>SIZE</span><span class="c">HO</span><span class="c">BR</span><span class="c">PCS</span><span class="r">GRAMS</span></div>';
    }
    t.sizes.forEach(function (s) {
      var k = key(s), c = S.counts[t.id][k], sub = sizeSub(s);
      var ticked = staff && isTicked(t.id, k);
      h += '<div class="row' + (ticked ? ' done' : '') + '">';
      if (staff) h += '<button class="tick' + (ticked ? ' on' : '') + '" data-act="tick" data-t="' + t.id + '" data-k="' + k + '" aria-pressed="' + ticked + '" aria-label="Mark ' + sizeLabel(s) + ' as counted">' + ico('check', 'currentColor', 18) + '</button>';
      h += '<div class="size">' + (ed ? '<button class="rm" data-act="remove-size" data-t="' + t.id + '" data-k="' + k + '" aria-label="Remove ' + sizeLabel(s) + '">' + ico('minus', '#B42318', 16) + '</button>' : '') +
           '<div><b>' + sizeLabel(s) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
      var shops = staff ? [S.mode.toLowerCase()] : ['ho', 'br'];
      shops.forEach(function (sh) {
        var v = c[sh];
        if (staff) h += '<div class="stepper"><button class="stp" data-act="step" data-d="-1" data-t="' + t.id + '" data-k="' + k + '" data-s="' + sh + '" aria-label="One less ' + sizeLabel(s) + '">' + ico('minus', 'currentColor', 20) + '</button>';
        h += '<input class="cnt" type="text" inputmode="numeric" pattern="[0-9]*" enterkeyhint="next" autocomplete="off" placeholder="0" ' +
             'data-t="' + t.id + '" data-k="' + k + '" data-s="' + sh + '" value="' + (v ? v : '') + '" aria-label="' + (sh === 'ho' ? 'Head office' : 'Branch') + ' pieces, ' + esc(t.title) + ' ' + sizeLabel(s) + '">';
        if (staff) h += '<button class="stp" data-act="step" data-d="1" data-t="' + t.id + '" data-k="' + k + '" data-s="' + sh + '" aria-label="One more ' + sizeLabel(s) + '">' + ico('plus', 'currentColor', 20) + '</button></div>';
      });
      if (!staff) h += '<span class="pcs" data-out="r:' + t.id + ':' + k + ':pcs"></span>';
      h += '<span class="grams" data-out="r:' + t.id + ':' + k + ':' + (staff ? S.mode.toLowerCase() + 'g' : 'tg') + '"></span>';
      h += '<small class="jump" hidden data-jump="' + t.id + ':' + k + ':' + shops.join(',') + '"></small>';
      h += '</div>';
    });
    h += '<button class="add" data-act="add-size" data-t="' + t.id + '">' + ico('plus', '#047857', 16) + 'Add size</button>';
    h += '<div class="foot">';
    if (staff) {
      var sh = S.mode.toLowerCase();
      h += '<div class="tot"><span></span><span>Total</span><span class="c" data-out="t:' + t.id + ':' + sh + '"></span><span class="grams" data-out="t:' + t.id + ':' + sh + 'g"></span></div>';
    } else {
      h += '<div class="tot"><span>Total</span><span class="c" data-out="t:' + t.id + ':ho"></span><span class="c" data-out="t:' + t.id + ':br"></span><span class="c" data-out="t:' + t.id + ':pcs"></span><span class="grams" data-out="t:' + t.id + ':tg"></span></div>';
      h += '<p>Grams by shop: <strong>HO <span data-out="t:' + t.id + ':hog"></span></strong> · <strong>BR <span data-out="t:' + t.id + ':brg"></span></strong></p>';
    }
    h += '</div></section>';
    return h;
  }

  function outValue(spec) {
    var p = spec.split(':'), o, f;
    if (p[0] === 'a') { o = allCalc(); f = p[1]; }
    else if (p[0] === 't') { o = tableCalc(tableById(p[1])); f = p[2]; }
    else if (p[0] === 'r') { o = rowCalc(tableById(p[1]), +p[2]); f = p[3]; }
    if (!o) return '';
    switch (f) {
      case 'ho': return String(o.ho);
      case 'br': return String(o.br);
      case 'pcs': return String(o.pcs);
      case 'hog': return fmtG(o.hoH);
      case 'brg': return fmtG(o.brH);
      case 'tg': return fmtG(o.tH);
    }
    return '';
  }
  function isTicked(tid, k) { return !!(S.ticks && S.ticks[tid] && S.ticks[tid][k]); }
  function tickStats() {
    var n = 0, d = 0;
    S.tables.forEach(function (t) { t.sizes.forEach(function (s) { n++; if (isTicked(t.id, key(s))) d++; }); });
    return { n: n, d: d };
  }
  function updateTicks() {
    if (!isStaff()) return;
    var st = tickStats(), all = st.n > 0 && st.d === st.n;
    $$('[data-ticks]').forEach(function (el) { el.textContent = all ? 'All ' + st.n + ' rows counted – ready to send' : 'Counted ' + st.d + ' of ' + st.n + ' rows'; });
    $$('[data-tickbar]').forEach(function (el) { el.style.width = (st.n ? Math.round(st.d / st.n * 100) : 0) + '%'; el.classList.toggle('full', all); });
    $$('[data-act="staff-send"],[data-act="staff-copy"]').forEach(function (b) { b.disabled = !all; });
    $$('.send-label').forEach(function (el) { el.textContent = all ? 'Send count on WhatsApp' : 'Tick every row to send (' + st.d + '/' + st.n + ')'; });
  }
  function updateAll() {
    updateTicks();
    var cache = {};
    $$('[data-out]').forEach(function (el) {
      var k = el.getAttribute('data-out');
      if (!(k in cache)) cache[k] = outValue(k);
      if (el.textContent !== cache[k]) el.textContent = cache[k];
    });
    $$('.cnt').forEach(function (el) {
      var t = el.getAttribute('data-t'), k = el.getAttribute('data-k'), sh = el.getAttribute('data-s');
      el.classList.toggle('warn', isJump(prevVal(t, k, sh), S.counts[t][k][sh]));
    });
    $$('[data-jump]').forEach(function (el) {
      var p = el.getAttribute('data-jump').split(':'), parts = [];
      p[2].split(',').forEach(function (sh) {
        var o = prevVal(p[0], p[1], sh), n = S.counts[p[0]][p[1]][sh];
        if (isJump(o, n)) parts.push(sh.toUpperCase() + ' last count ' + o + ' → now ' + n);
      });
      var txt = parts.length ? 'Big change – please check: ' + parts.join(' · ') : '';
      if (el.textContent !== txt) el.textContent = txt;
      el.hidden = !parts.length;
    });
    var st = $('#savedTxt');
    if (st) st.textContent = S.updatedAt ? 'Saved on this phone · last change ' + dateShort(S.updatedAt.slice(0, 10)) + ', ' + timeOf(S.updatedAt) : 'Saved automatically on this phone';
  }

  var tabObserver = null;
  function setupTabsObserver() {
    if (tabObserver) tabObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;
    tabObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var id = e.target.id.replace('tbl-', '');
          $$('.tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === id); });
        }
      });
    }, { rootMargin: '-80px 0px -60% 0px' });
    $$('.tbl').forEach(function (el) { tabObserver.observe(el); });
  }

  /* ---------- input handling ---------- */
  app.addEventListener('input', function (e) {
    var el = e.target;
    if (el.classList.contains('cnt')) {
      var clean = digitsOnly(el.value);
      if (clean !== el.value) el.value = clean;
      var n = clean === '' ? 0 : parseInt(clean, 10);
      S.counts[el.getAttribute('data-t')][el.getAttribute('data-k')][el.getAttribute('data-s')] = n;
      touch();
      updateAll();
    }
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'countDate') {
      if (e.target.value) { S.date = e.target.value; persist(); $('#dateTxt').textContent = dateLong(S.date); }
      else e.target.value = S.date;
    }
  });
  app.addEventListener('focusin', function (e) {
    if (e.target.classList && e.target.classList.contains('cnt')) { var el = e.target; setTimeout(function () { try { el.select(); } catch (x) {} }, 0); }
  });
  app.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('cnt')) {
      e.preventDefault();
      var all = $$('.cnt'), i = all.indexOf(e.target);
      if (i > -1 && i < all.length - 1) all[i + 1].focus(); else e.target.blur();
    }
  });

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), tid = b.getAttribute('data-t');
    switch (act) {
      case 'settings': openSettings(); break;
      case 'jump': var el = $('#tbl-' + tid); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'paste': openPaste(); break;
      case 'quick-paste': quickPaste(); break;
      case 'tick': {
        var kk = b.getAttribute('data-k');
        S.ticks = S.ticks || {}; S.ticks[tid] = S.ticks[tid] || {};
        var on = !S.ticks[tid][kk];
        if (on) S.ticks[tid][kk] = true; else delete S.ticks[tid][kk];
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
        b.closest('.row').classList.toggle('done', on);
        persist(); updateTicks();
        break;
      }
      case 'step': {
        var k2 = b.getAttribute('data-k'), sh2 = b.getAttribute('data-s');
        var n2 = Math.max(0, Math.min(99999, S.counts[tid][k2][sh2] + (+b.getAttribute('data-d'))));
        S.counts[tid][k2][sh2] = n2;
        var inp = $('.cnt[data-t="' + tid + '"][data-k="' + k2 + '"][data-s="' + sh2 + '"]');
        if (inp) inp.value = n2 ? n2 : '';
        touch(); updateAll();
        break;
      }
      case 'history': openHistory(); break;
      case 'share-report': shareImage(null); break;
      case 'share-table': shareImage(tid); break;
      case 'pdf': sharePdf(); break;
      case 'edit-sizes': editing[tid] = !editing[tid]; render(); var t2 = $('#tbl-' + tid); if (t2) t2.scrollIntoView({ block: 'start' }); break;
      case 'add-size': openAddSize(tid); break;
      case 'remove-size': removeSize(tid, b.getAttribute('data-k')); break;
      case 'new-count': openNewCount(); break;
      case 'staff-send': staffSend(); break;
      case 'staff-copy': staffCopy(); break;
    }
  });

  /* ---------- sheets / toast ---------- */
  var openBackdrop = null;
  function openSheet(title, body, onMount) {
    closeSheet();
    var oldToast = $('.toast'); if (oldToast) oldToast.remove();
    var bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div><div class="sheet-hd"><h3>' + esc(title) + '</h3>' +
      '<button class="x" data-close aria-label="Close">' + ico('x', '#1C1A16', 18) + '</button></div><div class="sheet-body">' + body + '</div></div>';
    bd.addEventListener('click', function (e) { if (e.target === bd || e.target.closest('[data-close]')) closeSheet(); });
    document.body.appendChild(bd);
    openBackdrop = bd;
    if (onMount) onMount(bd.querySelector('.sheet'));
    return bd.querySelector('.sheet');
  }
  function closeSheet() { if (openBackdrop) { openBackdrop.remove(); openBackdrop = null; } }
  var toastTimer = null;
  function toast(msg, actLabel, onAct, ms) {
    var old = $('.toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    var span = document.createElement('span'); span.textContent = msg; t.appendChild(span);
    if (actLabel) {
      var b = document.createElement('button'); b.className = 'toast-btn'; b.textContent = actLabel;
      b.addEventListener('click', function () { t.remove(); onAct(); });
      t.appendChild(b);
    }
    document.body.appendChild(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.remove(); }, ms || 2600);
  }
  function confirmSheet(title, text, yesLabel, danger, onYes) {
    openSheet(title, '<p class="hint">' + text + '</p><div class="two"><button class="btn btn-light" data-close>Cancel</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-dark') + '" id="yesBtn">' + esc(yesLabel) + '</button></div>',
      function (sh) { $('#yesBtn', sh).addEventListener('click', function () { closeSheet(); onYes(); }); });
  }

  /* ---------- sizes ---------- */
  function openAddSize(tid) {
    var t = tableById(tid);
    openSheet('Add size – ' + t.title,
      '<div class="stack"><div class="field"><label for="newSize">Weight in grams</label><input id="newSize" type="text" inputmode="decimal" placeholder="e.g. 250" autocomplete="off"></div>' +
      '<p class="hint" id="sizeErr" style="color:#B42318;margin:0"></p><button class="btn btn-dark btn-full" id="addSizeBtn">Add size</button></div>',
      function (sh) {
        var inp = $('#newSize', sh); setTimeout(function () { inp.focus(); }, 50);
        function go() {
          var v = parseFloat(String(inp.value).replace(',', '.'));
          var err = $('#sizeErr', sh);
          if (!(v > 0) || v > 100000) { err.textContent = 'Type a weight in grams, like 250 or 15.55'; return; }
          v = Math.round(v * 100) / 100;
          for (var i = 0; i < t.sizes.length; i++) if (P.sameSize(t.sizes[i], v)) { err.textContent = sizeLabel(v) + ' is already in this table'; return; }
          t.sizes.push(v); t.sizes.sort(function (a, b) { return a - b; });
          S.counts[tid][key(v)] = { ho: 0, br: 0 };
          touch(); closeSheet(); render(); toast(sizeLabel(v) + ' added to ' + t.title);
        }
        $('#addSizeBtn', sh).addEventListener('click', go);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      });
  }
  function removeSize(tid, k) {
    var t = tableById(tid), c = S.counts[tid][k];
    function doIt() {
      t.sizes = t.sizes.filter(function (s) { return key(s) !== k; });
      delete S.counts[tid][k];
      if (S.ticks && S.ticks[tid]) delete S.ticks[tid][k];
      touch(); render(); toast(fmtNum(+k) + ' g removed');
    }
    if (c.ho || c.br) confirmSheet('Remove ' + fmtNum(+k) + ' g?', 'This size has ' + (c.ho + c.br) + ' pieces counted. Removing it deletes those numbers too.', 'Remove', true, doIt);
    else doIt();
  }

  /* ---------- new count ---------- */
  function openNewCount() {
    confirmSheet('Start a new count?', 'This count is kept in <b>Past counts</b> (the clock button at the top). Then all HO and BR numbers go back to 0 and the date is set to today. Your sizes stay as they are.', 'Save & start new', true, function () {
      if (allCalc().pcs > 0) {
        S.history = S.history || [];
        S.history.unshift({ id: Date.now(), date: S.date, savedAt: new Date().toISOString(), tables: clone(S.tables), counts: clone(S.counts) });
        if (S.history.length > 104) S.history.length = 104;
      }
      S.received = {};
      S.ticks = {};
      S.counts = blankCounts(S.tables);
      S.date = todayISO();
      touch(); render(); window.scrollTo(0, 0); toast('New count started');
    });
  }

  /* ---------- paste ---------- */
  function openPaste(prefill) {
    var canClip = !!(navigator.clipboard && navigator.clipboard.readText);
    openSheet('Paste staff message',
      '<p class="hint">Paste the count your staff sent on WhatsApp. You will see everything before it goes into the table.</p>' +
      '<div class="stack"><label class="sr" for="pasteText">Message</label><textarea id="pasteText" placeholder="Paste the WhatsApp message here…"></textarea>' +
      '<div class="' + (canClip ? 'two' : 'stack') + '">' + (canClip ? '<button class="btn btn-light" id="clipBtn">' + ico('clip') + 'Paste</button>' : '') +
      '<button class="btn btn-dark" id="readBtn">Read message</button></div><div id="pasteResult" class="stack"></div></div>',
      function (sh) {
        var ta = $('#pasteText', sh);
        if (canClip) $('#clipBtn', sh).addEventListener('click', function () {
          navigator.clipboard.readText().then(function (txt) { ta.value = txt; readIt(); }).catch(function () { toast('Long-press the box and choose Paste'); ta.focus(); });
        });
        $('#readBtn', sh).addEventListener('click', readIt);
        if (prefill) { ta.value = prefill; setTimeout(readIt, 0); }
        function readIt() { showPreview(sh, parseText(ta.value), ta.value); }
      });
  }

  function parseText(txt) { return P.parseMessage(txt, S.tables.map(function (t) { return { id: t.id, title: t.title, sizes: t.sizes }; })); }
  function isClean(r) {
    return r.items.length > 0 && !r.problems.length && !r.shopConflict &&
      (r.shop || r.items.every(function (i) { return i.shop; })) &&
      (r.totalStated === null || r.totalStated === r.totalParsed);
  }
  // One tap: read the copied WhatsApp message; fill straight away if it is clean, otherwise show the preview.
  function quickPaste() {
    if (!(navigator.clipboard && navigator.clipboard.readText)) { openPaste(); return; }
    navigator.clipboard.readText().then(function (txt) {
      if (!txt || !txt.trim()) { openPaste(); toast('Nothing copied – paste the message in the box'); return; }
      var r = parseText(txt);
      if (isClean(r)) applyItems(r.items, r.shop, txt);
      else openPaste(txt);
    }).catch(function () { openPaste(); });
  }
  // Android: if clipboard access is already allowed, offer a copied staff message as a banner.
  function checkClipboard() {
    var box = $('#clipBanner');
    if (!box || isStaff() || locked || document.hidden) return;
    if (!(navigator.permissions && navigator.permissions.query && navigator.clipboard && navigator.clipboard.readText)) return;
    try {
      navigator.permissions.query({ name: 'clipboard-read' }).then(function (p) {
        if (p.state !== 'granted') return;
        return navigator.clipboard.readText().then(function (txt) {
          if (!txt || !/al naeem stock count/i.test(txt) || hashStr(txt) === S.lastPasteHash) { box.innerHTML = ''; return; }
          var r = parseText(txt);
          box.innerHTML = '<div class="banner">' + ico('clip', '#F3E9D2', 22) + '<span><b>' + (r.shop || 'Staff') + ' count copied</b>' + r.items.length + ' sizes · ' + r.totalParsed + ' pcs</span>' +
            '<button class="btn btn-gold" data-act="quick-paste">Fill now</button></div>';
        });
      }).catch(function () {});
    } catch (e) { /* not supported */ }
  }
  window.addEventListener('focus', function () { setTimeout(checkClipboard, 300); });

  function showPreview(sh, r, rawText) {
    var box = $('#pasteResult', sh);
    var chosen = r.shop;
    var needsShop = r.items.some(function (it) { return !it.shop; });

    function draw() {
      var h = '';
      if (!r.items.length && !r.problems.length) {
        box.innerHTML = '<div class="note info">' + ico('alert') + '<span>No counts found in this message.</span></div>'; return;
      }
      if (needsShop) {
        h += '<div class="field"><label>Which shop is this count for?' + (r.shop ? ' (found in message)' : '') + '</label><div class="seg">' +
             '<button data-shop="HO" class="' + (chosen === 'HO' ? 'on' : '') + '">HO · Head Office</button><button data-shop="BR" class="' + (chosen === 'BR' ? 'on' : '') + '">BR · Branch</button></div></div>';
        if (r.shopConflict) h += '<div class="note bad">' + ico('alert') + '<span>The message mentions both HO and BR. Choose the right shop.</span></div>';
      }
      if (r.totalStated !== null) {
        if (r.totalStated === r.totalParsed) h += '<div class="note ok">' + ico('check') + '<span>Total matches: <b>' + r.totalParsed + ' pieces</b></span></div>';
        else h += '<div class="note bad">' + ico('alert') + '<span>The message says <b>' + r.totalStated + ' pieces</b>, but the lines add up to <b>' + r.totalParsed + '</b>. Check with your staff.</span></div>';
      } else {
        h += '<div class="note info">' + ico('alert') + '<span>Lines add up to <b>' + r.totalParsed + ' pieces</b> (no total in the message to check against).</span></div>';
      }
      if (r.problems.length) {
        h += '<div class="note bad" style="flex-direction:column;gap:0"><b style="padding-bottom:6px">' + r.problems.length + ' line' + (r.problems.length > 1 ? 's' : '') + ' not used:</b>';
        r.problems.forEach(function (p) { h += '<div class="prob"><code>' + esc(p.line) + '</code><br>' + esc(p.reason) + '</div>'; });
        h += '</div>';
      }
      var changes = 0;
      S.tables.forEach(function (t) {
        var its = r.items.filter(function (it) { return it.cat === t.id; });
        if (!its.length) return;
        h += '<div class="pv-group"><h4>' + esc(t.title) + '</h4>';
        its.forEach(function (it) {
          var sh2 = it.shop || chosen;
          var was = sh2 ? S.counts[t.id][key(it.size)][sh2.toLowerCase()] : null;
          var chg = was !== null && was !== it.count;
          if (chg) changes++;
          var pv = sh2 ? prevVal(t.id, key(it.size), sh2.toLowerCase()) : null;
          var jmp = isJump(pv, it.count);
          h += '<div class="pv-row' + (chg ? ' chg' : '') + '"><span>' + sizeLabel(it.size) + (it.shop ? '<span class="tag">' + it.shop + '</span>' : '') + (it.dup ? ' <span class="was">(listed twice – last one used)</span>' : '') + (jmp ? '<span class="jtag">big change · last count ' + pv + '</span>' : '') + '</span>' +
               '<span>' + (chg ? '<span class="was">was ' + was + ' → </span>' : '') + '<b>' + it.count + '</b></span></div>';
        });
        h += '</div>';
      });
      var ready = !needsShop || chosen;
      h += '<button class="btn btn-gold btn-full" id="fillBtn"' + (ready && r.items.length ? '' : ' disabled') + '>' +
           (ready ? 'Fill ' + (needsShop ? chosen + ' column' : 'table') + ' (' + r.items.length + ' sizes' + (changes ? ', ' + changes + ' changed' : '') + ')' : 'Choose HO or BR first') + '</button>';
      box.innerHTML = h;
      $$('[data-shop]', box).forEach(function (b) { b.addEventListener('click', function () { chosen = b.getAttribute('data-shop'); draw(); }); });
      var fb = $('#fillBtn', box);
      if (fb) fb.addEventListener('click', function () { applyItems(r.items, chosen, rawText); });
    }
    draw();
    setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  }

  function applyItems(items, chosen, rawText) {
    var before = { counts: clone(S.counts), received: clone(S.received || {}), hash: S.lastPasteHash || '' };
    var flashes = [], shops = {}, jumps = 0;
    items.forEach(function (it) {
      var shopU = it.shop || chosen, sh = shopU.toLowerCase(), k = key(it.size);
      if (isJump(prevVal(it.cat, k, sh), it.count)) jumps++;
      S.counts[it.cat][k][sh] = it.count;
      shops[shopU] = true;
      flashes.push(it.cat + '|' + k + '|' + sh);
    });
    S.received = S.received || {};
    Object.keys(shops).forEach(function (sh) { S.received[sh] = { at: new Date().toISOString(), pcs: colTotal(sh) }; });
    if (rawText) S.lastPasteHash = hashStr(rawText);
    touch(); closeSheet(); render();
    flashes.forEach(function (f) {
      var p = f.split('|');
      var el = $('.cnt[data-t="' + p[0] + '"][data-k="' + p[1] + '"][data-s="' + p[2] + '"]');
      if (el) el.classList.add('flash');
    });
    var msg = 'Filled ' + Object.keys(shops).join(' & ') + ' · ' + items.length + ' sizes' +
      (jumps ? ' · ' + jumps + ' big change' + (jumps > 1 ? 's' : '') + ' – check the orange boxes' : '');
    toast(msg, 'Undo', function () {
      S.counts = before.counts; S.received = before.received; S.lastPasteHash = before.hash;
      touch(); render(); toast('Undone');
    }, 8000);
  }

  /* ---------- report data ---------- */
  function reportTable(t, counts) {
    var rows = t.sizes.map(function (s) {
      var r = rowCalc(t, s, counts), sub = sizeSub(s);
      return { label: sizeLabel(s) + (sub ? ' (' + sub + ')' : ''), ho: String(r.ho), br: String(r.br), pcs: String(r.pcs), hoG: fmtH(r.hoH), brG: fmtH(r.brH), tG: fmtH(r.tH) };
    });
    var o = tableCalc(t, counts);
    return { title: t.title, rows: rows, tot: { ho: String(o.ho), br: String(o.br), pcs: String(o.pcs), hoG: fmtH(o.hoH), brG: fmtH(o.brH), tG: fmtH(o.tH) }, sumLine: fmtG(o.tH) + ' · ' + o.pcs + ' pcs' };
  }
  function srcTable(src, tid) { for (var i = 0; i < src.tables.length; i++) if (src.tables[i].id === tid) return src.tables[i]; return null; }
  function reportData(tid, src) {
    src = src || S;
    var made = src === S ? 'Made ' + timeNow() : 'Saved ' + timeOf(src.savedAt);
    if (tid) {
      var t = srcTable(src, tid);
      return { heading: t.title + ' – Stock', dateLabel: dateShort(src.date), madeLabel: made, tables: [reportTable(t, src.counts)], single: true };
    }
    var a = allCalc(src);
    return {
      heading: '24K Bullion Stock Report', dateLabel: dateShort(src.date), madeLabel: made,
      summary: { tg: fmtG(a.tH), pcs: a.pcs + ' pieces', hog: fmtG(a.hoH), ho: a.ho + ' pieces', brg: fmtG(a.brH), br: a.br + ' pieces' },
      tables: src.tables.map(function (t) { return reportTable(t, src.counts); }), single: false
    };
  }
  function fileStem(tid, src) {
    src = src || S;
    var name = tid ? srcTable(src, tid).title.replace(/[^A-Za-z0-9]+/g, '-') : 'Stock-Report';
    return 'Al-Naeem-' + name + '-' + src.date;
  }

  /* ---------- sharing ---------- */
  function canShareFile(file) {
    try { return !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { return false; }
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function doShare(file, title) {
    if (canShareFile(file)) {
      navigator.share({ files: [file], title: title }).catch(function (err) {
        if (err && err.name !== 'AbortError') { downloadBlob(file, file.name); toast('Saved – send it from your files'); }
      });
    } else { downloadBlob(file, file.name); toast('Saved to your downloads'); }
  }

  function shareImage(tid, src) {
    toast('Making image…');
    setTimeout(function () {
      var canvas = R.draw(reportData(tid, src));
      canvas.toBlob(function (blob) {
        var file = new File([blob], fileStem(tid, src) + '.png', { type: 'image/png' });
        var url = URL.createObjectURL(blob);
        var title = tid ? srcTable(src || S, tid).title : 'Full report';
        openSheet('Share ' + title,
          '<img class="preview-img" src="' + url + '" alt="Preview of the ' + esc(title) + ' image">' +
          '<div class="stack"><button class="btn btn-gold btn-full" id="goShare">' + ico('share', '#064E3B') + 'Share to WhatsApp</button>' +
          '<button class="btn btn-light btn-full" id="goSave">' + ico('download') + 'Save image</button></div>',
          function (sh) {
            $('#goShare', sh).addEventListener('click', function () { doShare(file, title); });
            $('#goSave', sh).addEventListener('click', function () { downloadBlob(file, file.name); });
          });
      }, 'image/png');
    }, 30);
  }

  function sharePdf(src) {
    toast('Making PDF…');
    setTimeout(function () {
      var canvas = R.draw(reportData(null, src));
      var blob = R.toPdf(canvas);
      var file = new File([blob], fileStem(null, src) + '.pdf', { type: 'application/pdf' });
      openSheet('Stock report PDF',
        '<div class="pdf-box">' + ico('pdf', '#047857', 34) + '<div><b>' + esc(file.name) + '</b><span>All three tables · ' + Math.max(1, Math.round(blob.size / 1024)) + ' KB</span></div></div>' +
        '<div class="stack"><button class="btn btn-gold btn-full" id="goShare">' + ico('share', '#064E3B') + 'Share to WhatsApp</button>' +
        '<button class="btn btn-light btn-full" id="goSave">' + ico('download') + 'Save PDF</button></div>',
        function (sh) {
          $('#goShare', sh).addEventListener('click', function () { doShare(file, 'Stock report'); });
          $('#goSave', sh).addEventListener('click', function () { downloadBlob(file, file.name); });
        });
    }, 30);
  }

  /* ---------- past counts ---------- */
  function openHistory() {
    var list = S.history || [];
    var body = list.length ? '<div class="stack">' + list.map(function (hs, i) {
      var a = allCalc(hs);
      return '<button class="hist" data-i="' + i + '"><span><b>' + esc(dateLong(hs.date)) + '</b><span>Saved ' + esc(stampLabel(hs.savedAt)) + '</span></span>' +
        '<span class="r"><b>' + fmtG(a.tH) + '</b><span>' + a.pcs + ' pcs</span></span></button>';
    }).join('') + '</div>'
      : '<div class="note info">' + ico('history') + '<span>No past counts yet. When you tap <b>New count</b>, the finished count is kept here so you can re-share it any time.</span></div>';
    openSheet('Past counts', body, function (sh) {
      $$('.hist', sh).forEach(function (b) { b.addEventListener('click', function () { openHistoryItem(+b.getAttribute('data-i')); }); });
    });
  }
  function openHistoryItem(i) {
    var hs = S.history[i]; if (!hs) return;
    var a = allCalc(hs);
    var body = '<div class="shops" style="margin-bottom:10px"><div class="shop"><small>BOTH SHOPS</small><b>' + fmtG(a.tH) + '</b><span>' + a.pcs + ' pcs</span></div>' +
      '<div class="shop"><small>HO · BR</small><b style="font-size:15px">' + fmtG(a.hoH) + ' · ' + fmtG(a.brH) + '</b><span>' + a.ho + ' · ' + a.br + ' pcs</span></div></div>' +
      '<div class="pv-group" style="margin-bottom:12px">' + hs.tables.map(function (t) {
        var o = tableCalc(t, hs.counts);
        return '<div class="pv-row"><span>' + esc(t.title) + '</span><span><b>' + fmtG(o.tH) + '</b> <span class="was">· ' + o.pcs + ' pcs</span></span></div>';
      }).join('') + '</div>' +
      '<div class="stack"><button class="btn btn-gold btn-full" id="hImg">' + ico('share', '#064E3B') + 'Share report image</button>' +
      '<button class="btn btn-light btn-full" id="hPdf">' + ico('pdf') + 'Save PDF</button>' +
      '<button class="btn btn-danger btn-full" id="hDel">' + ico('trash', '#B42318') + 'Delete this count</button></div>';
    openSheet(dateLong(hs.date), body, function (sh) {
      $('#hImg', sh).addEventListener('click', function () { shareImage(null, hs); });
      $('#hPdf', sh).addEventListener('click', function () { sharePdf(hs); });
      $('#hDel', sh).addEventListener('click', function () {
        confirmSheet('Delete this count?', 'The count from ' + esc(dateLong(hs.date)) + ' will be removed from Past counts.', 'Delete', true, function () {
          S.history.splice(i, 1); persist(); toast('Deleted'); openHistory();
        });
      });
    });
  }

  /* ---------- staff ---------- */
  function staffMessage() {
    var sh = S.mode.toLowerCase(), counts = {};
    S.tables.forEach(function (t) { counts[t.id] = {}; t.sizes.forEach(function (s) { counts[t.id][key(s)] = S.counts[t.id][key(s)][sh]; }); });
    return P.buildStaffMessage(S.tables, counts, S.mode, dateShort(S.date) + ', ' + timeNow());
  }
  function staffSend() {
    var st = tickStats(); if (st.d < st.n) { toast('Tick every row first (' + st.d + '/' + st.n + ')'); return; }
    var msg = staffMessage();
    if (S.ownerPhone) { window.location.href = 'https://wa.me/' + S.ownerPhone + '?text=' + encodeURIComponent(msg); return; }
    if (navigator.share) {
      navigator.share({ text: msg }).catch(function (err) { if (err && err.name !== 'AbortError') window.location.href = 'https://wa.me/?text=' + encodeURIComponent(msg); });
    } else window.location.href = 'https://wa.me/?text=' + encodeURIComponent(msg);
  }
  function staffCopy() {
    var msg = staffMessage();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, msg.length);
      try { document.execCommand('copy'); toast('Message copied'); } catch (e) { toast('Could not copy'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(function () { toast('Message copied'); }, fallback);
    else fallback();
  }

  /* ---------- PIN ---------- */
  function hashPin(pin) {
    var txt = 'alnaeem-stock:' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381; for (var i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
    return Promise.resolve('d' + (h >>> 0).toString(16));
  }
  function padHTML(extra) {
    var h = '<div class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="pad">';
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n) { h += '<button data-n="' + n + '">' + n + '</button>'; });
    h += (extra || '<span></span>') + '<button data-n="0">0</button><button class="ghost" data-del aria-label="Delete">' + ico('x', 'currentColor', 22) + '</button></div>';
    return h;
  }
  function wirePad(root, onDone) {
    var val = '';
    var dots = $$('.dots i', root);
    function show() { dots.forEach(function (d, i) { d.classList.toggle('f', i < val.length); }); }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-n') && val.length < 4) { val += b.getAttribute('data-n'); show(); if (val.length === 4) { var v = val; setTimeout(function () { onDone(v, reset); }, 120); } }
      else if (b.hasAttribute('data-del')) { val = val.slice(0, -1); show(); }
    });
    function reset(shake) {
      val = ''; show();
      if (shake) { var d = $('.dots', root); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
    }
  }
  function showLock() {
    if (locked || !S.pinHash) return;
    locked = true;
    closeSheet();
    var el = document.createElement('div');
    el.className = 'lock';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Enter PIN');
    el.innerHTML = '<div class="badge">' + diamond(52) + '</div><h1>Al Naeem Jewellery L.L.C.</h1><p id="lockMsg">Enter your PIN</p>' + padHTML() +
      '<button class="linkbtn" id="forgot">Forgot PIN?</button>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    wirePad(el, function (v, reset) {
      hashPin(v).then(function (h) {
        if (h === S.pinHash) { el.remove(); locked = false; document.body.style.overflow = ''; checkClipboard(); }
        else { $('#lockMsg', el).textContent = 'Wrong PIN – try again'; reset(true); }
      });
    });
    $('#forgot', el).addEventListener('click', function () {
      $('#lockMsg', el).innerHTML = 'Without the PIN the only way in is to <b>erase this app\'s data</b> (all counts and sizes).';
      var b = $('#forgot', el); b.textContent = 'Erase everything and start fresh'; b.id = 'erase';
      b.addEventListener('click', function () { localStorage.removeItem(KEY); location.reload(); }, { once: true });
    }, { once: true });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) hiddenAt = Date.now();
    else if (S.pinHash && hiddenAt && Date.now() - hiddenAt > 60000) showLock();
    if (!document.hidden) setTimeout(checkClipboard, 400);
  });

  function pinFlow(title, steps, done) {
    // steps: array of prompts; collects one 4-digit entry per step
    var got = [];
    function step(i) {
      openSheet(title, '<div class="pinwrap"><p class="hint" style="margin:0;text-align:center" id="pinMsg">' + esc(steps[i]) + '</p>' + padHTML() + '</div>', function (sh) {
        wirePad($('.pinwrap', sh), function (v, reset) {
          got[i] = v;
          if (i + 1 < steps.length) step(i + 1);
          else done(got, function (msg) { $('#pinMsg', sh).textContent = msg; reset(true); got = []; setTimeout(function () { step(0); }, 900); });
        });
      });
    }
    step(0);
  }

  /* ---------- settings ---------- */
  function openSettings() {
    var modes = [['owner', 'Owner'], ['HO', 'HO staff'], ['BR', 'BR staff']];
    var body = '<div class="stack">' +
      '<div class="field"><label>This phone is used by</label><div class="seg" id="modeSeg">' +
      modes.map(function (m) { return '<button data-mode="' + m[0] + '" class="' + (S.mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
      '<p class="hint">Owner sees both shops, totals, share and PDF. Staff phones only count their own shop and send the count to you on WhatsApp.</p>' +
      '<div class="field"><label for="ownerPhone">Owner\'s WhatsApp number (for staff phones)</label><input id="ownerPhone" type="tel" inputmode="tel" placeholder="9715XXXXXXXX" value="' + esc(S.ownerPhone || '') + '"></div>' +
      '<p class="hint">With a number, “Send count” opens your chat directly. Country code first, no + or spaces.</p>' +
      '<div class="field"><label>PIN lock</label>' + (S.pinHash
        ? '<div class="two"><button class="btn btn-light" id="pinChange">' + ico('lock') + 'Change PIN</button><button class="btn btn-danger" id="pinOff">Remove PIN</button></div>'
        : '<button class="btn btn-dark btn-full" id="pinOn">' + ico('lock', '#F3E9D2') + 'Set a 4-digit PIN</button>') + '</div>' +
      '<p class="hint">The app asks for the PIN when it opens and after 1 minute in the background.</p>' +
      '<p class="hint" style="text-align:center;margin-top:8px">Al Naeem Stock Count · version ' + VERSION + '</p></div>';
    openSheet('Settings', body, function (sh) {
      $$('[data-mode]', sh).forEach(function (b) {
        b.addEventListener('click', function () {
          S.mode = b.getAttribute('data-mode'); persist();
          $$('[data-mode]', sh).forEach(function (x) { x.classList.toggle('on', x === b); });
          render();
        });
      });
      $('#ownerPhone', sh).addEventListener('input', function (e) {
        var d = e.target.value.replace(/\D/g, '').replace(/^00/, '');
        S.ownerPhone = d; persist();
      });
      var on = $('#pinOn', sh), ch = $('#pinChange', sh), off = $('#pinOff', sh);
      function setNew() {
        pinFlow('Set PIN', ['Choose a 4-digit PIN', 'Type the same PIN again'], function (g, fail) {
          if (g[0] !== g[1]) { fail('PINs did not match – start again'); return; }
          hashPin(g[0]).then(function (h) { S.pinHash = h; persist(); closeSheet(); toast('PIN set'); });
        });
      }
      if (on) on.addEventListener('click', setNew);
      if (ch) ch.addEventListener('click', function () {
        pinFlow('Change PIN', ['Enter your current PIN'], function (g, fail) {
          hashPin(g[0]).then(function (h) { if (h === S.pinHash) setNew(); else fail('Wrong PIN'); });
        });
      });
      if (off) off.addEventListener('click', function () {
        pinFlow('Remove PIN', ['Enter your current PIN'], function (g, fail) {
          hashPin(g[0]).then(function (h) { if (h === S.pinHash) { S.pinHash = null; persist(); closeSheet(); toast('PIN removed'); } else fail('Wrong PIN'); });
        });
      });
    });
  }

  /* ---------- start ---------- */
  render();
  if (S.pinHash) showLock();
  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
  window.__stock = { state: function () { return S; }, reportData: reportData, render: render, applyItems: applyItems, parseText: parseText }; // for testing
})();
