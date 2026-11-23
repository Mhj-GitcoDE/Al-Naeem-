/* Draws the shareable report image on a canvas, and wraps it in a PDF. No libraries. */
(function (root) {
  'use strict';
  var W = 720, PAD = 28, SCALE = 2;
  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var C = { night: '#064E3B', night2: '#0A5C46', gold: '#F3E9D2', goldInk: '#047857', ink: '#1C1A16', muted: '#6B655A', muted2: '#4A5A52', line: '#EEEAE1', cream: '#F3EAD5', cream2: '#F1E8D2', soft: '#CFE3D8' };

  function font(w, s) { return w + ' ' + s + 'px ' + FONT; }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function star(ctx, cx, cy, r, w) {
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + w, cy - w); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + w, cy + w);
    ctx.lineTo(cx, cy + r); ctx.lineTo(cx - w, cy + w); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - w, cy - w); ctx.closePath();
  }
  function diamond(ctx, x, y, size) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 48, size / 48);
    var gb = ctx.createLinearGradient(0, 12, 0, 21); gb.addColorStop(0, '#E6FAFF'); gb.addColorStop(1, '#6CC4FF');
    poly(ctx, [12, 12, 36, 12, 44, 21, 4, 21]); ctx.fillStyle = gb; ctx.fill();
    var ga = ctx.createLinearGradient(4, 21, 44, 43); ga.addColorStop(0, '#BFF0FF'); ga.addColorStop(0.45, '#3FA2FF'); ga.addColorStop(1, '#0A3C9E');
    poly(ctx, [4, 21, 44, 21, 24, 43]); ctx.fillStyle = ga; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(4, 21); ctx.lineTo(44, 21);
    ctx.moveTo(12, 12); ctx.lineTo(18, 21); ctx.lineTo(24, 12); ctx.lineTo(30, 21); ctx.lineTo(36, 12);
    ctx.moveTo(18, 21); ctx.lineTo(24, 43); ctx.lineTo(30, 21); ctx.stroke();
    poly(ctx, [12, 12, 36, 12, 44, 21, 24, 43, 4, 21]); ctx.strokeStyle = '#DFF6FF'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; star(ctx, 40, 8, 6, 1.1); ctx.fill();
    ctx.globalAlpha = 0.85; star(ctx, 8, 11, 3, 0.6); ctx.fill();
    ctx.restore();
  }
  function text(ctx, s, x, y, f, color, align) {
    ctx.font = f; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
  }
  // shrink text to fit a width
  function fitText(ctx, s, x, y, weight, size, color, align, maxW) {
    var sz = size; ctx.font = font(weight, sz);
    while (ctx.measureText(s).width > maxW && sz > 9) { sz -= 0.5; ctx.font = font(weight, sz); }
    text(ctx, s, x, y, font(weight, sz), color, align);
  }

  // Column geometry for the 7-column table
  var X0 = PAD + 12, SIZE_W = 124, X_END = W - PAD - 12;
  var COL_W = (X_END - (X0 + SIZE_W)) / 6;
  function colRight(i) { return X0 + SIZE_W + COL_W * (i + 1); }

  function layoutHeight(d) {
    var h = 108;
    if (d.summary) h += 20 + 86;
    d.tables.forEach(function (t) { h += 22 + 30 + 34 + t.rows.length * 38 + 6 + 44; });
    h += 30 + 20 + 20;
    return h;
  }

  function draw(d) {
    var H = layoutHeight(d);
    var cv = document.createElement('canvas');
    cv.width = W * SCALE; cv.height = H * SCALE;
    var ctx = cv.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

    // header
    ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, 108);
    ctx.beginPath(); ctx.arc(PAD + 28, 54, 28, 0, Math.PI * 2); ctx.fillStyle = C.night2; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.gold; ctx.stroke();
    diamond(ctx, PAD + 28 - 20, 54 - 21, 40);
    text(ctx, 'AL NAEEM JEWELLERY L.L.C.', PAD + 72, 46, font(700, 13), C.gold);
    fitText(ctx, d.heading, PAD + 72, 76, 700, 24, '#FFFFFF', 'left', W - PAD - 72 - 150);
    text(ctx, d.dateLabel, W - PAD, 48, font(600, 16), '#FFFFFF', 'right');
    text(ctx, d.madeLabel, W - PAD, 72, font(400, 13), C.soft, 'right');
    var y = 108;

    // summary boxes
    if (d.summary) {
      y += 20;
      var bw = (W - 2 * PAD - 20) / 3, s = d.summary;
      var boxes = [['BOTH SHOPS', s.tg, s.pcs, true], ['HEAD OFFICE · HO', s.hog, s.ho, false], ['BRANCH · BR', s.brg, s.br, false]];
      boxes.forEach(function (b, i) {
        var bx = PAD + i * (bw + 10);
        rr(ctx, bx, y, bw, 86, 10); ctx.fillStyle = b[3] ? C.night : C.cream; ctx.fill();
        text(ctx, b[0], bx + 14, y + 24, font(700, 11.5), b[3] ? C.gold : C.muted2);
        fitText(ctx, b[1], bx + 14, y + 54, 800, 22, b[3] ? '#FFFFFF' : C.ink, 'left', bw - 28);
        text(ctx, b[2], bx + 14, y + 74, font(400, 13), b[3] ? C.soft : C.muted2);
      });
      y += 86;
    }

    var heads = ['HO PCS', 'BR PCS', 'TOTAL PCS', 'HO G', 'BR G', 'TOTAL G'];
    d.tables.forEach(function (t) {
      y += 22;
      fitText(ctx, t.title, PAD, y + 20, 800, 18, C.ink, 'left', W - 2 * PAD - 200);
      text(ctx, t.sumLine, W - PAD, y + 20, font(500, 13), C.muted, 'right');
      y += 30;
      rr(ctx, PAD, y, W - 2 * PAD, 34, 8); ctx.fillStyle = C.cream; ctx.fill();
      text(ctx, 'SIZE', X0, y + 22, font(700, 11.5), C.muted2);
      heads.forEach(function (h, i) { text(ctx, h, colRight(i), y + 22, font(700, 11.5), C.muted2, 'right'); });
      y += 34;
      t.rows.forEach(function (r) {
        fitText(ctx, r.label, X0, y + 24, 700, 14, C.ink, 'left', SIZE_W - 6);
        var vals = [r.ho, r.br, r.pcs, r.hoG, r.brG, r.tG];
        vals.forEach(function (v, i) {
          var bold = i === 2 || i === 5;
          fitText(ctx, v, colRight(i), y + 24, bold ? 700 : 400, 14, i === 5 ? C.goldInk : (i > 2 ? C.muted2 : C.ink), 'right', COL_W - 6);
        });
        ctx.fillStyle = C.line; ctx.fillRect(PAD, y + 37, W - 2 * PAD, 1);
        y += 38;
      });
      y += 6;
      rr(ctx, PAD, y, W - 2 * PAD, 44, 8); ctx.fillStyle = d.single ? C.night : C.cream2; ctx.fill();
      text(ctx, 'TOTAL', X0, y + 28, font(800, 14), d.single ? C.gold : C.ink);
      var tv = [t.tot.ho, t.tot.br, t.tot.pcs, t.tot.hoG, t.tot.brG, t.tot.tG];
      tv.forEach(function (v, i) {
        var col = d.single ? (i === 5 ? C.gold : '#FFFFFF') : (i === 5 ? C.goldInk : C.ink);
        fitText(ctx, v, colRight(i), y + 28, 800, 14, col, 'right', COL_W - 4);
      });
      y += 44;
    });

    y += 30;
    text(ctx, 'HO = Head Office · BR = Branch · weights in grams', PAD, y, font(400, 12.5), C.muted);
    text(ctx, 'Al Naeem Jewellery L.L.C.', W - PAD, y, font(600, 12.5), C.muted, 'right');
    return cv;
  }

  // Minimal one-page PDF that embeds the canvas as a JPEG, page width A4 (595pt).
  function toPdf(canvas) {
    var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    var bin = atob(dataUrl.split(',')[1]);
    var jpg = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);
    var w = canvas.width, h = canvas.height;
    var pw = 595.28, ph = +(pw * h / w).toFixed(2);
    var parts = [], len = 0, offs = [];
    function push(x) {
      var b;
      if (typeof x === 'string') { b = new Uint8Array(x.length); for (var j = 0; j < x.length; j++) b[j] = x.charCodeAt(j) & 0xff; }
      else b = x;
      parts.push(b); len += b.length;
    }
    function obj(n, fn) { offs[n] = len; push(n + ' 0 obj\n'); fn(); push('\nendobj\n'); }
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, function () { push('<< /Type /Catalog /Pages 2 0 R >>'); });
    obj(2, function () { push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'); });
    obj(3, function () { push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'); });
    obj(4, function () {
      push('<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
      push(jpg); push('\nendstream');
    });
    var content = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
    obj(5, function () { push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'); });
    var xref = len;
    push('xref\n0 6\n0000000000 65535 f \n');
    for (var n = 1; n <= 5; n++) push(('0000000000' + offs[n]).slice(-10) + ' 00000 n \n');
    push('trailer\n<< /Size 6 /Root 1 0 R /Info 6 0 R >>\n'.replace(' /Info 6 0 R', '') + 'startxref\n' + xref + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }

  root.StockReport = { draw: draw, toPdf: toPdf };
})(this);
