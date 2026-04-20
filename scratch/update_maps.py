
import json
import os

# Coordinates (lat, lon) and names of prefectural capitals
capitals = [
    ("hokkaido", "43.06417", "141.34694", "札幌市"),
    ("aomori", "40.82444", "140.74", "青森市"),
    ("iwate", "39.70361", "141.1525", "盛岡市"),
    ("miyagi", "38.26889", "140.87194", "仙台市"),
    ("akita", "39.71861", "140.1025", "秋田市"),
    ("yamagata", "38.25556", "140.33972", "山形市"),
    ("fukushima", "37.75", "140.46778", "福島市"),
    ("ibaraki", "36.36583", "140.47111", "水戸市"),
    ("tochigi", "36.56583", "139.88361", "宇都宮市"),
    ("gunma", "36.39111", "139.06083", "前橋市"),
    ("saitama", "35.85694", "139.64889", "さいたま市"),
    ("chiba", "35.60472", "140.12333", "千葉市"),
    ("tokyo", "35.68944", "139.69167", "東京都"), # Shinjuku
    ("kanagawa", "35.44778", "139.6425", "横浜市"),
    ("niigata", "37.90222", "139.02361", "新潟市"),
    ("toyama", "36.69528", "137.21139", "富山市"),
    ("ishikawa", "36.59444", "136.62556", "金沢市"),
    ("fukui", "36.06528", "136.22194", "福井市"),
    ("yamanashi", "35.66389", "138.56833", "甲府市"),
    ("nagano", "36.65139", "138.18111", "長野市"),
    ("gifu", "35.39111", "136.72222", "岐阜市"),
    ("shizuoka", "34.97694", "138.38306", "静岡市"),
    ("aichi", "35.18028", "136.90667", "名古屋市"),
    ("mie", "34.73028", "136.50861", "津市"),
    ("shiga", "35.00444", "135.86833", "大津市"),
    ("kyoto", "35.02139", "135.75556", "京都市"),
    ("osaka", "34.68639", "135.52", "大阪市"),
    ("hyogo", "34.69139", "135.18306", "神戸市"),
    ("nara", "34.68528", "135.83278", "奈良市"),
    ("wakayama", "34.22611", "135.1675", "和歌山市"),
    ("tottori", "35.50361", "134.23833", "鳥取市"),
    ("shimane", "35.47222", "133.05056", "松江市"),
    ("okayama", "34.66167", "133.935", "岡山市"),
    ("hiroshima", "34.39639", "132.45944", "広島市"),
    ("yamaguchi", "34.18583", "131.47139", "山口市"),
    ("tokushima", "34.06583", "134.55944", "徳島市"),
    ("kagawa", "34.34278", "134.04639", "高松市"),
    ("ehime", "33.84167", "132.76611", "松山市"),
    ("kochi", "33.55972", "133.53111", "高知市"),
    ("fukuoka", "33.60639", "130.41806", "福岡市"),
    ("saga", "33.26333", "130.30083", "佐賀市"),
    ("nagasaki", "32.74472", "129.87361", "長崎市"),
    ("kumamoto", "32.78972", "130.74167", "熊本市"),
    ("oita", "33.23806", "131.6125", "大分市"),
    ("miyazaki", "31.91111", "131.42389", "宮崎市"),
    ("kagoshima", "31.56028", "130.55806", "鹿児島市"),
    ("okinawa", "26.2125", "127.68111", "那覇市")
]

file_path = '/Users/kobuketomohiro/Documents/Minpaku-Resort/data/prefectures.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for key, lat, lon, city in capitals:
    if key in data:
        # Construct standard embed URL with 200,000 meters width (good for city view)
        url = f"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d200000!2d{lon}!3d{lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s{city}!5e0!3m2!1sja!2sjp!4v1713456000000!5m2!1sja!2sjp"
        data[key]['mapEmbedUrl'] = url

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated all prefectures with capital-centered maps.")
