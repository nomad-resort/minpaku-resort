# ヒーロー画像 差し替えリスト

作成日: 2026-06-12  
背景: 同一都道府県内の複数都市が同じヒーロー画像を共有しており、ユーザー体験と OGP カード品質に影響している。  
対応方法: 各都市の画像を用意し `/images/city-hero-images/` に保存 → `data/cities.json` の `heroImage` フィールドを更新 → `python3 scripts/build-static-pages.py` で再ビルド。

---

## 🔴 最優先（観光ブランドが強く・競合との差別化効果が大きい）

| 都市 | slug | 現在の共有画像 | 推奨する画像イメージ | 参考キーワード（英語） |
|---|---|---|---|---|
| ニセコ | `niseko` | `hokkaido-hero_resized.jpg` | パウダースノーのゲレンデ・外国人スキーヤー | `niseko ski resort powder snow` |
| 小樽 | `otaru` | `hokkaido-hero_resized.jpg` | 小樽運河・倉庫群のガス灯 | `otaru canal gaslight night` |
| 富良野 | `furano` | `hokkaido-hero_resized.jpg` | ラベンダー畑（紫のグラデーション） | `furano lavender field hokkaido` |
| 美瑛 | `biei` | `hokkaido-hero_resized.jpg` | 丘の農場・パッチワークの路 | `biei patchwork road hills hokkaido` |
| 箱根 | `hakone` | `kanagawa-hero_resized.jpg` | 芦ノ湖越しの富士山・温泉宿 | `hakone lake ashi mount fuji` |
| 鎌倉 | `kamakura` | `kanagawa-hero_resized.jpg` | 鎌倉大仏・紫陽花・海 | `kamakura great buddha hydrangea` |
| 河口湖 | `kawaguchiko` | `yamanashi-hero_resized.jpg` | 河口湖の逆さ富士 | `kawaguchiko lake mount fuji reflection` |
| 石垣島 | `ishigaki` | `okinawa-hero_resized.jpg` | 川平湾・エメラルドグリーン | `kabira bay ishigaki emerald sea` |
| 宮古島 | `miyakojima` | `okinawa-hero_resized.jpg` | 砂浜・透き通る海 | `miyakojima beach crystal clear water` |

## 🟡 次優先

| 都市 | slug | 現在の共有画像 | 推奨する画像イメージ | 参考キーワード（英語） |
|---|---|---|---|---|
| 恩納村 | `onna` | `okinawa-hero_resized.jpg` | 万座毛・珊瑚礁の海 | `manzamo cape okinawa coral reef` |
| 松島 | `matsushima` | `miyagi-hero_resized.jpg` | 松島湾の島々・遊覧船 | `matsushima bay islands pine` |
| 日光 | `nikko` | `tochigi-hero_resized.jpg` | 日光東照宮・杉並木・紅葉 | `nikko toshogu shrine autumn leaves` |
| 由布院 | `yufuin` | `oita-hero_resized.jpg` | 由布岳と湯の壺の湯けむり | `yufuin onsen steam mount yufu` |

## 🟢 後回しでも可

| 都市 | slug | 現在の共有画像 | 推奨する画像イメージ | 参考キーワード（英語） |
|---|---|---|---|---|
| 横浜 | `yokohama` | `kanagawa-hero_resized.jpg` | 横浜みなとみらい夜景 | `yokohama minato mirai night view` |
| 那須 | `nasu` | `tochigi-hero_resized.jpg` | 那須高原・牧場・紅葉 | `nasu highlands ranch autumn` |
| 別府 | `beppu` | `oita-hero_resized.jpg` | 地獄めぐり・温泉湯気 | `beppu jigoku onsen steam hell` |
| 富士吉田 | `fujiyoshida` | `yamanashi-hero_resized.jpg` | 富士山（kawaguchiko と構図を変える） | `fujiyoshida chureito pagoda mount fuji` |
| 北杜 | `hokuto` | `yamanashi-hero_resized.jpg` | 八ヶ岳・清里高原 | `hokuto kiyosato kogen yatsugatake` |
| 仙台 | `sendai` | `miyagi-hero_resized.jpg` | 七夕まつり・欅並木 | `sendai tanabata festival keyaki street` |
| 那覇 | `naha` | `okinawa-hero_resized.jpg` | 首里城・国際通り | `naha shuri castle kokusai street` |

---

## 実装手順

```bash
# 1. 画像を /images/city-hero-images/{slug}-hero.jpg に保存

# 2. data/cities.json の heroImage フィールドを更新
#    例: "heroImage": "images/city-hero-images/niseko-hero.jpg"

# 3. 静的ページ再ビルド
python3 scripts/build-static-pages.py
```

## 画像素材の入手先

- **Unsplash**: https://unsplash.com （商用無料・クレジット不要）
- **Pexels**: https://www.pexels.com （商用無料・クレジット不要）
- 推奨サイズ: 1920×1080px 以上、横位置、ファイルサイズは 500KB 以下に圧縮（WebP 推奨）
