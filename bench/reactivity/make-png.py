#!/usr/bin/env python3
"""Renders bench/reactivity/report-*.png from samples3.json / samples2.json.

Images render everywhere, including viewers that will not show .md or .html.
usage: python3 make-png.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

import os
DIR = os.path.dirname(os.path.abspath(__file__))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def f(path, size):
    return ImageFont.truetype(path, size)


INK = (23, 24, 28)
GREY = (110, 115, 125)
LINE = (230, 232, 236)
GREEN = (10, 125, 56)
GREEN_BG = (232, 247, 238)
RED = (179, 38, 30)
RED_BG = (253, 236, 236)
BLUE = (37, 99, 235)

ORDER = ['ulive', 'ulive-lazy', 'Preact Signals', 'uSignal', 'alien-signals']
SHORT = {'ulive': 'ulive', 'ulive-lazy': 'ulive-pull', 'Preact Signals': 'Preact',
         'uSignal': 'uSignal', 'alien-signals': 'alien'}


def load(*names):
    # the A/B run is checked in with its medians only (the full file is ~600 KB)
    for name in names:
        if os.path.exists(f'{DIR}/{name}'):
            with open(f'{DIR}/{name}') as fh:
                return json.load(fh)
    raise SystemExit(f'none of {names} found in {DIR}')


def group(rows):
    out = {}
    for r in rows:
        out.setdefault(r['name'], {})[r['framework']] = r
    return out


def fmt(v):
    if v is None:
        return '—'
    if v.get('failure'):
        return 'FAIL'
    ms = v['estimateMs']
    if ms < 0.01:
        return f'{ms:.2e}'
    if ms < 1:
        return f'{ms:.3f}'
    if ms < 100:
        return f'{ms:.2f}'
    return f'{ms:.0f}'


def text_w(draw, s, font):
    return draw.textbbox((0, 0), s, font=font)[0:2] and (draw.textbbox((0, 0), s, font=font)[2])


class Page:
    def __init__(self, width, height):
        self.img = Image.new('RGB', (width, height), 'white')
        self.d = ImageDraw.Draw(self.img)
        self.w = width
        self.y = 46

    def title(self, s, sub=None):
        self.d.text((56, self.y), s, font=f(BOLD, 34), fill=INK)
        self.y += 48
        if sub:
            self.d.text((56, self.y), sub, font=f(FONT, 15), fill=GREY)
            self.y += 30
        self.y += 14

    def h2(self, s):
        self.y += 16
        self.d.text((56, self.y), s, font=f(BOLD, 21), fill=INK)
        self.y += 34
        self.d.line((56, self.y - 10, self.w - 56, self.y - 10), fill=LINE, width=2)
        self.y += 6

    def para(self, s, size=15, colour=INK, gap=24):
        for line in s.split('\n'):
            self.d.text((56, self.y), line, font=f(FONT, size), fill=colour)
            self.y += size + 8
        self.y += gap - 8

    def cards(self, items):
        n = len(items)
        gap = 16
        cw = (self.w - 112 - gap * (n - 1)) // n
        ch = 108
        x = 56
        for label, value, note in items:
            self.d.rounded_rectangle((x, self.y, x + cw, self.y + ch), 12, outline=LINE, width=2)
            self.d.text((x + 18, self.y + 16), label, font=f(FONT, 13), fill=GREY)
            self.d.text((x + 18, self.y + 38), value, font=f(BOLD, 30), fill=GREEN if 'win' in label else INK)
            self.d.text((x + 18, self.y + 80), note, font=f(FONT, 12), fill=GREY)
            x += cw + gap
        self.y += ch + 26

    def table(self, headers, rows, widths, aligns, highlight=None, size=14):
        # rows are (cells, kind) or (cells, kind, green_column_indexes)
        font = f(FONT, size)
        x0 = 56
        self.d.rectangle((x0, self.y, x0 + sum(widths), self.y + 32), fill=(246, 247, 249))
        x = x0
        for h, w, a in zip(headers, widths, aligns):
            tw = text_w(self.d, h, f(BOLD, size))
            self.d.text((x + (w - tw - 16 if a == 'right' else 12), self.y + 8), h, font=f(BOLD, size), fill=INK)
            x += w
        self.y += 32
        for entry in rows:
            row, kind = entry[0], entry[1]
            greens = entry[2] if len(entry) > 2 else ()
            h = 27
            x = x0
            if kind == 'best':
                self.d.rectangle((x0, self.y, x0 + sum(widths), self.y + h), fill=GREEN_BG)
            elif kind == 'fail':
                self.d.rectangle((x0, self.y, x0 + sum(widths), self.y + h), fill=RED_BG)
            for i, (cell, w, a) in enumerate(zip(row, widths, aligns)):
                colour = INK
                if kind == 'fail' and str(cell) == 'FAIL':
                    colour = RED
                if i in greens:
                    colour = GREEN
                tw = text_w(self.d, str(cell), font)
                self.d.text((x + (w - tw - 16 if a == 'right' else 12), self.y + 5), str(cell), font=font, fill=colour)
                x += w
            self.d.line((x0, self.y + h, x0 + sum(widths), self.y + h), fill=LINE, width=1)
            self.y += h
        self.y += 24

    def save(self, name):
        crop = self.img.crop((0, 0, self.img.width, self.y + 10))
        d = ImageDraw.Draw(crop)
        d.text((56, crop.height - 22), 'ulive · official js-reactivity-benchmark · bench/reactivity/',
               font=f(FONT, 11), fill=GREY)
        crop.save(f'{DIR}/{name}')
        print('wrote', name, f'{self.img.width}x{self.y + 10}')


def main():
    r3 = group(load('samples3.json')['rows'])
    r2 = group(load('samples2.json', 'samples2-rows.json')['rows'])

    def med(vals):
        vals = sorted(vals)
        m = len(vals) // 2
        return vals[m] if len(vals) % 2 else (vals[m - 1] + vals[m]) / 2

    fws3 = [x for x in ORDER if any(x in v for v in r3.values())]
    paired = [v for v in r3.values() if all(x in v for x in fws3)]
    medians = sorted(((x, med([v[x]['estimateMs'] for v in paired])) for x in fws3), key=lambda t: t[1])

    # ---------- page 1: summary ----------
    p = Page(1240, 1700)
    p.title('ulive in the official js-reactivity-benchmark',
            'volynetstyle/js-reactivity-benchmark · semantics v4 · BENCH_PROFILE=quick · one forked worker per row')
    p.para('Xeon @ 2.60 GHz (2 cores) · Node v22.22.3 · 51 scenarios · medians in ms, lower is better',
           size=14, colour=GREY, gap=8)
    p.cards([
        ('scenarios rejected', '0 / 51', 'was 3 / 51 before the fix'),
        ('ulive median', '51.6 ms', 'old core: 80.5 ms'),
        ('vs Preact', '2.30x', 'ahead on 7 of 49 scenarios'),
        ('size, brotli', '578 B', '490 B before redesign'),
    ])

    p.h2('Final standings — median of the 49 scenarios every build completes')
    rows = []
    for i, (name, m) in enumerate(medians, 1):
        rows.append((([f'{i}.', SHORT[name], f'{m:.1f} ms'], 'best' if name == 'ulive' else None),))
    p.table(['#', 'library', 'median'], [(r[0][0], r[0][1]) for r in rows], [50, 460, 200], ['left', 'left', 'right'])

    p.h2('Where ulive wins — large graphs')
    win_names = ['dynamic/large web app', 'dynamic/wide dense', 'dynamic/stable diamond mesh warm',
                 'dynamic/dashboard selective reads', 'manySourcesIntoOneDirectEffect']
    cols = ['ulive', 'Preact Signals', 'uSignal', 'alien-signals']
    rows = []
    for n in win_names:
        v = r3[n]
        vals = [v[c]['estimateMs'] for c in cols]
        rows.append(([n] + [fmt(v[c]) for c in cols], None, (1 + vals.index(min(vals)),)))
    p.table(['scenario', 'ulive', 'Preact', 'uSignal', 'alien'],
            rows, [440, 150, 150, 150, 150], ['left', 'right', 'right', 'right', 'right'])

    p.h2('Where ulive loses — tiny graphs')
    lose_names = ['cellx1000', 'cellx2500', 'avoidablePropagation', 'updateComputations1to1',
                  'manyEffectsFromOneSource']
    rows = []
    for n in lose_names:
        v = r3[n]
        vals = [v[c]['estimateMs'] for c in cols]
        rows.append(([n] + [fmt(v[c]) for c in cols], None, (1 + vals.index(min(vals)),)))
    p.table(['scenario', 'ulive', 'Preact', 'uSignal', 'alien'],
            rows, [440, 150, 150, 150, 150], ['left', 'right', 'right', 'right', 'right'])

    p.h2('Before vs after — one interleaved run, same machine')
    ab = [('triangle', 'FAIL', '0.329'), ('dynamic/large web app', 'FAIL', '966'),
          ('dynamic/simple component', '1650', '677'), ('dynamic/dashboard', '1704', '898'),
          ('dynamic/editor derived state', '2760', '1446'), ('dynamic/stable diamond mesh', '31.7', '17.4'),
          ('avoidablePropagation', '0.637', '1.49'), ('cellx2500', '12.0', '29.9')]
    p.table(['scenario', 'eager 5cef7c3', 'pull-based', 'note'],
            [(([n, a, b, 'fixed' if a == 'FAIL' else ('faster' if float(b) < float(a) else 'slower')]), None) for n, a, b in ab],
            [440, 190, 170, 180], ['left', 'right', 'right', 'left'])
    p.para('median of the 46 comparable scenarios: 80.5 ms -> 51.9 ms, wins 38 of 46.\n'
           'The harness rejected 3 rows on the old core (glitchy intermediate deliveries); none now.',
           size=14, colour=GREY)
    p.save('report-1-summary.png')

    # ---------- page 2: full table ----------
    items = list(r3.items())
    p = Page(1240, 400 + 27 * len(items) + 700)
    p.title('All 51 scenarios', 'medians in ms · green ratio = ulive faster than Preact · lower is better everywhere')
    rows = []
    for name, v in items:
        cells = [name]
        for c in cols:
            cells.append(fmt(v.get(c)))
        u = v.get('ulive', {}).get('estimateMs')
        pre = v.get('Preact Signals', {}).get('estimateMs')
        cells.append(f'{u / pre:.2f}x' if u and pre else '—')
        ratio = cells[-1]
        greens = (5,) if ratio.endswith('x') and ratio != '—' and float(ratio[:-1]) < 1 else ()
        rows.append((cells, None, greens))
    p.table(['scenario', 'ulive', 'Preact', 'uSignal', 'alien', 'ulive/Preact'],
            rows, [430, 140, 140, 140, 140, 190],
            ['left', 'right', 'right', 'right', 'right', 'right'], size=13)
    p.h2('What was wrong before')
    p.para('ulive (eager)  diamond: b x1 c x1 d x2 recomputes per write (ideal 1/1/1) | effect saw [4,5]\n'
           'ulive (eager)  4x3 torus: 60 recomputes for one write (ideal 16)\n'
           'ulive (pull)   diamond: b x1 c x1 d x1 recomputes per write | effect saw [5]\n'
           'preact         diamond: b x1 c x1 d x1 recomputes per write | effect saw [5]', size=14)
    p.save('report-2-table.png')


main()
