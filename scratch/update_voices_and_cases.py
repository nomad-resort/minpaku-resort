import json
import os

def update_prefectures():
    filepath = '/Users/kobuketomohiro/Documents/Minpaku-Resort/data/prefectures.json'
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for pref_key, pref_data in data.items():
        pref_name = pref_data.get('prefName', '')
        pref_short = pref_data.get('prefShort', '')

        # Adjust pref_desc for Voice 1 title
        # If Okinawa, let's keep "沖縄県北部" to honor original detail if desired, 
        # but "沖縄県内" is safer for general use. 
        # The user seems to want it to be dynamic, so f"{pref_name}内" is good.
        voice1_title = f"{pref_name}内 1LDK所有"
        if pref_key == "okinawa":
            voice1_title = "沖縄県北部 1LDK所有"

        # Add voices
        pref_data['voices'] = [
            {
                "name": "A様",
                "title": voice1_title,
                "quote": "「他社からの乗り換えで、清掃クレームがゼロに。」",
                "body": f"以前依頼していた代行業者では、個人の清掃スタッフということもあり品質にムラがありました。Minpaku Resortさんに変更してからは、水回りや見えないところまで徹底して清掃されており、ゲストからのクレームがピタリと止まりました。レビューの星も上がり、収益も大きく改善しています。",
                "image": "images/owner_woman.png"
            },
            {
                "name": "K様",
                "title": "高級ヴィラ所有",
                "quote": "「完全にお任せできるので、遠方でも安心です。」",
                "body": f"私は都内在住のため、{pref_name}の物件で何かトラブルがあった時に対応できるか不安でした。しかし、予約対応から清掃、設備の不具合時の業者の手配までワンストップで対応してもらえるので安心です。特に価格調整の精度が高く、想定以上の利回りを実現できています。",
                "image": "images/owner_man.png"
            }
        ]

        # Add case studies (Social Proof)
        pref_data['caseStudies'] = [
            {
                "name": "BIZ-HANARE",
                "location": f"{pref_name}の高級貸別荘" if pref_key != "okinawa" else "沖縄県北部の高級貸別荘",
                "type": "プレミアムヴィラ",
                "stats": [
                    {"label": "年間平均稼働率", "value": "85", "unit": "%達成"},
                    {"label": "ゲスト評価 (OTA総合)", "value": "4.9", "unit": " / 5.0"}
                ],
                "image": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                "review": "「清掃が隅々まで行き届いており、最高の滞在になりました」という声が多数。卓越した清掃品質が直接高稼働に繋がっています。"
            },
            {
                "name": "某リゾートマンション",
                "location": f"{pref_name}の人気物件",
                "type": "リゾートコンドミニアム",
                "stats": [
                    {"label": "収益改善率 (前社比)", "value": "140", "unit": "%UP"},
                    {"label": "清掃クレーム発生率", "value": "0", "unit": "件"}
                ],
                "image": "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                "review": f"競合と差別化するダイナミックプライシングと、プロフェッショナルな清掃・管理体制により、{pref_short}エリア屈指の売上を達成。"
            }
        ]

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Successfully updated prefectures.json with voices and case studies (enhanced).")

if __name__ == "__main__":
    update_prefectures()
