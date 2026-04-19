# Minpaku Resort — マスターテンプレート 技術ドキュメント

民泊運営・清掃代行サービス「Minpaku Resort」の LP を、  
**1つのHTMLファイル** で全国47都道府県に展開するための仕組みをまとめたドキュメントです。

---

## 目次

1. [ファイル構成](#1-ファイル構成)
2. [動的変化の仕組み（全体フロー）](#2-動的変化の仕組み全体フロー)
3. [どこで何が変わるか（セクション別対応表）](#3-どこで何が変わるかセクション別対応表)
4. [データファイルの構造](#4-データファイルの構造prefecturesjson)
5. [ロジックファイルの構造](#5-ロジックファイルの構造regionaljs)
6. [都道府県データの追加・編集方法](#6-都道府県データの追加編集方法)
7. [ローカルでの動作確認](#7-ローカルでの動作確認)
8. [Netlify へのデプロイ](#8-netlify-へのデプロイ)
9. [今後の対応予定](#9-今後の対応予定)

---

## 1. ファイル構成

```
Minpaku-Resort/
│
├── index.html               # マスターテンプレート（全都道府県共通）
├── produce.html             # 空間プロデュースページ
│
├── data/
│   └── prefectures.json     # ★ 47都道府県分のコンテンツデータ
│
├── js/
│   └── regional.js          # ★ サブドメイン検出 → データ注入エンジン
│
├── images/                  # 画像素材
│   ├── staff_1.png 〜 staff_4.png  # スタッフ写真（各都道府県共通）
│   └── ...
│
└── netlify.toml             # Netlify デプロイ設定
```

**★ 印の2ファイルがこのサイトの動的化を担っています。**

---

## 2. 動的変化の仕組み（全体フロー）

ユーザーがアクセスしてからページが完成するまでの流れです。

```
【1】ブラウザが tokyo.minpaku-resort.com にアクセス
         ↓
【2】index.html が読み込まれる（この時点では沖縄のデフォルト内容）
         ↓
【3】index.html の末尾で js/regional.js が実行される
         ↓
【4】regional.js がホスト名を解析
     → "tokyo.minpaku-resort.com" から "tokyo" を取り出す
         ↓
【5】regional.js が /data/prefectures.json を fetch（非同期で取得）
         ↓
【6】JSON から "tokyo" のデータを取り出す
         ↓
【7】DOM に注入（タイトル・画像・テキスト・リストを一括で書き換え）
         ↓
【完成】東京専用のLPとして表示される
```

### サブドメインの判定ロジック

`regional.js` の `getSubdomain()` 関数が以下の順で判定します：

| 条件 | 結果 |
|------|------|
| URLに `?pref=tokyo` がある | `tokyo`（デバッグ用） |
| `tokyo.minpaku-resort.com` | `tokyo` |
| `www.minpaku-resort.com` | `okinawa`（デフォルト） |
| `localhost` や直接ファイルを開いた場合 | `okinawa`（デフォルト） |

---

## 3. どこで何が変わるか（セクション別対応表）

`index.html` の各セクションと、それを書き換えている `regional.js` の関数の対応表です。

| セクション | HTML の ID | regional.js の関数 | 変わる内容 |
|-----------|-----------|-------------------|-----------|
| `<title>` タグ / meta description | — | `applyMeta()` | ページタイトル・検索説明文（SEO） |
| H1（非表示） | `#seo-h1` | `applyHero()` | 都道府県名入りのSEO用H1 |
| **ヒーロー背景画像** | `#hero-section` | `applyHero()` | 都道府県の風景写真 |
| ヒーロー キャッチ上部 | `#hero-tagline` | `applyHero()` | 例：「東京都内の民泊運営・清掃を…」 |
| **ヒーロー メインコピー** | `#hero-copy` | `applyHero()` | 例：「東京の民泊に、地場ならではの安心と高品質を。」 |
| ヒーロー サブコピー | `#hero-subcopy` | `applyHero()` | 都道府県固有の説明文 |
| お悩みセクション 締め文 | `#problems-conclusion` | `applyProblems()` | 例：「東京エリアの地域特性を熟知した…」 |
| **地域特有ルール（4枚カード）** | `#local-rules-grid` | `applyLocalRules()` | 宿泊税・ゴミ出し・地域固有の注意点 |
| 地域ルール セクション見出し | `#local-rules-title` | `applyLocalRules()` | 例：「東京だからこそ、気をつけたいこと」 |
| 清掃フォーカス 地域特性テキスト | `#regional-cleaning-title` | `applyCleaningFocus()` | 例：「都市型マンション特有の清掃対応」 |
| 清掃フォーカス 地域特性本文 | `#regional-cleaning-body` | `applyCleaningFocus()` | 地域の清掃特性の説明文 |
| **スタッフ紹介（4名グリッド）** | `#staff-grid` | `applyStaff()` | 固定2名 ＋ 地域スタッフ2名 |
| スタッフ セクション見出し | `#staff-title` | `applyStaff()` | 「現場を支えるチーム」（固定） |
| **対応市区町村リスト** | `#municipalities-list` | `applyAreas()` | その都道府県内の市区町村名一覧 |
| エリア セクション見出し | `#areas-title` | `applyAreas()` | 例：「東京都 対応可能エリア」 |
| エリア 説明文 | `#areas-description` | `applyAreas()` | 都道府県名入りの説明文 |
| Googleマップ | `#area-map` | `applyAreas()` | その都道府県を中心としたマップ |
| **シミュレーター 間取り選択肢** | `#sim-room` | `initSimulator()` | 都道府県ごとの清掃単価 |
| シミュレーター 結果＋LINE誘導 | `#sim-result` | `initSimulator()` | シミュレーションID発行・LINEリンク生成 |
| フッター タグライン | `#footer-tagline` | `applyFooter()` | 例：「東京の民泊を、リゾート・クオリティへ。」 |

> **変えていない部分（全都道府県共通）：** ナビゲーション、数字実績バナー、3つの強み、サービス内容8項目、料金プラン、FAQ、お問い合わせフォーム、フッターリンク

---

## 4. データファイルの構造（prefectures.json）

`data/prefectures.json` は **都道府県キー → コンテンツオブジェクト** の形式です。

```json
{
  "tokyo": { ... },
  "osaka": { ... },
  "okinawa": { ... },
  ...全47都道府県
}
```

### 1都道府県あたりのデータ項目

```json
{
  "prefKey": "tokyo",
  "prefName": "東京都",
  "prefShort": "東京",

  "heroImage": "https://...",          // ヒーロー背景画像URL
  "heroTagline": "東京都内の民泊...",   // ヒーロー上部テキスト
  "heroCopy": "東京の民泊に...",        // メインキャッチコピー
  "heroSubcopy": "収益最大化を...",     // サブコピー

  "localRules": [                      // 地域ルールカード（4つ）
    {
      "icon": "fas fa-yen-sign",        // FontAwesome アイコン名
      "title": "東京都 宿泊税",
      "body": "説明文...",
      "highlight": "税務対応必須"        // カード左上のラベル
    }
    // ...4項目
  ],

  "municipalities": [                  // 対応市区町村リスト
    "千代田区", "中央区", "港区"
    // ...
  ],

  "staff": [                           // 地域スタッフ（2〜4名）
    {
      "name": "田中",
      "role": "清掃チームリーダー",
      "message": "一言メッセージ",
      "avatar": "images/staff_1.png"   // 画像パス（なければ自動でイニシャルアイコン）
    }
  ],

  "cleaningPrices": {                  // 間取り別清掃単価（シミュレーターに使用）
    "1R・1K": 5500,
    "1LDK": 7000,
    "2LDK": 10000,
    "3LDK": 14000,
    "4LDK以上": 18000
  },

  "cleaningFeature": {                 // 清掃セクション・地域特性テキスト
    "title": "都市型マンション特有の清掃対応",
    "body": "説明文..."
  },

  "mapEmbedUrl": "https://google.com/maps/embed?...",  // Google Maps 埋め込みURL
  "lineAccountUrl": "https://line.me/R/ti/p/@xxxx",    // LINE公式アカウントURL

  "seoTitle": "東京都の民泊 運営代行・清掃代行 | Minpaku Resort",
  "seoDescription": "メタディスクリプション..."
}
```

---

## 5. ロジックファイルの構造（regional.js）

`js/regional.js` は即時実行関数（IIFE）で構成されています。

```
regional.js
├── getSubdomain()           サブドメイン / ?pref= パラメータを検出
├── generateSimId()          シミュレーションID生成（例: SIM1A2B3C）
├── buildLineUrl()           LINE自動入力URLを生成
│
├── applyMeta(d)             <title> / meta description を書き換え
├── applyHero(d)             ヒーロー背景・テキストを書き換え
├── applyProblems(d)         お悩みセクション締め文を書き換え
├── applyLocalRules(d)       地域ルールカード4枚を生成・挿入
├── applyStaff(d)            スタッフ紹介グリッドを生成・挿入
├── applyAreas(d)            市区町村リスト・地図を書き換え
├── applyCleaningFocus(d)    清掃セクションの地域特性テキストを書き換え
├── initSimulator(d)         シミュレーターの選択肢生成・計算・LINE誘導
├── renderNoteFeed()         note記事フィード（現在は静的プレースホルダー）
├── applyFooter(d)           フッタータグラインを書き換え
│
└── applyData(d)             ↑ 上記すべてを順番に呼び出す親関数
    └─ fetch('data/prefectures.json') → 該当データを取得 → applyData()
```

---

## 6. 都道府県データの追加・編集方法

### 料金・スタッフ・テキストを変更したい場合

`data/prefectures.json` を開き、該当する都道府県キーを探して編集します。  
**JavaScript は一切触る必要はありません。**

```json
// 例：東京の1LDK清掃単価を変更
"tokyo": {
  "cleaningPrices": {
    "1LDK": 7500,   ← ここを変更するだけ
    ...
  }
}
```

### 新しい都道府県を追加したい場合

既存の都道府県データ（例：`osaka`）をコピーして、新しいキーで追加します。

```json
{
  "osaka": { ... },   // 既存

  "nara": {           // 新規追加
    "prefKey": "nara",
    "prefName": "奈良県",
    "prefShort": "奈良",
    "heroImage": "https://...",
    // ... 残りの項目を埋める
  }
}
```

追加後、`nara.minpaku-resort.com` にアクセスすると自動で反映されます。

---

## 7. ローカルでの動作確認

`index.html` をブラウザで直接開くと `fetch()` がエラーになります（ブラウザのセキュリティ制限）。  
必ずローカルサーバーを経由して開いてください。

### 方法A：Node.js を使う（推奨）

```bash
# プロジェクトフォルダに移動
cd /Users/kobuketomohiro/Documents/Minpaku-Resort

# ローカルサーバー起動
npx serve .

# ブラウザで開く
open http://localhost:3000
```

### 方法B：Python を使う

```bash
python3 -m http.server 8080
# → http://localhost:8080 で開く
```

### 都道府県を切り替えてテストする

URLに `?pref=キー名` を追加すると、サブドメインなしで任意の都道府県を確認できます。

```
http://localhost:3000/?pref=tokyo     → 東京版
http://localhost:3000/?pref=hokkaido  → 北海道版
http://localhost:3000/?pref=osaka     → 大阪版
http://localhost:3000/                → 沖縄（デフォルト）
```

---

## 8. Netlify へのデプロイ

### 通常デプロイ（単一ドメイン）

Netlify にリポジトリを接続するだけで自動デプロイされます。  
`netlify.toml` がルーティング設定を担っています。

### サブドメイン展開（47都道府県対応）

```
【手順1】DNS プロバイダで設定
  *.minpaku-resort.com  →  CNAME  →  your-site.netlify.app

【手順2】Netlify サイト設定
  Domain management → Add domain alias で下記を追加
  *.minpaku-resort.com

【手順3】Netlify が自動でワイルドカードHTTPS証明書を発行
  → すべてのサブドメインがHTTPSで有効になる
```

この設定が完了すると、  
`tokyo.minpaku-resort.com` にアクセスしたとき `regional.js` が "tokyo" を検出し、  
`data/prefectures.json` の東京データで自動的にページが構成されます。

---

## 9. 今後の対応予定

| 項目 | 概要 | 優先度 |
|------|------|--------|
| **LINE URL 本番化** | `lineAccountUrl` を実際の公式アカウントIDに差し替え | 高 |
| **スタッフ画像の用意** | `images/staff_1.png` 〜 `staff_4.png` を実写に差し替え（なければ自動でイニシャルアイコンが表示） | 中 |
| **note 記事フィードの本番化** | Netlify Functions 経由で note.com の RSS を取得し、静的プレースホルダーを実データに差し替え | 中 |
| **ビフォーアフタースライダー画像** | 各都道府県の実際の清掃事例写真を `beforeAfter` キーに追加 | 中 |
| **OGP 設定** | `<meta property="og:image">` を各都道府県のヒーロー画像に動的設定 | 低 |
| **Google Analytics / Tag Manager** | サブドメイン別のアクセス解析を設定 | 低 |
