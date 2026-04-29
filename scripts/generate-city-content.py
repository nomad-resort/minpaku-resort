#!/usr/bin/env python3
"""
generate-city-content.py
Claude API を使って cities.json の【AI_GENERATE】プレースホルダーを
都市固有コンテンツに置き換えるスクリプト。

必要なもの:
    pip install anthropic
    export ANTHROPIC_API_KEY="your-key"

実行オプション:
    # 全都市を処理
    python3 scripts/generate-city-content.py

    # 特定都市だけ処理（テスト用）
    python3 scripts/generate-city-content.py --only kamakura,naha,nikko

    # 既に生成済みの都市をスキップ（差分更新）
    python3 scripts/generate-city-content.py --skip-done
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic パッケージが必要です → pip install anthropic", file=sys.stderr)
    sys.exit(1)

ROOT         = Path(__file__).parent.parent
CITIES_PATH  = ROOT / "data" / "cities.json"
OUTPUT_PATH  = ROOT / "data" / "cities.json"   # 上書き保存
LOG_PATH     = ROOT / "data" / "cities-gen-log.jsonl"

# -------------------------------------------------------------------
# 都市特性データ（プロンプトの品質を上げる補足情報）
# -------------------------------------------------------------------
CITY_CONTEXT = {
    # 北海道
    "sapporo":     {"type": "政令市・都市型", "guests": "ビジネス・外国人観光客・雪まつり訪問者", "peak": "冬（雪まつり）・夏（涼しさ）", "notes": "積雪・凍結対策、外国人受入体制"},
    "hakodate":    {"type": "歴史港町・夜景観光", "guests": "国内カップル・外国人", "peak": "夏・秋", "notes": "函館山夜景・朝市・赤煉瓦倉庫街"},
    "otaru":       {"type": "運河・歴史観光", "guests": "国内カップル・外国人", "peak": "夏・冬（雪あかりの路）", "notes": "小樽運河周辺、築年数の古い物件多数"},
    "niseko":      {"type": "国際スキーリゾート", "guests": "外国人富裕層・スキーヤー", "peak": "冬（パウダースノー）・夏（アウトドア）", "notes": "外国語対応必須・高単価設定・スキー用具管理"},
    "kutchan":     {"type": "スキーリゾート", "guests": "外国人スキーヤー", "peak": "冬", "notes": "ニセコリゾートゾーン、高級コンドミニアム多数"},
    "furano":      {"type": "ラベンダー・農村観光", "guests": "国内外カップル・家族", "peak": "夏（ラベンダー）・冬（スキー）", "notes": "夏の短期集中需要、冬のスキー需要"},
    "biei":        {"type": "丘の風景・農村観光", "guests": "国内外の写真愛好家・カップル", "peak": "夏・秋", "notes": "広大な農地エリア、車移動前提"},
    "toya":        {"type": "湖畔・温泉リゾート", "guests": "国内カップル・家族", "peak": "春〜秋", "notes": "洞爺湖温泉、冬季の積雪・凍結対策"},
    "noboribetsu": {"type": "温泉地", "guests": "国内旅行者・外国人", "peak": "通年（温泉）", "notes": "地獄谷・クマ牧場、温泉設備の管理"},
    # 青森
    "aomori":      {"type": "観光地方都市", "guests": "ねぶた祭り目的・国内旅行者", "peak": "夏（ねぶた祭り）・冬（雪）", "notes": "短期集中型のねぶた需要、豪雪地帯"},
    "hirosaki":    {"type": "城下町・桜観光", "guests": "国内旅行者・外国人", "peak": "春（桜）・秋（りんご・紅葉）", "notes": "弘前城桜祭りの超集中需要"},
    "towada":      {"type": "湖畔・自然観光", "guests": "国内旅行者・アウトドア好き", "peak": "夏・秋（紅葉）", "notes": "十和田湖・奥入瀬渓流、秘境感ある立地"},
    # 岩手
    "morioka":     {"type": "地方中核都市", "guests": "国内ビジネス・観光客", "peak": "夏（さんさ踊り）・秋", "notes": "わんこそば・石割桜、じゃじゃ麺文化"},
    "hiraizumi":   {"type": "世界遺産観光地", "guests": "国内外の歴史・文化観光客", "peak": "春・秋", "notes": "中尊寺・毛越寺、世界遺産エリアの静粛性"},
    # 宮城
    "sendai":      {"type": "地方最大都市・政令市", "guests": "ビジネス・観光・学生", "peak": "夏（七夕）・秋（芋煮）", "notes": "仙台七夕祭り期間の超集中需要"},
    "matsushima":  {"type": "日本三景・海岸観光", "guests": "国内外の観光客・カップル", "peak": "春・秋・初夏", "notes": "松島湾の多島美、牡蠣の産地"},
    # 秋田
    "akita":       {"type": "地方都市・農業県庁所在地", "guests": "国内旅行者・竿燈目的", "peak": "夏（竿燈祭り）・冬（なまはげ）", "notes": "豪雪地帯、竿燈期間の需要集中"},
    "kakunodate":  {"type": "武家屋敷・歴史観光", "guests": "国内外の歴史観光客・カップル", "peak": "春（桜）・秋（紅葉）", "notes": "武家屋敷通り、古民家物件多数"},
    # 山形
    "yamagata":    {"type": "地方中核都市・農業", "guests": "国内旅行者・山形牛目的", "peak": "夏（花笠まつり）・秋（芋煮）", "notes": "蔵王温泉スキー、山形牛・さくらんぼ観光"},
    "ginzan":      {"type": "レトロ温泉街", "guests": "国内外のカップル・SNS目的", "peak": "冬（雪の灯篭）・夏", "notes": "銀山温泉の大正ロマン建築、超人気撮影スポット"},
    "yonezawa":    {"type": "城下町・牛肉観光", "guests": "国内旅行者・グルメ目的", "peak": "春・秋", "notes": "米沢牛・上杉神社、スキーリゾート"},
    # 福島
    "fukushima":   {"type": "地方中核都市", "guests": "国内旅行者・ビジネス", "peak": "春（花見山）・秋（フルーツ狩り）", "notes": "花見山公園、風評被害への対応実績"},
    "koriyama":    {"type": "地方商業都市", "guests": "ビジネス・国内旅行者", "peak": "春・秋", "notes": "東北第二の都市、ビジネス利用多い"},
    "aizu":        {"type": "歴史城下町・会津観光", "guests": "国内外の歴史観光客", "peak": "秋（紅葉・七日町通り）・冬（雪景色）", "notes": "鶴ヶ城・白虎隊、古民家物件多数"},
    # 茨城
    "mito":        {"type": "地方都市・梅観光", "guests": "国内旅行者・偕楽園目的", "peak": "春（梅）・秋（芸術）", "notes": "偕楽園の梅まつり期間の超集中需要"},
    "tsukuba":     {"type": "学術都市・ビジネス", "guests": "研究者・ビジネス客・学生", "peak": "春・秋（科学関連イベント）", "notes": "つくばエクスプレス沿線、ビジネス需要が安定"},
    "hitachinaka": {"type": "海岸・花観光", "guests": "国内旅行者・家族", "peak": "春（ネモフィラ）・秋（コキア）", "notes": "国営ひたち海浜公園のSNS映えスポット"},
    # 栃木
    "utsunomiya":  {"type": "地方中核都市・餃子", "guests": "ビジネス・グルメ目的", "peak": "通年（ビジネス）・春・秋", "notes": "餃子のまち・ジャズのまち、ビジネス需要安定"},
    "nikko":       {"type": "世界遺産・山岳観光", "guests": "国内外の歴史・自然観光客", "peak": "春・秋（紅葉）・夏（避暑）", "notes": "東照宮・修験道、外国人比率高い"},
    "nasu":        {"type": "高原リゾート", "guests": "家族・カップル・別荘族", "peak": "夏・秋（紅葉）", "notes": "那須高原の自然・温泉・アウトドア"},
    # 群馬
    "maebashi":    {"type": "地方県庁所在地", "guests": "ビジネス・国内旅行者", "peak": "春・秋", "notes": "赤城山・利根川、詩人萩原朔太郎ゆかりの街"},
    "takasaki":    {"type": "地方交通要所・だるま", "guests": "ビジネス・通過型観光", "peak": "春・秋", "notes": "上越・北陸新幹線分岐点、だるまの産地"},
    "kusatsu":     {"type": "日本屈指の温泉地", "guests": "国内外の温泉目的旅行者", "peak": "冬（スキー・温泉）・夏（避暑）", "notes": "草津温泉の強酸性湯・湯畑、外国人増加中"},
    "ikaho":       {"type": "温泉街・石段観光", "guests": "国内カップル・家族", "peak": "春・秋・冬", "notes": "石段街・黄金の湯・白銀の湯"},
    # 埼玉
    "saitama":     {"type": "政令市・首都圏近郊", "guests": "ビジネス・首都圏リーモートワーカー", "peak": "通年（ビジネス）", "notes": "大宮・浦和エリア、東京から近い安定需要"},
    "kawagoe":     {"type": "小江戸・歴史観光", "guests": "国内外の歴史・食べ歩き観光客", "peak": "春・秋・年間通じて週末", "notes": "蔵造りの町並み、さつまいも文化"},
    "chichibu":    {"type": "山岳・自然・芝桜", "guests": "国内旅行者・ハイカー", "peak": "春（芝桜）・秋（紅葉）・夏（花火）", "notes": "秩父夜祭・芝桜・SL"},
    # 千葉
    "chiba":       {"type": "政令市・首都圏近郊", "guests": "ビジネス・幕張イベント目的", "peak": "通年（ビジネス）・イベント期", "notes": "幕張メッセ周辺のイベント需要が大きい"},
    "urayasu":     {"type": "リゾート・テーマパーク近郊", "guests": "ファミリー・外国人・カップル", "peak": "通年（ディズニー目的）・春休み・夏休み", "notes": "ディズニーリゾート徒歩圏、外国人旅行者多数"},
    "narita":      {"type": "空港ゲートウェイ・成田山", "guests": "外国人旅行者・ビジネス", "peak": "通年（空港利用）・初詣", "notes": "成田空港直結の立地、外国人比率が最も高いエリアの一つ"},
    "kisarazu":    {"type": "アウトドア・三井アウトレット近郊", "guests": "家族・アウトドア好き", "peak": "春〜秋（アウトドア）・年間通じて（アウトレット）", "notes": "東京アクアライン利用、キャンプ・BBQ需要"},
    "katsuura":    {"type": "海・サーフィン・金目鯛", "guests": "サーファー・釣り人・家族", "peak": "夏（マリンスポーツ）", "notes": "外房の海、金目鯛・伊勢海老の水揚げ地"},
    # 東京
    "shinjuku":    {"type": "都市型・国際繁華街", "guests": "外国人・ビジネス・観光客", "peak": "通年", "notes": "新宿御苑・歌舞伎町、外国人旅行者多数、騒音規制"},
    "shibuya":     {"type": "都市型・若者文化", "guests": "外国人・若者・クリエイター", "peak": "通年・ハロウィン", "notes": "スクランブル交差点・渋谷スクランブルスクエア、観光密度が高い"},
    "minato":      {"type": "都市型・高級エリア", "guests": "外国人富裕層・ビジネス", "peak": "通年", "notes": "六本木・麻布・赤坂、高単価設定可能、外交官・ビジネス需要"},
    "taito":       {"type": "下町・浅草・上野", "guests": "国内外の観光客・外国人", "peak": "通年・三社祭り・花見", "notes": "浅草・上野・スカイツリー近郊、外国人旅行者多数"},
    "sumida":      {"type": "下町・スカイツリー近郊", "guests": "外国人・観光客", "peak": "通年・隅田川花火大会", "notes": "東京スカイツリー直下エリア"},
    "chuo":        {"type": "都市型・銀座・築地", "guests": "外国人・高所得ビジネス客", "peak": "通年", "notes": "銀座・築地・日本橋、高単価立地"},
    "toshima":     {"type": "都市型・池袋", "guests": "外国人・アニメ目的", "peak": "通年・アニメイベント期", "notes": "池袋・巣鴨、アニメ・漫画文化のインバウンド需要"},
    "chiyoda":     {"type": "都市型・皇居・秋葉原", "guests": "外国人・ビジネス", "peak": "通年", "notes": "秋葉原・皇居・神田、外国人アニメファン多数"},
    "koto":        {"type": "都市型・ウォーターフロント", "guests": "ビジネス・家族", "peak": "通年", "notes": "豊洲・お台場・東京ビッグサイト、展示会需要"},
    # 神奈川
    "yokohama":    {"type": "政令市・国際港都市", "guests": "外国人・ビジネス・観光客", "peak": "春・秋・通年", "notes": "中華街・みなとみらい・横浜スタジアム"},
    "kamakura":    {"type": "古都・世界遺産候補", "guests": "外国人・国内カップル・ファミリー", "peak": "春（桜・牡丹）・秋（紅葉）・夏（海）", "notes": "大仏・鶴岡八幡宮・路地の狭さ・観光渋滞"},
    "hakone":      {"type": "温泉・富士山展望リゾート", "guests": "外国人・国内カップル・家族", "peak": "春・秋・冬（雪景色）・通年（温泉）", "notes": "箱根美術館・ガラス工芸・温泉設備管理"},
    "enoshima":    {"type": "海岸・島・サーフィン", "guests": "サーファー・カップル・家族", "peak": "夏（海水浴）・春（春休み）", "notes": "江の島・片瀬海岸、サーフィン文化"},
    "kawasaki":    {"type": "工業都市・首都圏近郊", "guests": "ビジネス・川崎大師初詣", "peak": "通年（ビジネス）・年始（大師）", "notes": "川崎大師の初詣超集中、工場夜景ツアー"},
    # 新潟
    "niigata":     {"type": "地方中核都市・米どころ", "guests": "ビジネス・グルメ目的", "peak": "夏（祭り）・秋（新米）", "notes": "日本海の魚・コシヒカリ・新潟清酒"},
    "yuzawa":      {"type": "スキーリゾート", "guests": "スキーヤー・スノーボーダー", "peak": "冬（豪雪スキー）・夏（川遊び）", "notes": "苗場・GALA湯沢、首都圏からの日帰り・宿泊需要"},
    "myoko":       {"type": "高山スキーリゾート", "guests": "国内外スキーヤー", "peak": "冬・春スキー", "notes": "妙高山・赤倉温泉スキー場"},
    "nagaoka":     {"type": "地方中核都市・花火", "guests": "花火目的・ビジネス", "peak": "夏（長岡花火大会）", "notes": "長岡まつり花火大会・日本三大花火"},
    # 富山
    "toyama":      {"type": "地方中核都市・薬売り", "guests": "ビジネス・立山観光拠点", "peak": "春・秋（立山黒部）", "notes": "立山黒部アルペンルートの玄関口"},
    "takaoka":     {"type": "歴史・ものづくり", "guests": "国内旅行者・工芸好き", "peak": "春（桜）・秋", "notes": "高岡銅器・瑞龍寺・氷見うどん"},
    "tateyama":    {"type": "山岳・雪の壁観光", "guests": "国内外の登山・観光客", "peak": "春（雪の大谷）・夏（高山植物）", "notes": "雪の大谷・室堂・劔岳"},
    # 石川
    "kanazawa":    {"type": "城下町・伝統工芸・兼六園", "guests": "国内外の文化観光客", "peak": "春・秋・通年", "notes": "金沢21世紀美術館・ひがし茶屋街・加賀百万石"},
    "wakura":      {"type": "高級温泉リゾート", "guests": "国内富裕層カップル・家族", "peak": "通年（温泉）・能登の祭り", "notes": "能登半島・和倉温泉・能登の食材"},
    "kaga":        {"type": "温泉・九谷焼", "guests": "国内旅行者・工芸好き", "peak": "春・秋・冬（温泉）", "notes": "加賀温泉郷・山代温泉・山中温泉・九谷焼"},
    # 福井
    "fukui":       {"type": "地方中核都市・恐竜", "guests": "ファミリー・ビジネス", "peak": "春・夏（恐竜）", "notes": "福井県立恐竜博物館・東尋坊"},
    "tsuruga":     {"type": "海港・原発立地", "guests": "ビジネス・海水浴", "peak": "夏（日本海）", "notes": "敦賀半島・気比神宮・海水浴場"},
    "katsuyama":   {"type": "恐竜・スキー", "guests": "ファミリー・スキーヤー", "peak": "夏（恐竜博物館）・冬（スキー）", "notes": "恐竜渓谷ふくい勝山ジオパーク"},
    # 山梨
    "kofu":        {"type": "地方中核都市・ワイン", "guests": "ビジネス・ワイン目的", "peak": "秋（ぶどう・ワイン）・春（桃の花）", "notes": "甲州ワイン・武田信玄ゆかり"},
    "fujiyoshida": {"type": "富士山麓・吉田うどん", "guests": "富士山登山者・外国人", "peak": "夏（富士山登山シーズン）", "notes": "富士山五合目の玄関口・外国人登山者多数"},
    "kawaguchiko": {"type": "富士五湖・富士山撮影地", "guests": "外国人・カップル・ファミリー", "peak": "春（桜と富士）・秋（紅葉と富士）・冬（雪と富士）", "notes": "SNS映え世界的人気スポット・外国人比率非常に高い"},
    "yamanakako":  {"type": "富士五湖・アウトドア", "guests": "アウトドア好き・ファミリー", "peak": "夏・秋", "notes": "富士山眺望・キャンプ・サイクリング"},
    # 長野
    "nagano":      {"type": "地方中核都市・善光寺", "guests": "善光寺目的・スキー", "peak": "春（善光寺御開帳）・冬（スキー）", "notes": "善光寺・1998年長野五輪"},
    "matsumoto":   {"type": "城下町・アルプス・音楽", "guests": "国内外の観光客", "peak": "春・秋・夏（アルプス登山）", "notes": "松本城・上高地玄関口・セイジオザワ音楽祭"},
    "karuizawa":   {"type": "高原リゾート・富裕層別荘地", "guests": "富裕層・セレブ・ファミリー", "peak": "夏（避暑）・冬（スキー）・秋（紅葉）", "notes": "プリンスホテルリゾート・アウトレット・テニス文化"},
    "hakuba":      {"type": "国際スキーリゾート・アルプス", "guests": "外国人スキーヤー・登山者", "peak": "冬（スキー）・夏（山岳登山・ハイキング）", "notes": "外国人比率が国内最高クラス・1998年五輪会場"},
    "nozawa":      {"type": "温泉スキーリゾート", "guests": "国内外スキーヤー", "peak": "冬（スキー）・夏（温泉）", "notes": "野沢温泉スキー場・外湯巡り文化"},
    # 岐阜
    "gifu":        {"type": "地方中核都市・鵜飼", "guests": "ビジネス・鵜飼観覧目的", "peak": "夏（鵜飼）・春（桜）", "notes": "長良川鵜飼・岐阜城"},
    "takayama":    {"type": "山間古都・外国人人気観光地", "guests": "外国人・国内文化観光客", "peak": "春（桜・高山祭）・秋（紅葉・高山祭）", "notes": "飛騨の里・高山陣屋・外国人比率が地方最高クラス"},
    "shirakawa":   {"type": "世界遺産・合掌造り", "guests": "外国人・国内文化観光客", "peak": "冬（雪の合掌造り・ライトアップ）・秋・春", "notes": "白川郷合掌造り・世界遺産・超混雑対策"},
    "gero":        {"type": "温泉地・下呂温泉", "guests": "国内カップル・家族", "peak": "通年（温泉）・冬（雪景色）", "notes": "日本三名泉の一つ・飛騨川沿いの温泉街"},
    # 静岡
    "shizuoka":    {"type": "地方中核都市・お茶・富士山", "guests": "ビジネス・富士山観光拠点", "peak": "春・秋", "notes": "静岡茶・富士山登山玄関口・久能山東照宮"},
    "hamamatsu":   {"type": "地方工業都市・音楽・うなぎ", "guests": "ビジネス・グルメ", "peak": "通年（ビジネス）・秋（浜松まつり）", "notes": "浜名湖うなぎ・楽器の街・ホンダ・ヤマハ発祥地"},
    "atami":       {"type": "温泉リゾート・熱海", "guests": "国内カップル・家族・高齢者", "peak": "通年（温泉）・冬（花火）・春（桜）", "notes": "リゾート復活の街・熱海の逆転劇・SNS集客"},
    "ito":         {"type": "温泉・伊豆観光", "guests": "国内カップル・家族", "peak": "春・夏・秋", "notes": "伊豆半島の温泉・海鮮・城ヶ崎海岸"},
    "shimoda":     {"type": "開国の地・南伊豆リゾート", "guests": "カップル・サーファー・歴史好き", "peak": "夏（海水浴）・春（桜・黒船）", "notes": "黒船来航・ペリーロード・白砂の海岸"},
    "fujinomiya":  {"type": "富士山麓・焼きそば・富士宮", "guests": "富士山登山者・巡礼者", "peak": "夏（富士山登山）", "notes": "富士山世界遺産・富士宮浅間神社・富士宮やきそば"},
    # 愛知
    "nagoya":      {"type": "政令市・ものづくり都市", "guests": "ビジネス・外国人・名古屋飯目的", "peak": "通年（ビジネス）・春（桜）", "notes": "名古屋城・トヨタ・ひつまぶし・きしめん"},
    "toyota":      {"type": "自動車産業都市", "guests": "ビジネス・工場見学", "peak": "通年（ビジネス）", "notes": "トヨタ自動車本社・工場見学需要"},
    "tokoname":    {"type": "焼き物・中部空港近郊", "guests": "陶芸好き・中部空港利用者", "peak": "通年（焼き物）・桜", "notes": "常滑焼・セントレア（中部国際空港）近接"},
    # 三重
    "tsu":         {"type": "地方県庁所在地", "guests": "ビジネス・伊勢参拝拠点", "peak": "通年（ビジネス）・春（伊勢参拝）", "notes": "伊勢志摩の玄関都市"},
    "ise":         {"type": "神宮・精神文化観光", "guests": "国内外の参拝者・外国人", "peak": "春・秋・年始（初詣）・通年", "notes": "伊勢神宮・おかげ横丁・赤福、参拝需要で通年安定"},
    "toba":        {"type": "海岸・水族館・真珠", "guests": "ファミリー・カップル・外国人", "peak": "春・夏・秋", "notes": "鳥羽水族館・真珠島・海女文化"},
    "shima":       {"type": "リアス式海岸・G7開催地", "guests": "ファミリー・カップル・富裕層", "peak": "春・夏（海水浴）", "notes": "英虞湾・志摩スペイン村・G7伊勢志摩サミット開催地"},
    # 滋賀
    "otsu":        {"type": "琵琶湖・歴史都市", "guests": "ビジネス・比叡山参拝者", "peak": "春・秋", "notes": "琵琶湖・比叡山・石山寺・近江商人"},
    "hikone":      {"type": "国宝城・彦根城", "guests": "国内外の歴史観光客", "peak": "春（桜）・秋（紅葉）", "notes": "ひこにゃん・彦根城・玄宮園"},
    "takashima":   {"type": "湖岸・自然・メタセコイア並木", "guests": "カップル・ドライブ・SNS目的", "peak": "春（菜の花）・秋（紅葉）・冬（雪）", "notes": "メタセコイア並木・安曇川・マキノ高原"},
    # 京都
    "kyoto":       {"type": "日本最大級の観光都市・世界遺産", "guests": "外国人・国内外の文化観光客", "peak": "春（桜）・秋（紅葉）・通年", "notes": "宿泊規制・住民と観光客の共存・外国人比率高"},
    "uji":         {"type": "茶の産地・平等院・世界遺産", "guests": "外国人・抹茶スイーツ目的", "peak": "春・秋・通年（宇治抹茶）", "notes": "宇治茶・平等院・源氏物語"},
    "amanohashidate": {"type": "日本三景・宮津・天橋立", "guests": "国内外の観光客", "peak": "春・秋・夏", "notes": "天橋立股のぞき・宮津城跡・日本三景"},
    # 大阪
    "osaka":       {"type": "日本第二の都市・国際観光都市", "guests": "外国人・国内旅行者", "peak": "通年・春（桜）・秋（万博記念）", "notes": "道頓堀・通天閣・USJ、外国人比率非常に高い"},
    "sakai":       {"type": "歴史・工業都市・仁徳陵", "guests": "歴史観光客・ビジネス", "peak": "春・秋", "notes": "世界遺産仁徳天皇陵・堺の刃物・南蛮貿易"},
    "izumisano":   {"type": "関西国際空港近郊", "guests": "外国人・トランジット利用者", "peak": "通年（空港利用）", "notes": "関西空港直近・外国人旅行者のファーストステイ・ラストステイ"},
    "higashiosaka": {"type": "ものづくり・ラグビー", "guests": "ビジネス・スポーツファン", "peak": "通年（ビジネス）・ラグビーシーズン", "notes": "花園ラグビー場・中小製造業集積・大阪近郊"},
    # 兵庫
    "kobe":        {"type": "国際港湾都市・異人館", "guests": "外国人・国内外観光客", "peak": "春・秋・クリスマス", "notes": "異人館・北野・ルミナリエ・神戸牛・灘の酒"},
    "himeji":      {"type": "世界遺産・姫路城", "guests": "外国人・国内歴史観光客", "peak": "春（桜と城）・秋・通年", "notes": "姫路城・好古園・外国人観光客の定番コース"},
    "kinosaki":    {"type": "温泉街・出石そば・カニ", "guests": "国内カップル・家族・外国人", "peak": "冬（カニ）・夏・通年（温泉）", "notes": "外湯文化・浴衣散策・松葉ガニ解禁期の超混雑"},
    "awaji":       {"type": "淡路島・玉ねぎ・鳴門海峡", "guests": "ドライブ旅行者・家族・グルメ目的", "peak": "春・夏", "notes": "淡路島玉ねぎ・鳴門の渦潮・ニジゲンノモリ"},
    "nishinomiya": {"type": "阪神間・甲子園", "guests": "野球ファン・ビジネス", "peak": "夏・秋（阪神シーズン）・春（センバツ）", "notes": "甲子園球場・阪急沿線の高級住宅地"},
    # 奈良
    "nara":        {"type": "古都・世界遺産・奈良公園", "guests": "外国人・国内外の文化観光客", "peak": "春・秋・通年（外国人）", "notes": "奈良公園の鹿・東大寺・春日大社・外国人比率高い"},
    "kashihara":   {"type": "歴史・神武天皇・飛鳥", "guests": "国内歴史観光客", "peak": "春・秋", "notes": "橿原神宮・飛鳥・万葉文化"},
    "yoshino":     {"type": "桜・山岳・修験道", "guests": "桜目的・修験者・ハイカー", "peak": "春（吉野千本桜）", "notes": "日本屈指の桜名所・世界遺産・修験道"},
    # 和歌山
    "wakayama":    {"type": "地方中核都市・紀州みかん", "guests": "ビジネス・熊野詣拠点", "peak": "通年（ビジネス）・秋", "notes": "紀州みかん・根来寺・和歌山城"},
    "shirahama":   {"type": "南紀白浜・温泉・パンダ", "guests": "ファミリー・カップル", "peak": "夏（海水浴）・通年（温泉）", "notes": "白良浜・アドベンチャーワールド（パンダ）・白浜温泉"},
    "nachikatsuura": {"type": "熊野古道・滝・温泉", "guests": "国内外の熊野詣・ハイカー", "peak": "春・秋", "notes": "熊野那智大社・那智の滝・勝浦温泉・世界遺産"},
    # 鳥取
    "tottori":     {"type": "砂丘・観光地方都市", "guests": "国内旅行者・砂漠体験", "peak": "春・夏・秋", "notes": "鳥取砂丘・砂の美術館・松葉ガニ"},
    "yonago":      {"type": "地方中核都市・水木しげる", "guests": "アニメファン・山陰観光拠点", "peak": "春・秋", "notes": "境港の水木しげるロード玄関口・大山の玄関"},
    "sakaiminato": {"type": "水木しげる・カニの街", "guests": "アニメファン・グルメ目的", "peak": "春・秋・冬（カニ）", "notes": "水木しげるロード・ゲゲゲの鬼太郎・境港のカニ"},
    # 島根
    "matsue":      {"type": "水の都・城下町", "guests": "国内外の歴史・文化観光客", "peak": "春・秋", "notes": "松江城・堀川めぐり・宍道湖のシジミ・小泉八雲"},
    "izumo":       {"type": "縁結び・出雲大社", "guests": "縁結び目的・国内外参拝者", "peak": "春・秋・神在月（旧暦10月）", "notes": "出雲大社・縁結びパワースポット・全国から参拝者"},
    # 岡山
    "okayama":     {"type": "地方中核都市・晴れの国", "guests": "ビジネス・後楽園目的", "peak": "春・秋", "notes": "後楽園・岡山城・桃太郎・岡山の晴天日数"},
    "kurashiki":   {"type": "美観地区・倉敷帆布", "guests": "国内外のアート・文化観光客", "peak": "春・秋・通年", "notes": "倉敷美観地区・大原美術館・岡山デニム・倉敷帆布"},
    # 広島
    "hiroshima":   {"type": "平和都市・国際観光地", "guests": "外国人・国内外の平和学習", "peak": "春（桜）・8月（原爆の日）・通年", "notes": "原爆ドーム・平和記念公園・外国人比率高い"},
    "miyajima":    {"type": "世界遺産・厳島神社", "guests": "外国人・国内外の観光客", "peak": "春・秋・通年（外国人）", "notes": "海に浮かぶ鳥居・もみじ饅頭・牡蠣"},
    "onomichi":    {"type": "坂の街・映画・サイクリング", "guests": "サイクリスト・映画ファン・カップル", "peak": "春・秋", "notes": "しまなみ海道・猫の細道・林芙美子・空き家再生"},
    "fukuyama":    {"type": "バラの街・歴史城下町", "guests": "ビジネス・バラ目的・歴史観光", "peak": "春（ばら祭り）・秋", "notes": "福山城・鞆の浦（崖の上のポニョ）・ばら公園"},
    # 山口
    "yamaguchi":   {"type": "歴史県庁所在地・幕末", "guests": "歴史観光客・ビジネス", "peak": "春・秋", "notes": "サビエル記念聖堂・瑠璃光寺・幕末長州藩"},
    "shimonoseki": {"type": "ふく（ふぐ）の街・関門海峡", "guests": "グルメ目的・ビジネス・関門海峡観光", "peak": "秋〜春（ふく）・通年", "notes": "関門海峡・唐戸市場・ふく（ふぐ）料理"},
    "hagi":        {"type": "萩焼・幕末城下町", "guests": "歴史観光客・陶芸好き", "peak": "春・秋", "notes": "萩焼・松下村塾・吉田松陰・世界遺産明治産業革命"},
    # 徳島
    "tokushima":   {"type": "阿波おどり・渦潮の街", "guests": "阿波おどり目的・国内外観光客", "peak": "夏（阿波おどり）", "notes": "阿波おどり期間の超集中需要・鳴門海峡の渦潮"},
    "naruto":      {"type": "渦潮・ドイツ村", "guests": "国内外の観光客・家族", "peak": "春・秋（渦潮大潮）", "notes": "鳴門の渦潮・大塚国際美術館・ドイツ館"},
    "miyoshi":     {"type": "秘境・かずら橋・ラフティング", "guests": "アウトドア好き・秘境目的", "peak": "夏・秋", "notes": "祖谷のかずら橋・ラフティング・四国の秘境"},
    # 香川
    "takamatsu":   {"type": "地方中核都市・うどん県", "guests": "ビジネス・うどん巡り目的", "peak": "春（桜島・栗林公園）・秋・通年", "notes": "讃岐うどん・栗林公園・アート瀬戸内"},
    "shodoshima":  {"type": "瀬戸内島・オリーブ・アート", "guests": "カップル・アート好き・ドライブ旅行者", "peak": "春・秋（アート）・夏（海）", "notes": "オリーブ・二十四の瞳・瀬戸内国際芸術祭"},
    "marugame":    {"type": "骨付鳥・丸亀城・うちわ", "guests": "グルメ目的・ビジネス・歴史観光", "peak": "春・秋・通年（うちわ）", "notes": "丸亀うちわ・骨付鳥・丸亀城"},
    # 愛媛
    "matsuyama":   {"type": "道後温泉・坂の上の雲", "guests": "国内外の温泉目的・文学ファン", "peak": "通年（温泉）・春・秋", "notes": "道後温泉・松山城・夏目漱石・坂の上の雲"},
    "imabari":     {"type": "しまなみ海道・タオル・造船", "guests": "サイクリスト・ビジネス", "peak": "春・秋（サイクリング）", "notes": "しまなみ海道サイクリングロード起点・今治タオル"},
    # 高知
    "kochi":       {"type": "坂本龍馬・よさこい・カツオ", "guests": "歴史好き・よさこい目的", "peak": "夏（よさこい祭り）・春・秋", "notes": "坂本龍馬・よさこい祭り・かつおのたたき"},
    "shimanto":    {"type": "四万十川・清流・自然", "guests": "自然好き・釣り人・カヌー愛好家", "peak": "夏・秋", "notes": "日本最後の清流・四万十川・天然うなぎ・沈下橋"},
    # 福岡
    "fukuoka":     {"type": "九州最大都市・国際観光都市", "guests": "外国人・ビジネス・国内旅行者", "peak": "通年・夏（山笠）・秋", "notes": "博多祇園山笠・屋台文化・韓国・中国からのインバウンド最多"},
    "dazaifu":     {"type": "菅原道真・学問の神様", "guests": "受験生・外国人・参拝者", "peak": "年始（合格祈願）・春・秋", "notes": "太宰府天満宮・梅ヶ枝餅・世界遺産九州・山口近代化産業遺産"},
    "kitakyushu":  {"type": "工業都市・北九州", "guests": "ビジネス・漫画ミュージアム", "peak": "通年（ビジネス）・春・秋", "notes": "スペースワールド跡地・漫画ミュージアム・工場夜景"},
    "itoshima":    {"type": "海・農業・移住促進", "guests": "移住検討者・週末旅行者・サーファー", "peak": "春・夏（海）・秋", "notes": "糸島の海・二見ヶ浦・移住先として人気急上昇"},
    # 佐賀
    "saga":        {"type": "地方県庁所在地・焼き物", "guests": "有田・伊万里観光拠点・ビジネス", "peak": "春・秋（バルーン）", "notes": "佐賀インターナショナルバルーンフェスタ・伊万里焼・有田焼"},
    "karatsu":     {"type": "海・唐津焼・唐津くんち", "guests": "陶芸好き・祭り目的・海水浴", "peak": "秋（唐津くんち）・夏（海）", "notes": "唐津くんち・唐津焼・玄界灘の新鮮魚介"},
    "ureshino":    {"type": "温泉・温泉湯豆腐", "guests": "国内外の温泉目的旅行者", "peak": "通年（温泉）・秋", "notes": "嬉野温泉・温泉湯豆腐・日本三大美肌の湯"},
    # 長崎
    "nagasaki":    {"type": "国際平和都市・異国情緒", "guests": "外国人・平和学習・カップル", "peak": "春・秋・夏（ランタン）・冬（イルミ）", "notes": "出島・グラバー園・長崎ランタンフェスティバル・ハウステンボス近郊"},
    "sasebo":      {"type": "ハウステンボス・米軍基地", "guests": "ファミリー・カップル・米軍関係者", "peak": "春・秋・クリスマス（ハウステンボス）", "notes": "ハウステンボス・九十九島・佐世保バーガー"},
    "goto":        {"type": "離島・教会・ダイビング", "guests": "離島体験・ダイバー・カトリック巡礼者", "peak": "春・夏（マリン）・秋", "notes": "五島列島・潜伏キリシタン世界遺産・リゾート化進行中"},
    # 熊本
    "kumamoto":    {"type": "城下町・熊本地震復興", "guests": "ビジネス・城目的観光客", "peak": "春（桜）・秋・通年", "notes": "熊本城（復興中）・くまモン・阿蘇観光拠点"},
    "aso":         {"type": "世界最大級カルデラ・火山", "guests": "国内外のアウトドア・自然観光客", "peak": "春・秋（草原）・冬（雪景色）", "notes": "阿蘇山・草千里・大観峰・農村体験"},
    "kurokawa":    {"type": "秘境温泉・入湯手形", "guests": "国内外の温泉目的・カップル", "peak": "冬（雪見風呂）・春・秋", "notes": "黒川温泉・入湯手形・露天風呂文化・九州の奥座敷"},
    # 大分
    "oita":        {"type": "地方中核都市・温泉県", "guests": "ビジネス・温泉観光", "peak": "通年（温泉）・秋", "notes": "別府・湯布院の玄関・鶏天・とり天文化"},
    "beppu":       {"type": "世界有数の温泉地・地獄めぐり", "guests": "国内外の温泉目的・外国人", "peak": "通年（温泉）・春・秋", "notes": "8つの地獄めぐり・湯けむり景観・外国人増加中"},
    "yufuin":      {"type": "おしゃれ温泉リゾート・湯布院", "guests": "国内外のカップル・女性旅行者", "peak": "通年（温泉）・春・秋（紅葉）", "notes": "金鱗湖・湯の坪街道・アート・外国人旅行者多数"},
    # 宮崎
    "miyazaki":    {"type": "サーフィン・マンゴー・プロ野球キャンプ", "guests": "サーファー・スポーツファン・家族", "peak": "夏（サーフィン）・春（キャンプ）", "notes": "宮崎マンゴー・堀切峠・プロ野球春季キャンプ地"},
    "takachiho":   {"type": "神話・峡谷・夜神楽", "guests": "国内外のパワースポット目的・自然観光", "peak": "春・秋・冬（夜神楽）", "notes": "高千穂峡・天岩戸神社・神話の里・夜神楽"},
    # 鹿児島
    "kagoshima":   {"type": "地方中核都市・桜島", "guests": "ビジネス・桜島観光", "peak": "春・秋・通年（桜島）", "notes": "桜島・指宿・黒豚・薩摩切子・明治維新ゆかり"},
    "kirishima":   {"type": "霧島温泉・神話・新婚旅行", "guests": "カップル・温泉目的・ハイカー", "peak": "春（ミヤマキリシマ）・秋・冬（温泉）", "notes": "霧島神宮・温泉・坂本龍馬新婚旅行ゆかりの地"},
    "yakushima":   {"type": "世界遺産・屋久杉・縄文杉", "guests": "外国人・自然愛好家・トレッカー", "peak": "春・夏（シーズン）・秋", "notes": "縄文杉・世界遺産・もののけ姫の森・ウミガメ産卵地"},
    "ibusuki":     {"type": "砂むし温泉・薩摩半島", "guests": "国内外の温泉目的・カップル", "peak": "通年（砂むし）・春・秋", "notes": "砂むし温泉・池田湖（大うなぎ）・薩摩半島の最南端"},
    # 沖縄
    "naha":        {"type": "県都・国際通り・首里城", "guests": "外国人・国内旅行者", "peak": "夏・春（桜）・通年（温暖）", "notes": "首里城・国際通り・沖縄料理・外国人増加中"},
    "onna":        {"type": "リゾート・ダイビング・万座ビーチ", "guests": "外国人富裕層・カップル・ダイバー", "peak": "夏・春・秋（通年リゾート）", "notes": "万座ビーチ・大型リゾートホテル群・ダイビングスポット"},
    "nago":        {"type": "北部観光拠点・美ら海水族館", "guests": "ファミリー・外国人", "peak": "夏・春・通年", "notes": "美ら海水族館・古宇利島・沖縄北部エコツーリズム"},
    "motobu":      {"type": "美ら海水族館隣接・本部港", "guests": "ファミリー・外国人", "peak": "夏・春", "notes": "美ら海水族館の最近接エリア・本部港からの離島フェリー"},
    "nakijin":     {"type": "世界遺産・今帰仁城跡", "guests": "歴史観光客・外国人", "peak": "春（桜）・通年", "notes": "今帰仁城跡・世界遺産グスク・沖縄北部の秘境感"},
    "yomitan":     {"type": "陶芸・読谷・残波岬", "guests": "カップル・陶芸好き・家族", "peak": "夏・春・秋", "notes": "読谷やちむん（陶器）・残波岬・残波大獅子"},
    "chatan":      {"type": "アメリカ村・海・若者文化", "guests": "若者・外国人・サーファー", "peak": "夏・通年（アメリカ文化）", "notes": "北谷アメリカンビレッジ・砂辺ビーチ・ダイビング・オシャレ飲食店街"},
    "ishigaki":    {"type": "離島リゾート・川平湾", "guests": "外国人・ダイバー・カップル・富裕層", "peak": "夏・春（サンゴ）・通年", "notes": "川平湾・マンタポイント・石垣牛・パインアップル"},
    "miyakojima":  {"type": "透明度日本一・離島リゾート", "guests": "外国人・カップル・ダイバー・富裕層", "peak": "夏・春・秋（通年リゾート）", "notes": "前浜ビーチ・通り池・伊良部大橋・宮古ブルーの海"},
}

# -------------------------------------------------------------------
# プロンプト生成
# -------------------------------------------------------------------
SYSTEM_PROMPT = """あなたは民泊運営代行会社「Minpaku Resort（民泊リゾート）」のWebコンテンツ専門家です。
SEO最適化された、地域に根ざした高品質なコンテンツを生成してください。

【重要なルール】
- 各フィールドは必ず指定された文字数・形式を守ること
- 他の都市と被らない、その都市固有の情報を含めること
- 民泊オーナー（物件を持っているが運営を任せたい人）に向けた文章にすること
- 検索意図に合ったキーワードを自然に含めること（詰め込みNG）
- 語尾は体言止め・です・ます混在で自然な日本語にすること

【絶対禁止事項 — 違反するとコンテンツ全体が不合格になります】
1. localRulesの各bodyには必ず都市名または都市固有の固有名詞（地名・ランドマーク・祭り・特産品・地域制度）を1つ以上含めること
2. 「歴史的な物件の価値を維持しながら清潔さを高めます」「長期滞在ゲストが快適に過ごせる清潔環境を安定提供します」などの汎用フレーズは使用禁止
3. heroSubcopyに「〇〇増加中」「通年（温泉）」のような内部メモ的フレーズを使用禁止。読者に向けた自然な文章のみ
4. heroCopyは「古都XXの民泊に、品格ある運営を。」パターンを禁止。都市の最大の魅力を1語で表すこと
5. 3つのlocalRulesは「設備管理・ゲスト対応・季節需要」という固定テンプレートに当てはめず、その都市でしか起きない具体的な課題を選ぶこと
"""

def build_prompt(city_key: str, entry: dict, context: dict) -> str:
    short = entry["cityShort"]
    city_name = entry["cityName"]
    pref_name = entry["prefName"]
    ctx = context.get(city_key, {})
    city_type  = ctx.get("type", "観光・生活都市")
    guests     = ctx.get("guests", "国内外の旅行者")
    peak       = ctx.get("peak", "通年")
    notes      = ctx.get("notes", f"{short}の地域特性")

    # notesから固有名詞キーワードを抽出してプロンプトに組み込む
    # （固有名詞をそのまま文章に使わせることで汎用テンプレートを防ぐ）
    # トレンド説明・汎用語句を除外し、地名・ランドマーク・祭り・特産品のみを残す
    EXCLUDE_PATTERNS = [
        "増加中", "対応", "対策", "需要が", "需要は", "比率が", "比率は",
        "最高クラス", "クラス", "安定", "外国人", "ビジネス", "近郊", "玄関口",
        "利用", "多数", "多い", "場合", "観光客", "旅行者", "立地",
    ]
    raw_terms = [n.strip() for n in notes.replace('・', '、').split('、') if len(n.strip()) >= 2]
    proper_nouns = [
        n for n in raw_terms
        if not any(ex in n for ex in EXCLUDE_PATTERNS)
    ]
    proper_nouns_str = "、".join(proper_nouns[:4]) if proper_nouns else f"{short}の観光スポット"

    return f"""
以下の都市向けに民泊運営代行サービスのWebコンテンツを生成してください。

【都市情報】（参照情報 — 以下の情報は文章のインスピレーション源として使い、本文に箇条書きや列挙形式でそのまま貼り付けないこと）
- 都市名: {city_name}（{short}）
- 都道府県: {pref_name}
- 都市タイプ: {city_type}
- 主なゲスト層: {guests}
- 需要ピーク: {peak}
- 地域特記事項（参照のみ・直接引用禁止）: {notes}
- 文章に盛り込む代表的な固有名詞: {proper_nouns_str}

【heroSubcopyの作り方】
「Aが揃う〇〇は」「Bが息づく〇〇は」など、参照情報をそのまま文頭に列挙するパターンは厳禁。
{short}の魅力を語り手の言葉で描写し、民泊オーナーが抱える課題と当社の解決策を1〜2文で結ぶ自然な文章にすること。

【生成するフィールド】以下のJSON形式で返してください。JSON以外のテキストは一切含めないこと。

{{
  "heroTagline": "（{short}エリアの民泊・清掃代行の強みを1行で表現。必ず{short}固有の魅力ワード（地名・リゾート種別・特色）を入れること。「エリアに精通した」「地域密着」などの汎用表現は禁止。30字以内）",
  "heroCopy": "（{short}ならではの体験・情景・雰囲気を1つの短文で表すキャッチコピー。20字以内。「〜を。」形式。「品格ある運営」「最高の」などの汎用形容詞禁止）",
  "heroSubcopy": "（{short}の魅力・ゲスト層・季節需要と当社サービスの対応力を自然な日本語でつないだ説明文。必ず{proper_nouns_str}のうち1語以上を自然な形で含めること。ただし情報の箇条書きや「〜が揃う」「〜が息づく」形式の列挙は禁止。100〜150字）",
  "localRules": [
    {{
      "icon": "（Font Awesomeのfasアイコンクラス名・fa-で始まる）",
      "title": "（{short}で実際に起きる民泊特有の課題タイトル。20字以内）",
      "body": "（その課題の具体的な説明。必ず{short}または{proper_nouns_str}の固有名詞を自然な形で含めること。60〜80字）",
      "highlight": "（3〜6字のキーワードラベル）"
    }},
    {{
      "icon": "（Font Awesomeのfasアイコンクラス名）",
      "title": "（{short}のゲスト層「{guests}」に特有の受入れ課題タイトル。20字以内）",
      "body": "（そのゲスト層が{short}でどんな行動をとるか・何が問題になるかを具体的に。必ず{short}の地名か固有名詞を含む。60〜80字）",
      "highlight": "（3〜6字のキーワードラベル）"
    }},
    {{
      "icon": "（Font Awesomeのfasアイコンクラス名）",
      "title": "（{short}の需要ピーク「{peak}」に対応した繁閑管理タイトル。20字以内）",
      "body": "（{short}の繁忙期に具体的に何が起きて、どう対応するかを説明。「繁忙期に備えます」のみで終わる汎用文は禁止。60〜80字）",
      "highlight": "（3〜6字のキーワードラベル）"
    }}
  ],
  "cleaningFeature": {{
    "title": "（{short}の地理・気候・物件タイプに特化した清掃の強みタイトル。「{short}の」で始めること。25字以内）",
    "body": "（{short}特有の汚れ・素材・環境課題と具体的な解決策。必ず{short}の固有名詞を含む。80〜100字）"
  }},
  "seoTitle": "{short}の民泊 運営代行・清掃代行 | Minpaku Resort（この形式を維持）",
  "seoDescription": "（{short}（{pref_name}）の民泊オーナー向け。{proper_nouns_str}などの地域キーワードを自然に含む説明文。110〜130字）",
  "voices": [
    {{
      "name": "A様",
      "title": "（{short}内の物件タイプを反映した所有者属性。例: {short}市内 1LDK所有、{city_type}エリアの戸建て所有 など）",
      "quote": "（{short}・{city_type}の文脈に合った成果の一言。例: 清掃品質・稼働率・手間削減など。「」で囲む。30字以内）",
      "body": "（{short}で民泊運営に困っていたオーナーが当社に依頼して解決した具体的なエピソード。{proper_nouns_str}に関連する課題や成果を盛り込む。120〜180字）",
      "image": "images/owner_woman.png"
    }},
    {{
      "name": "K様",
      "title": "（A様とは異なる物件タイプ・属性。例: 高級ヴィラ、リゾートマンション、古民家 など {short}に多いタイプ）",
      "quote": "（A様とは異なる視点の成果一言。「」で囲む。30字以内）",
      "body": "（A様とは異なる課題・解決策のエピソード。{short}の地域性（観光・気候・ゲスト層）を反映した内容で。120〜180字）",
      "image": "images/owner_man.png"
    }}
  ]
}}
"""


def is_generated(entry: dict) -> bool:
    """AI_GENERATEプレースホルダーが残っていない = 生成済み"""
    return "【AI_GENERATE】" not in json.dumps(entry, ensure_ascii=False)


def merge_generated(entry: dict, generated: dict) -> dict:
    """生成されたフィールドをエントリにマージ"""
    for key in ["heroTagline", "heroCopy", "heroSubcopy",
                "localRules", "cleaningFeature", "seoTitle", "seoDescription",
                "voices"]:
        if key in generated:
            entry[key] = generated[key]
    return entry


# -------------------------------------------------------------------
# メイン処理
# -------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="カンマ区切りで特定の都市スラグのみ処理（例: kamakura,naha）")
    parser.add_argument("--skip-done", action="store_true", help="生成済み都市をスキップ")
    parser.add_argument("--dry-run", action="store_true", help="APIを呼ばずにプロンプトだけ表示")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: ANTHROPIC_API_KEY 環境変数が設定されていません", file=sys.stderr)
        sys.exit(1)

    with open(CITIES_PATH, encoding="utf-8") as f:
        cities = json.load(f)

    only_set = set(args.only.split(",")) if args.only else None

    targets = []
    for slug, entry in cities.items():
        if only_set and slug not in only_set:
            continue
        if args.skip_done and is_generated(entry):
            continue
        targets.append(slug)

    print(f"処理対象: {len(targets)} 都市")
    if args.dry_run:
        for slug in targets[:3]:
            print(f"\n{'='*60}")
            print(f"[{slug}] プロンプト:")
            print(build_prompt(slug, cities[slug], CITY_CONTEXT))
        return

    client = anthropic.Anthropic(api_key=api_key)
    log_file = open(LOG_PATH, "a", encoding="utf-8")

    success = 0
    failed = []

    for i, slug in enumerate(targets, 1):
        entry = cities[slug]
        print(f"[{i}/{len(targets)}] {slug} ({entry['cityName']}) 生成中...", end=" ", flush=True)

        prompt = build_prompt(slug, entry, CITY_CONTEXT)

        try:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = response.content[0].text.strip()

            # JSON部分を抽出（```json ... ``` などに対応）
            json_match = re.search(r'\{[\s\S]*\}', raw)
            if not json_match:
                raise ValueError("JSONが見つかりません")

            generated = json.loads(json_match.group())
            cities[slug] = merge_generated(entry, generated)

            log_file.write(json.dumps({"slug": slug, "status": "ok"}, ensure_ascii=False) + "\n")
            print("OK")
            success += 1

            # 中間保存（10都市ごと）
            if success % 10 == 0:
                with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                    json.dump(cities, f, ensure_ascii=False, indent=2)
                print(f"  [中間保存] {success} 都市完了")

            # レートリミット対策
            time.sleep(0.3)

        except Exception as e:
            print(f"ERROR: {e}")
            log_file.write(json.dumps({"slug": slug, "status": "error", "error": str(e)}, ensure_ascii=False) + "\n")
            failed.append(slug)

    # 最終保存
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cities, f, ensure_ascii=False, indent=2)

    log_file.close()

    print(f"\n完了: {success} 都市成功 / {len(failed)} 都市失敗")
    if failed:
        print(f"失敗リスト: {', '.join(failed)}")
        print("再実行: python3 scripts/generate-city-content.py --only " + ",".join(failed))


if __name__ == "__main__":
    main()
