/* Al Naeem Stock Count – message parser and staff message builder.
   Pure functions, no DOM. Works in the browser (window.StockParser) and in Node (module.exports). */
(function (root) {
  'use strict';

  var TOL = 0.011; // grams tolerance when matching sizes (31.1 vs 31.1035 etc.)

  function normDigits(s) {
    return s
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); });
  }

  function cleanLine(raw) {
    var s = normDigits(String(raw));
    s = s.replace(/[*_~`]/g, ' ');            // WhatsApp bold/italic markers
    s = s.replace(/½/g, ' half ');       // ½
    s = s.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2'); // 2,5g -> 2.5g
    s = s.replace(/[–—]/g, '-');
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function detectCategory(l) {
    if (/\b(pamp|pump|pamb|fortuna|swiss|valcambi)\b/.test(l)) return 'pamp';
    if (/\b(coins?|coin's)\b/.test(l)) return 'coins';
    if (/\b(local|bars?|biscuits?)\b/.test(l)) return 'local';
    return null;
  }

  function detectShop(l) {
    var ho = /\b(ho|h\.o\.?|head ?office|main ?(shop|branch)?)\b/.test(l);
    var br = /\b(br|b\.r\.?|branch)\b/.test(l) && !/\bmain branch\b/.test(l);
    if (ho && !br) return 'HO';
    if (br && !ho) return 'BR';
    return null;
  }

  function sameSize(a, b) { return Math.abs(a - b) < TOL; }

  function findSize(sizes, v) {
    for (var i = 0; i < sizes.length; i++) if (sameSize(sizes[i], v)) return sizes[i];
    return null;
  }

  // Pull the size (in grams) out of a line. Returns {size, rest} or null.
  function extractSize(l) {
    var m;
    if ((m = l.match(/\b(half|1\/2|0?\.5)\s*-?\s*(oz|ounce|ounces|ozs)\b/))) {
      return { size: 15.55, rest: l.replace(m[0], ' ') };
    }
    if ((m = l.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)?\s*-?\s*(oz|ounce|ounces|ozs)\b/))) {
      var n = m[1] ? parseFloat(m[1]) : 1;
      return { size: n === 1 ? 31.1 : +(n * 31.1035).toFixed(2), rest: l.replace(m[0], ' ') };
    }
    if ((m = l.match(/(\d+(?:\.\d+)?)\s*-?\s*(kg|kgs|kilo|kilos)\b/))) {
      return { size: parseFloat(m[1]) * 1000, rest: l.replace(m[0], ' ') };
    }
    if ((m = l.match(/(\d+(?:\.\d+)?)\s*-?\s*(g|gm|gms|gr|grm|grms|gram|grams|gmm)\b/))) {
      return { size: parseFloat(m[1]), rest: l.replace(m[0], ' ') };
    }
    return null;
  }

  /**
   * Parse a pasted WhatsApp message.
   * tables: [{id, title, sizes:[numbers]}]
   * Returns { shop, shopConflict, items:[{cat, size, count, shop, line}], problems:[{line, reason}],
   *           totalStated, totalParsed, dupes:[...] }
   */
  function parseMessage(text, tables) {
    var byId = {};
    tables.forEach(function (t) { byId[t.id] = t; });
    var lines = String(text || '').split(/\r?\n/);
    var current = null;
    var shopsSeen = {};
    var items = [];
    var problems = [];
    var totalStated = null;
    var seen = {};

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var l = cleanLine(line);
      if (!l) return;

      var hasDigit = /\d/.test(l);
      var cat = detectCategory(l);
      var shop = detectShop(l);
      var isDate = /\b(date|time|day)\b/.test(l) || /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/.test(l) ||
          /\b\d{1,2}:\d{2}\b/.test(l) ||
          /\b\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{4}\b/.test(l);
      var inlineShopCount = !isDate && /\b(ho|h\.o\.?|head ?office|main|br|b\.r\.?|branch)\s*[:=\-]?\s*\d/.test(l);
      if (shop && !inlineShopCount) shopsSeen[shop] = true;

      // Date / time lines
      if (isDate) return;

      // Total line
      if (/\b(total|totl|ttl|grand)\b/.test(l)) {
        var tn = l.match(/(\d+)(?!.*\d)/);
        // only a pieces total (not a grams total)
        if (tn && !/\d\s*(g|gm|gms|gram|grams)\b/.test(l) && !/\b(gram|grams|gm|gms|weight|wt|tola|oz)\b/.test(l) && !cat) totalStated = parseInt(tn[1], 10);
        return;
      }

      if (!hasDigit) {
        if (cat) current = cat;
        return;
      }

      if (cat) current = cat;

      var sz = extractSize(l);
      var rest = sz ? sz.rest : l;
      var size = sz ? sz.size : null;

      // Inline both shops: "10g HO 5 BR 3"
      var hoM = rest.match(/\b(ho|h\.o\.?|head ?office|main)\s*[:=\-]?\s*(\d+)\b/);
      var brM = rest.match(/\b(br|b\.r\.?|branch)\s*[:=\-]?\s*(\d+)\b/);
      var counts = [];
      if (hoM || brM) {
        if (hoM) { counts.push({ shop: 'HO', n: parseInt(hoM[2], 10) }); rest = rest.replace(hoM[0], ' '); }
        if (brM) { counts.push({ shop: 'BR', n: parseInt(brM[2], 10) }); rest = rest.replace(brM[0], ' '); }
      }

      var nums = (rest.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);

      if (size === null) {
        if (counts.length && nums.length === 1) {
          size = nums[0]; nums = [];
        } else if (nums.length >= 2) {
          // first number that is a known size of the table is the size
          var pool = current && byId[current] ? byId[current].sizes : allSizes(tables);
          var idx = -1;
          for (var i = 0; i < nums.length; i++) if (findSize(pool, nums[i]) !== null) { idx = i; break; }
          if (idx === -1) { problems.push({ line: line, reason: 'Could not tell which number is the size' }); return; }
          size = nums[idx]; nums.splice(idx, 1);
        } else {
          problems.push({ line: line, reason: 'Size or count missing' });
          return;
        }
      }

      if (!counts.length) {
        var pcsM = rest.match(/(\d+)\s*(pcs|pc|pieces|piece|nos|no|pis|pcs\.)\b/);
        var n;
        if (pcsM) n = parseFloat(pcsM[1]);
        else if (nums.length === 1) n = nums[0];
        else if (nums.length === 0) { problems.push({ line: line, reason: 'No count found' }); return; }
        else { problems.push({ line: line, reason: 'More than one count on this line' }); return; }
        if (n % 1 !== 0) { problems.push({ line: line, reason: 'Count is not a whole number' }); return; }
        counts.push({ shop: null, n: n });
      }

      // Which table?
      var useCat = current;
      if (!useCat) {
        var hits = tables.filter(function (t) { return findSize(t.sizes, size) !== null; });
        if (hits.length === 1) useCat = hits[0].id;
        else { problems.push({ line: line, reason: 'Not sure which table (PAMP, local bars or coins)' }); return; }
      }
      var t = byId[useCat];
      var matched = findSize(t.sizes, size);
      if (matched === null) {
        problems.push({ line: line, reason: fmtNum(size) + ' g is not a size in ' + t.title });
        return;
      }

      counts.forEach(function (c) {
        if (c.n > 99999) { problems.push({ line: line, reason: 'Count too large' }); return; }
        var key = useCat + '|' + matched + '|' + (c.shop || '?');
        var item = { cat: useCat, size: matched, count: c.n, shop: c.shop, line: line, dup: false };
        if (seen[key] !== undefined) { items[seen[key]].dup = true; item.dup = true; items[seen[key]].overridden = true; }
        seen[key] = items.length;
        items.push(item);
      });
    });

    var shopList = Object.keys(shopsSeen);
    var shopOut = shopList.length === 1 ? shopList[0] : null;
    var finalItems = items.filter(function (it) { return !it.overridden; });
    var totalParsed = finalItems.reduce(function (a, it) { return a + it.count; }, 0);

    return {
      shop: shopOut,
      shopConflict: shopList.length > 1,
      items: finalItems,
      problems: problems,
      totalStated: totalStated,
      totalParsed: totalParsed
    };
  }

  function allSizes(tables) {
    var out = [];
    tables.forEach(function (t) { t.sizes.forEach(function (s) { if (findSize(out, s) === null) out.push(s); }); });
    return out;
  }

  function fmtNum(n) {
    return Number((+n).toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  /** Build the WhatsApp message a staff phone sends. counts: {tableId: {sizeKey: number}} */
  function buildStaffMessage(tables, counts, shop, dateLabel) {
    var out = [];
    out.push('*AL NAEEM STOCK COUNT*');
    out.push('Shop: ' + (shop === 'HO' ? 'HO (Head Office)' : 'BR (Branch)'));
    out.push('Date: ' + dateLabel);
    var total = 0;
    tables.forEach(function (t) {
      out.push('');
      out.push('*' + t.title.toUpperCase() + '*');
      t.sizes.forEach(function (s) {
        var n = (counts[t.id] && counts[t.id][String(s)]) || 0;
        total += n;
        out.push(fmtNum(s) + 'g: ' + n);
      });
    });
    out.push('');
    out.push('TOTAL PIECES: ' + total);
    return out.join('\n');
  }

  var api = { parseMessage: parseMessage, buildStaffMessage: buildStaffMessage, fmtNum: fmtNum, sameSize: sameSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StockParser = api;
})(this);
