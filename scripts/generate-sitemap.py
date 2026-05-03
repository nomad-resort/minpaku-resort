#!/usr/bin/env python3
"""
generate-sitemap.py
cities.json の全都市スラグから sitemap.xml を生成するスクリプト。

実行:
    python3 scripts/generate-sitemap.py
"""

import json
from datetime import date
from pathlib import Path

ROOT          = Path(__file__).parent.parent
CITIES_PATH   = ROOT / "data" / "cities.json"
SITEMAP_PATH  = ROOT / "sitemap.xml"
BASE_DOMAIN   = "minpaku-resort.com"
TODAY         = date.today().isoformat()

def build():
    with open(CITIES_PATH, encoding="utf-8") as f:
        cities = json.load(f)

    urls = []

    # ── ルートドメイン（www） ─────────────────────────────────────
    urls.append({
        "loc": f"https://www.{BASE_DOMAIN}/",
        "priority": "1.0",
        "changefreq": "weekly",
    })

    # ── 各都市サブフォルダ ────────────────────────────────────────
    for city_slug in cities.keys():
        urls.append({
            "loc": f"https://www.{BASE_DOMAIN}/{city_slug}/",
            "priority": "0.8",
            "changefreq": "monthly",
        })

    # ── 静的ページ ────────────────────────────────────────────────
    for path in ["privacy-policy.html", "terms.html"]:
        if (ROOT / path).exists():
            urls.append({
                "loc": f"https://www.{BASE_DOMAIN}/{path}",
                "priority": "0.3",
                "changefreq": "yearly",
            })

    # ── XML生成 ───────────────────────────────────────────────────
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for u in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{u['loc']}</loc>")
        lines.append(f"    <lastmod>{TODAY}</lastmod>")
        lines.append(f"    <changefreq>{u['changefreq']}</changefreq>")
        lines.append(f"    <priority>{u['priority']}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")

    SITEMAP_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"✓ sitemap.xml 生成完了: {len(urls)} URL → {SITEMAP_PATH}")


if __name__ == "__main__":
    build()
