import json
import os
import re

def build_static_pages():
    base_dir = '/Users/kobuketomohiro/Documents/Minpaku-Resort'
    index_path = os.path.join(base_dir, 'city-template.html')
    data_path = os.path.join(base_dir, 'data', 'cities.json')

    # index.html (テンプレート) を読み込む
    with open(index_path, 'r', encoding='utf-8') as f:
        base_html = f.read()

    # cities.json を読み込む
    with open(data_path, 'r', encoding='utf-8') as f:
        cities = json.load(f)

    # japan はルートの index.html なのでスキップ（今回は各都市の静的ページを生成する）
    for slug, city_data in cities.items():
        if slug == 'japan':
            continue

        seo_title = city_data.get('seoTitle', '')
        seo_description = city_data.get('seoDescription', '')
        canonical_url = f'https://www.minpaku-resort.com/{slug}/'

        # メタタグの置換
        html = base_html
        
        # <title>
        html = re.sub(
            r'<title>.*?</title>',
            f'<title>{seo_title}</title>',
            html
        )
        
        # <meta name="description">
        html = re.sub(
            r'<meta name="description" content=".*?">',
            f'<meta name="description" content="{seo_description}">',
            html
        )
        
        # <link rel="canonical">
        html = re.sub(
            r'<link rel="canonical" href=".*?">',
            f'<link rel="canonical" href="{canonical_url}">',
            html
        )
        
        # og:title
        html = re.sub(
            r'<meta property="og:title" content=".*?">',
            f'<meta property="og:title" content="{seo_title}">',
            html
        )
        
        # og:description
        html = re.sub(
            r'<meta property="og:description" content=".*?">',
            f'<meta property="og:description" content="{seo_description}">',
            html
        )

        # 生成したHTMLを保存
        output_dir = os.path.join(base_dir, slug)
        os.makedirs(output_dir, exist_ok=True)
        
        output_path = os.path.join(output_dir, 'index.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"Generated: {output_path}")

if __name__ == '__main__':
    build_static_pages()
