#!/usr/bin/env python3
"""Gera frente.svg e verso.svg (A4 paisagem, unidades em mm) e, com o Chromium do Playwright,
os PNGs usados pelo gerador de PDF em public/certificado/.
Uso: python3 design/certificado/build.py   (PNG: node design/certificado/render.mjs)"""
import math, pathlib

NAVY, GOLD, GOLD_D, CREAM = '#17367e', '#e0a100', '#b07d00', '#fffaf0'
W, H = 297, 210
CX = W / 2

def rays(cx, cy, n=48, r=330, op=0.07):
    out = []
    step = 2 * math.pi / n
    for i in range(0, n, 2):
        a0, a1 = i * step, (i + 1) * step
        p = f"M{cx} {cy} L{cx + r * math.cos(a0):.1f} {cy + r * math.sin(a0):.1f} L{cx + r * math.cos(a1):.1f} {cy + r * math.sin(a1):.1f}Z"
        out.append(p)
    return f'<path d="{" ".join(out)}" fill="url(#sun)" opacity="{op}"/>'

def corner(x, y, sx, sy):
    return f'''<g transform="translate({x} {y}) scale({sx} {sy})" fill="none" stroke="{GOLD}" stroke-width="0.9" stroke-linecap="round">
  <path d="M0 16 Q0 0 16 0"/><path d="M0 24 Q0 0 24 0" stroke-width="0.4" stroke="{NAVY}"/>
  <circle cx="5.2" cy="5.2" r="1.6" fill="{NAVY}" stroke="none"/><path d="M9 3.2l1.6 1.6-1.6 1.6-1.6-1.6z M3.2 9l1.6 1.6-1.6 1.6-1.6-1.6z" fill="{GOLD}" stroke="none"/>
</g>'''

def emblem(cx, top):
    s = 0.55
    tx, ty = cx - 32 * s, top - 6 * s
    return f'''<g transform="translate({tx:.2f} {ty:.2f}) scale({s})">
  <g stroke="{GOLD}" stroke-width="3" stroke-linecap="round"><path d="M32 6v7M13.5 13.5l5 5M50.5 13.5l-5 5M6 31h7M51 31h7"/></g>
  <path d="M19 33a13 13 0 0 1 26 0z" fill="url(#sun)"/>
  <path d="M8 36c8-3 17-2 24 3 7-5 16-6 24-3v17c-8-3-17-2-24 3-7-5-16-6-24-3z" fill="#fff" stroke="{NAVY}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M32 39v17" stroke="{NAVY}" stroke-width="2"/>
</g>'''

def divider(y, half=45):
    return f'''<g stroke="{GOLD}" stroke-width="0.5"><path d="M{CX-half} {y}H{CX-4}M{CX+4} {y}H{CX+half}"/></g>
<path d="M{CX} {y-2.2}l2.2 2.2-2.2 2.2-2.2-2.2z" fill="{NAVY}"/><circle cx="{CX-half-1.5}" cy="{y}" r="0.9" fill="{GOLD}"/><circle cx="{CX+half+1.5}" cy="{y}" r="0.9" fill="{GOLD}"/>'''

def page(div_y):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">
<defs>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd95e"/><stop offset="1" stop-color="{GOLD}"/></linearGradient>
  <radialGradient id="paper" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="{CREAM}"/><stop offset="1" stop-color="#f6e7c1"/></radialGradient>
  <clipPath id="inner"><rect x="11" y="11" width="{W-22}" height="{H-22}"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#paper)"/>
<g clip-path="url(#inner)">{rays(CX, 40)}
  <path d="M11 {H-11}V{H-30}Q{CX/2} {H-38} {CX} {H-30}T{W-11} {H-30}V{H-11}Z" fill="{GOLD}" opacity="0.10"/>
  <path d="M11 {H-11}V{H-24}Q{CX/2} {H-32} {CX} {H-24}T{W-11} {H-24}V{H-11}Z" fill="{NAVY}" opacity="0.06"/></g>
<rect x="6" y="6" width="{W-12}" height="{H-12}" rx="2" fill="none" stroke="{NAVY}" stroke-width="1.6"/>
<rect x="9" y="9" width="{W-18}" height="{H-18}" fill="none" stroke="{GOLD}" stroke-width="0.7"/>
<rect x="11" y="11" width="{W-22}" height="{H-22}" fill="none" stroke="{NAVY}" stroke-width="0.25"/>
{corner(11,11,1,1)}{corner(W-11,11,-1,1)}{corner(11,H-11,1,-1)}{corner(W-11,H-11,-1,-1)}
{emblem(CX, 15)}
{divider(div_y)}
</svg>'''

here = pathlib.Path(__file__).parent
(here / 'frente.svg').write_text(page(85))
(here / 'verso.svg').write_text(page(63))
print('ok')
