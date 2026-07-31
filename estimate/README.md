# Estimate Classification

Googleフォーム回答から、概算見積書を作成できる行と保留すべき行を判定するためのローカルスクリプトです。

## Run Tests

```bash
node --test estimate/*.test.js
```

## File Layout

- `estimate-logic.js`: フォーム回答1行の自動見積可否と料金判定
- `classify-csv.js`: CSVの読み取り、行ごとの判定、件数サマリー
- `pdf-model.js`: 判定結果をPDF用の文章・明細モデルに変換
- `email-draft.js`: 人間確認用のメール下書き本文を生成
- `spreadsheet-rows.js`: `見積処理管理` / `保留一覧` に書き込む行データを生成
- `export-spreadsheet-rows.js`: CSVからシート書き込み用JSONを出力
- `render-pdf.py`: PDFの実レンダリング
- `generate-pdf-from-csv.js`: CSVからPDF生成までをつなぐCLI
- `utils.js`: 文字列処理、BOM除去、ファイル名/日付整形
- `apps-script/Code.gs`: Googleスプレッドシート内で管理タブ/保留一覧更新とPDF生成を行うApps Script

## Classify A CSV Export

```bash
node estimate/classify-csv.js "/path/to/form-responses.csv" > estimate-results.json
```

The output contains:

- `summary`: 件数サマリー
- `results`: 行ごとの判定結果

## Generate A Sample Estimate PDF

The generator selects the first `estimate_ready` row in the CSV and writes both the intermediate JSON model and the PDF.

```bash
node estimate/generate-pdf-from-csv.js "/path/to/form-responses.csv" output/pdf
```

Specific form row number:

```bash
node estimate/generate-pdf-from-csv.js "/path/to/form-responses.csv" output/pdf 39
```

The PDF renderer uses ReportLab:

```bash
python3 -m pip install --user reportlab pypdf
```

## Export Rows For Spreadsheet Writeback

```bash
node estimate/export-spreadsheet-rows.js "/path/to/form-responses.csv" > sheet-rows.json
```

The output contains:

- `managementRows`: `見積処理管理` に入れる行
- `holdRows`: `保留一覧` に入れる行

## Google Sheets Apps Script

`estimate/apps-script/Code.gs` を対象スプレッドシートのApps Scriptに貼り付けると、スプレッドシート内に `見積自動化` メニューが追加されます。

1. Googleスプレッドシートで `拡張機能` → `Apps Script` を開く。
2. `Code.gs` の内容を `estimate/apps-script/Code.gs` に差し替える。
3. **Drive API（高度なサービス）を有効化する**（下記「Drive API の有効化」参照）。見積書のGoogleドキュメント変換に必須。
4. 保存してスプレッドシートを再読み込みする。
5. `見積自動化` → `見積処理管理を更新` を実行する。
6. `見積処理管理` タブで見積書を作りたい行を選択する。
7. `見積自動化` → `選択行の見積書(Doc)を生成` を実行する。

このApps Scriptは、CSVをダウンロードせずに `フォームの回答 1` を直接読み取り、`見積処理管理` と `保留一覧` を更新します。見積書生成時は、同じDriveフォルダ内に `Minpaku Resort 見積書Doc` フォルダを作成し、**編集可能なGoogleドキュメント**を作成して、ファイル名とURLを `見積処理管理` に書き戻します。PDFが必要な場合は、Docを開いて内容を確認・調整したうえで `ファイル → ダウンロード → PDF` から手動で書き出します。

見積書を生成できるのは、`処理ステータス` が `作成済み・要確認` の行のみです。`保留` 行は見積書を作らず、`保留一覧` の理由を確認します。

### Drive API の有効化

HTMLからGoogleドキュメントへの変換に、Drive の高度なサービスを使います。

1. Apps Scriptエディタ左の `サービス`（＋）をクリック。
2. 一覧から `Drive API` を選び、識別子を `Drive`（既定）のまま `追加`。
3. 保存。初回の見積書生成時に、Drive への保存権限などの承認画面が出たら許可する。

## Current Hold Rules

不足項目（面積・人数・住所など）は**保留にせず、デフォルト値で見積書を作成**します（`仮設定項目` として記録）。保留になるのは以下のサービス内容の判定のみです。

- `cleaning_only`: 「清掃サービス」のみ。見積書は作成せず保留。
- `unsupported_service`: 施設管理運営代行が選択されていない。
- `multiple_properties`: 複数棟または複数物件の可能性あり。

## Missing-field Defaults

フォーム未記入時に代入する仮の値（`見積処理管理` の `仮設定項目` 列とDoc冒頭に明記）。

- 物件平米数: `100㎡`
- 希望最大収容人数: `8名`
- 間取り: `3LDK`
- 施設グレード: `標準`
- 住所: `未確認`（表記のみ。交通費は暫定 `2,000円`）

## Current Pricing Rules

料金は**スプレッドシートの `料金ルール` タブのE列（値）を1:1で採用**します（`キー` 列でコードと対応）。E列を書き換えて `見積処理管理を更新` すると計算に反映されます。`料金ルール` タブが読めない場合のみ、`Code.gs` の `DEFAULT_RULES`（下記）にフォールバックします。

- 清掃費はサイトのシミュレーター値を採用（面積バンド `area_*`）。
- 高級は清掃費 `grade_luxury` 倍（現行 `1.25`）、スタンダード/割安は `1.0` 倍。
- 初期設定費は、3LDK以上 `100,000円`、VILLAまたは200㎡以上 `150,000円`、それ以外 `75,000円`。
- 許可取得サポートは、民泊 `150,000円`、旅館業/簡易宿所 `200,000円`。
- ゴミ回収は必要そうなら `清掃回数 x 1,000円`。
- BBQのみ `清掃回数 x 1,500円` で自動計上。
- ペット受け入れ可能なら `清掃回数 x 2,000円`。
- **交通費はサイトのシミュレーターと同一ロジックで自動概算**（住所をGSIジオコーディング→最寄り拠点までの距離ティア。算出不可時は暫定 `2,000円`）。
- リネンサプライは注記のみ。

## Notes On The Mirror Scripts

`estimate/*.js`（`estimate-logic.js` ほか）は分類・料金判定のローカル検証用ミラーです。**交通費の自動計算とGoogleドキュメント生成は Apps Script (`apps-script/Code.gs`) 側のみ**に実装されています（GSI/Drive など外部サービスを使うため）。ミラーの `render-pdf.py` 系はレガシーなローカルPDF出力で、本番のDoc生成とは別系統です。
