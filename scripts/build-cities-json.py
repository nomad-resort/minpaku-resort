#!/usr/bin/env python3
"""
build-cities-json.py
prefectures.json + city-slugs.json → data/cities.json を生成するスクリプト。

実行:
    python3 scripts/build-cities-json.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
PREFS_PATH   = ROOT / "data" / "prefectures.json"
SLUGS_PATH   = ROOT / "data" / "city-slugs.json"
OUTPUT_PATH  = ROOT / "data" / "cities.json"

# -------------------------------------------------------------------
# 都市名からサブドメイン表示用の短縮名を作る
# 例: "藤沢市（江の島）" → "江の島"  / "鎌倉市" → "鎌倉"
# -------------------------------------------------------------------
def city_short(city_name: str) -> str:
    # 括弧内の別称を優先する
    m = re.search(r'[（(]([^）)]+)[）)]', city_name)
    if m:
        return m.group(1)
    # 市・町・村・区を除去
    return re.sub(r'[市町村区]$', '', city_name)


def pref_short(pref_name: str) -> str:
    return re.sub(r'[都道府県]$', '', pref_name)


# -------------------------------------------------------------------
# AI生成プレースホルダー生成
# -------------------------------------------------------------------
def placeholder_tagline(city_short_name: str, pref_name: str) -> str:
    return f"{city_short_name}エリアの民泊運営・清掃をエリアに精通したチームが"

def placeholder_copy(city_short_name: str) -> str:
    return f"{city_short_name}の民泊に、安心と高品質を。"

def placeholder_subcopy(city_short_name: str, pref_name: str) -> str:
    return (
        f"【AI_GENERATE】{city_short_name}（{pref_name}）の民泊運営代行・清掃代行サービスの特徴を"
        f"2〜3文で記述してください。地域特性・ゲスト層・季節特性を必ず含めること。"
    )

def placeholder_local_rules(city_short_name: str) -> list:
    return [
        {
            "icon": "fas fa-map-marker-alt",
            "title": f"【AI_GENERATE】{city_short_name}固有ルール①",
            "body": f"【AI_GENERATE】{city_short_name}特有の民泊運営上の注意点・課題を具体的に記述",
            "highlight": "【AI_GENERATE】キーワード①"
        },
        {
            "icon": "fas fa-users",
            "title": f"【AI_GENERATE】{city_short_name}固有ルール②",
            "body": f"【AI_GENERATE】{city_short_name}のゲスト層・需要特性に関する注意点",
            "highlight": "【AI_GENERATE】キーワード②"
        },
        {
            "icon": "fas fa-calendar-alt",
            "title": f"【AI_GENERATE】{city_short_name}固有ルール③",
            "body": f"【AI_GENERATE】{city_short_name}の季節性・繁閑差への対応策",
            "highlight": "【AI_GENERATE】キーワード③"
        }
    ]

def placeholder_cleaning_feature(city_short_name: str) -> dict:
    return {
        "title": f"【AI_GENERATE】{city_short_name}の地域特性に合わせた清掃",
        "body": f"【AI_GENERATE】{city_short_name}ならではの清掃上の特徴・工夫を2文で記述"
    }

def placeholder_seo_title(city_short_name: str) -> str:
    return f"{city_short_name}の民泊 運営代行・清掃代行 | Minpaku Resort"

def placeholder_seo_description(city_short_name: str, pref_name: str) -> str:
    return (
        f"【AI_GENERATE】{city_short_name}（{pref_name}）の民泊オーナー向け。"
        f"運営代行・清掃代行の特徴を120〜160字で記述。地域固有のキーワードを含めること。"
    )

def placeholder_map_embed(city_name: str, pref_name: str) -> str:
    # デフォルトのGoogleマップ埋め込みURL（都市名で検索）
    query = f"{pref_name}{city_name}"
    return (
        f"https://www.google.com/maps/embed/v1/place"
        f"?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY"
        f"&q={query}&language=ja"
    )


# -------------------------------------------------------------------
# メイン変換ロジック
# -------------------------------------------------------------------
def build():
    with open(PREFS_PATH, encoding="utf-8") as f:
        prefs = json.load(f)
    with open(SLUGS_PATH, encoding="utf-8") as f:
        slugs = json.load(f)

    cities = {}
    slug_to_pref = {}   # 逆引きマップ（slug → prefKey）
    slug_set = set()

    for pref_key, pref_data in prefs.items():
        pref_slug_map = slugs.get(pref_key, {})
        pref_municipalities = pref_data.get("municipalities", [])

        # 同一都道府県内の全都市スラグリスト（対応エリア表示用）
        same_pref_cities = []
        for mun in pref_municipalities:
            slug = pref_slug_map.get(mun)
            if slug:
                same_pref_cities.append({"name": mun, "slug": slug})

        for city_name in pref_municipalities:
            city_slug = pref_slug_map.get(city_name)
            if not city_slug:
                print(f"  [WARN] スラグ未定義: {pref_key} / {city_name}", file=sys.stderr)
                continue

            if city_slug in slug_set:
                print(f"  [WARN] スラグ重複: {city_slug} ({pref_key}/{city_name})", file=sys.stderr)
                continue
            slug_set.add(city_slug)
            slug_to_pref[city_slug] = pref_key

            short = city_short(city_name)
            p_short = pref_short(pref_data["prefName"])

            city_entry = {
                # ── 識別キー ──
                "cityKey":   city_slug,
                "cityName":  city_name,
                "cityShort": short,
                "prefKey":   pref_key,
                "prefName":  pref_data["prefName"],
                "prefShort": p_short,

                # ── ヒーロー（都道府県画像を流用） ──
                "heroImage":   pref_data["heroImage"],
                "heroTagline": placeholder_tagline(short, pref_data["prefName"]),
                "heroCopy":    placeholder_copy(short),
                "heroSubcopy": placeholder_subcopy(short, pref_data["prefName"]),

                # ── ローカルルール（AI生成プレースホルダー） ──
                "localRules": placeholder_local_rules(short),

                # ── 対応エリア（同一都道府県の全都市） ──
                "municipalities": [c["name"] for c in same_pref_cities],

                # ── スタッフ（都道府県から継承） ──
                "staff": pref_data.get("staff", []),

                # ── 清掃特集（AI生成プレースホルダー） ──
                "cleaningFeature": placeholder_cleaning_feature(short),

                # ── 料金（都道府県から継承） ──
                "cleaningPrices": pref_data.get("cleaningPrices", {
                    "1R・1K": 5000,
                    "1LDK": 6500,
                    "2LDK": 9000,
                    "3LDK": 12000,
                    "4LDK・コテージ": 16000,
                    "ログハウス・大型物件": 22000
                }),

                # ── 地図（都市中心）──
                "mapEmbedUrl": placeholder_map_embed(city_name, pref_data["prefName"]),

                # ── SEO ──
                "seoTitle":       placeholder_seo_title(short),
                "seoDescription": placeholder_seo_description(short, pref_data["prefName"]),

                # ── 事例・口コミ（都道府県から継承） ──
                "caseStudies": pref_data.get("caseStudies", []),
                "voices":      pref_data.get("voices", []),
            }

            cities[city_slug] = city_entry

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cities, f, ensure_ascii=False, indent=2)

    print(f"\n✓ cities.json 生成完了: {len(cities)} 都市 → {OUTPUT_PATH}")
    print(f"  AI_GENERATE プレースホルダー数: {len(cities) * 7} 項目")

    # 統計サマリー
    by_pref = {}
    for slug, entry in cities.items():
        pk = entry["prefKey"]
        by_pref.setdefault(pk, []).append(slug)
    for pk, slugs_list in by_pref.items():
        print(f"  {pk}: {len(slugs_list)} 都市 — {', '.join(slugs_list)}")


if __name__ == "__main__":
    build()
