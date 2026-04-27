#!/usr/bin/env python3
"""
fix-cities-data.py
cities.json の以下2点を修正するスクリプト:
  1. caseStudies / voices のテキスト内に残っている都道府県名 → 都市名に置換
  2. mapEmbedUrl を API キー不要の形式に変更

実行:
    python3 scripts/fix-cities-data.py
"""

import json
import re
from pathlib import Path

ROOT         = Path(__file__).parent.parent
CITIES_PATH  = ROOT / "data" / "cities.json"

def replace_pref_with_city(text: str, pref_name: str, pref_short: str,
                            city_name: str, city_short: str) -> str:
    """
    テキスト内の都道府県名を都市名に置換する。
    優先順位: より長い文字列（prefName）を先に処理して誤爆を防ぐ。
    """
    # 「広島県内」→「尾道市内」（{prefName}内 → {cityShort}市内）
    text = text.replace(pref_name + '内', city_short + '市内')
    # 「広島県エリア」→「尾道エリア」
    text = text.replace(pref_name + 'エリア', city_short + 'エリア')
    # 「広島県の」→「尾道の」（残りの prefName を一括置換）
    text = text.replace(pref_name, city_short)

    # prefShort が pref_name と異なる場合（例: 神奈川, 大阪）も処理
    if pref_short and pref_short != pref_name and pref_short != city_short:
        text = text.replace(pref_short + '内', city_short + '市内')
        text = text.replace(pref_short + 'エリア', city_short + 'エリア')
        text = text.replace(pref_short, city_short)

    return text


def fix_case_studies(case_studies: list, pref_name: str, pref_short: str,
                     city_name: str, city_short: str) -> list:
    result = []
    for c in case_studies:
        fixed = dict(c)
        for field in ['location', 'review']:
            if field in fixed and isinstance(fixed[field], str):
                fixed[field] = replace_pref_with_city(
                    fixed[field], pref_name, pref_short, city_name, city_short)
        result.append(fixed)
    return result


def fix_voices(voices: list, pref_name: str, pref_short: str,
               city_name: str, city_short: str) -> list:
    result = []
    for v in voices:
        fixed = dict(v)
        for field in ['title', 'quote', 'body']:
            if field in fixed and isinstance(fixed[field], str):
                fixed[field] = replace_pref_with_city(
                    fixed[field], pref_name, pref_short, city_name, city_short)
        result.append(fixed)
    return result


def make_free_map_url(city_name: str, pref_name: str) -> str:
    """
    API キー不要の Google Maps 埋め込み URL を生成する。
    クエリは「都道府県名 都市名」で検索。
    """
    # 括弧内の別称を除去した純粋な都市名
    clean_city = re.sub(r'[（(][^）)]*[）)]', '', city_name).strip()
    query = f"{pref_name} {clean_city}"
    encoded = query.replace(' ', '+')
    return f"https://maps.google.com/maps?q={encoded}&output=embed&hl=ja&z=13"


def main():
    with open(CITIES_PATH, encoding='utf-8') as f:
        cities = json.load(f)

    changed = 0
    for slug, entry in cities.items():
        pref_name  = entry.get('prefName', '')
        pref_short = entry.get('prefShort', '')
        city_name  = entry.get('cityName', '')
        city_short = entry.get('cityShort', '')

        modified = False

        # ── 1. caseStudies ──────────────────────────────────────────
        if entry.get('caseStudies'):
            fixed_cs = fix_case_studies(
                entry['caseStudies'], pref_name, pref_short, city_name, city_short)
            if fixed_cs != entry['caseStudies']:
                entry['caseStudies'] = fixed_cs
                modified = True

        # ── 2. voices ───────────────────────────────────────────────
        if entry.get('voices'):
            fixed_vx = fix_voices(
                entry['voices'], pref_name, pref_short, city_name, city_short)
            if fixed_vx != entry['voices']:
                entry['voices'] = fixed_vx
                modified = True

        # ── 3. mapEmbedUrl（API キー不要に変更） ─────────────────────
        old_url = entry.get('mapEmbedUrl', '')
        if 'maps.googleapis.com' in old_url or '/embed/v1/place' in old_url or 'key=' in old_url:
            entry['mapEmbedUrl'] = make_free_map_url(city_name, pref_name)
            modified = True

        if modified:
            changed += 1

    with open(CITIES_PATH, 'w', encoding='utf-8') as f:
        json.dump(cities, f, ensure_ascii=False, indent=2)

    print(f"✓ cities.json 修正完了: {changed} 都市を更新")

    # 修正結果サンプル確認
    print("\n=== 修正後サンプル ===")
    for slug in ['onomichi', 'kamakura', 'naha', 'sapporo']:
        d = cities[slug]
        print(f"\n[{slug}] {d['cityName']}")
        for c in d.get('caseStudies', [])[:1]:
            print(f"  case.location: {c.get('location')}")
            print(f"  case.review:   {c.get('review', '')[:60]}...")
        for v in d.get('voices', [])[:1]:
            print(f"  voice.title: {v.get('title')}")
            print(f"  voice.body:  {v.get('body', '')[:60]}...")
        print(f"  mapEmbedUrl: {d.get('mapEmbedUrl')}")


if __name__ == '__main__':
    main()
