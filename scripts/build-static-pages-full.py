import json
import os
from bs4 import BeautifulSoup

# 地方マップ (regional.js と同一)
REGION_MAP = {
    '北海道・東北': ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
    '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
    '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
    '近畿': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
    '中国・四国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'],
    '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
}

def get_region(pref_name):
    for region, prefs in REGION_MAP.items():
        if pref_name in prefs:
            return region
    return 'その他'

def build_full_static():
    base_dir = '/Users/kobuketomohiro/Documents/Minpaku-Resort'
    index_path = os.path.join(base_dir, 'index.html')
    data_path = os.path.join(base_dir, 'data', 'cities.json')

    with open(index_path, 'r', encoding='utf-8') as f:
        base_html = f.read()

    with open(data_path, 'r', encoding='utf-8') as f:
        cities = json.load(f)

    # テンプレートとなるsoup
    soup_base = BeautifulSoup(base_html, 'html.parser')

    for slug, d in cities.items():
        # soupのコピーを作成（各都市用）
        soup = BeautifulSoup(str(soup_base), 'html.parser')

        # bodyタグに data-ssg="true" を追加
        if soup.body:
            soup.body['data-ssg'] = 'true'

        # 1. メタデータ
        if soup.title:
            soup.title.string = d.get('seoTitle', '')
        
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            meta_desc['content'] = d.get('seoDescription', '')

        link_canon = soup.find('link', attrs={'rel': 'canonical'})
        if link_canon:
            if slug == 'japan':
                link_canon['href'] = "https://www.minpaku-resort.com/"
            else:
                link_canon['href'] = f"https://www.minpaku-resort.com/{slug}/"

        og_title = soup.find('meta', attrs={'property': 'og:title'})
        if og_title:
            og_title['content'] = d.get('seoTitle', '')
            
        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc:
            og_desc['content'] = d.get('seoDescription', '')

        og_url = soup.find('meta', attrs={'property': 'og:url'})
        if og_url:
            if slug == 'japan':
                og_url['content'] = "https://www.minpaku-resort.com/"
            else:
                og_url['content'] = f"https://www.minpaku-resort.com/{slug}/"

        # 2. テキスト置換要素
        # seo-h1
        seo_h1 = soup.find(id='seo-h1')
        if seo_h1:
            if slug == 'japan':
                seo_h1.string = "民泊 運営代行・清掃代行ならMinpaku Resort（民泊リゾート）"
            else:
                seo_h1.string = f"{d['cityShort']}の民泊 運営代行・清掃代行ならMinpaku Resort（民泊リゾート）"

        # hero-tagline, copy, subcopy
        for el_id, key in [('hero-tagline', 'heroTagline'), ('hero-copy', 'heroCopy'), ('hero-subcopy', 'heroSubcopy')]:
            el = soup.find(id=el_id)
            if el and key in d:
                el.string = d[key]

        # problems-conclusion
        prob_el = soup.find(id='problems-conclusion')
        if prob_el and slug != 'japan':
            prob_el.clear()
            prob_el.append("そのお悩み、")
            span = soup.new_tag("span", **{'class': "text-accent font-bold"})
            span.string = "Minpaku Resort"
            prob_el.append(span)
            prob_el.append("にお任せください。")
            prob_el.append(soup.new_tag("br"))
            prob_el.append(f"{d['cityShort']}エリアの地域特性を熟知した私たちが、すべて解決いたします。")
        elif prob_el and slug == 'japan':
            prob_el.clear()
            prob_el.append("そのお悩み、")
            span = soup.new_tag("span", **{'class': "text-accent font-bold"})
            span.string = "Minpaku Resort"
            prob_el.append(span)
            prob_el.append("にお任せください。")
            prob_el.append(soup.new_tag("br"))
            prob_el.append("全国の地域特性を熟知した私たちが、すべて解決いたします。")

        # local-rules-title
        lr_title = soup.find(id='local-rules-title')
        if lr_title and slug != 'japan':
            lr_title.string = f"{d['cityShort']}の注意ポイント"
        
        # japan の場合はローカルルールセクションを非表示にする
        lr_section = soup.find(id='local-rules')
        if lr_section and slug == 'japan':
            lr_section['style'] = 'display: none;'

        # local-rules-grid (HTML構造の構築)
        lr_grid = soup.find(id='local-rules-grid')
        if lr_grid and 'localRules' in d and slug != 'japan':
            lr_grid.clear()
            for r in d['localRules']:
                card = soup.new_tag('div', **{'class': 'bg-white rounded-sm shadow-sm border border-gray-100 p-3 sm:p-5 md:p-7 hover:shadow-md transition duration-300'})
                
                header = soup.new_tag('div', **{'class': 'flex items-start mb-2 sm:mb-4'})
                icon_wrapper = soup.new_tag('div', **{'class': 'w-8 h-8 sm:w-12 sm:h-12 bg-primary/5 border border-accent/30 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0'})
                icon = soup.new_tag('i', **{'class': f"{r['icon']} text-accent text-sm sm:text-lg"})
                icon_wrapper.append(icon)
                header.append(icon_wrapper)
                
                text_wrapper = soup.new_tag('div')
                highlight = soup.new_tag('span', **{'class': 'text-[8px] sm:text-[10px] font-bold text-accent tracking-widest uppercase'})
                highlight.string = r['highlight']
                title = soup.new_tag('h4', **{'class': 'text-xs sm:text-base font-bold text-primary leading-snug'})
                title.string = r['title']
                text_wrapper.append(highlight)
                text_wrapper.append(title)
                header.append(text_wrapper)
                
                body = soup.new_tag('p', **{'class': 'text-gray-600 text-[10px] sm:text-sm leading-relaxed'})
                body.string = r['body']
                
                card.append(header)
                card.append(body)
                lr_grid.append(card)

        # marketAnalysis (市場トレンド解説) の挿入
        # lr_section (id='local-rules') の直後に新しいセクションを追加する
        if lr_section and 'marketAnalysis' in d and slug != 'japan':
            ma = d['marketAnalysis']
            ma_section = soup.new_tag('section', **{'class': 'py-12 md:py-20 bg-gray-50 border-t border-gray-100', 'id': 'market-analysis'})
            
            ma_container = soup.new_tag('div', **{'class': 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'})
            ma_card = soup.new_tag('div', **{'class': 'bg-white p-6 sm:p-10 rounded-sm shadow-md border-l-4 border-accent'})
            
            ma_header_wrap = soup.new_tag('div', **{'class': 'mb-4 border-b border-gray-100 pb-4'})
            ma_label = soup.new_tag('span', **{'class': 'text-accent font-bold tracking-widest text-xs mb-1 block'})
            ma_label.string = "MARKET TREND"
            ma_title = soup.new_tag('h3', **{'class': 'text-lg sm:text-2xl font-serif font-bold text-primary'})
            ma_title.string = ma['title']
            
            ma_header_wrap.append(ma_label)
            ma_header_wrap.append(ma_title)
            
            ma_body = soup.new_tag('p', **{'class': 'text-gray-700 text-sm sm:text-base leading-relaxed'})
            ma_body.string = ma['body']
            
            ma_card.append(ma_header_wrap)
            ma_card.append(ma_body)
            ma_container.append(ma_card)
            ma_section.append(ma_container)
            
            lr_section.insert_after(ma_section)

        # regional-cleaning-title / body
        rc_title = soup.find(id='regional-cleaning-title')
        rc_body = soup.find(id='regional-cleaning-body')
        if slug == 'japan':
            if rc_title: rc_title.string = "全国の地域特性に合わせた最適清掃"
            if rc_body: rc_body.string = "全国各地の環境・気候・ゲスト層に合わせた清掃フローを構築。地域の清掃プロフェッショナルと連携し、高いクオリティを安定的に提供いたします。"
        elif d.get('cleaningFeature'):
            if rc_title: rc_title.string = d['cleaningFeature']['title']
            if rc_body: rc_body.string = d['cleaningFeature']['body']
        else:
            if rc_title: rc_title.string = f"{d['cityShort']}の地域特性に合わせた最適清掃"
            if rc_body: rc_body.string = f"{d['cityShort']}の環境・気候・ゲスト層に合わせた清掃フローを構築。地域の清掃プロフェッショナルと連携し、高いクオリティを安定的に提供いたします。"

        # areas-title / description
        a_title = soup.find(id='areas-title')
        a_desc = soup.find(id='areas-description')
        if slug == 'japan':
            if a_title: a_title.string = "全国 対応可能エリア"
            if a_desc: a_desc.string = "北海道から沖縄まで全国47都道府県のエリアに対応しています。掲載のない地域もお気軽にご相談ください。"
        else:
            if a_title: a_title.string = f"{d.get('prefShort', '')} 対応可能エリア"
            if a_desc: a_desc.string = f"{d['cityShort']}を含む{d.get('prefName', '')}内の主要エリアを中心にサービスを提供しております。掲載のない地域もお気軽にご相談ください。"

        # localFaqs (ご当地FAQ) の挿入
        faq_section = soup.find(id='faq')
        if faq_section and 'localFaqs' in d and slug != 'japan':
            # FAQアイテムを包む親divを探す (通常は .space-y-4)
            faq_container = faq_section.find('div', class_='space-y-4')
            if faq_container:
                for faq in d['localFaqs']:
                    # 新しいFAQアイテムを作成
                    item_div = soup.new_tag('div', **{'class': 'border border-gray-200 rounded-sm'})
                    details = soup.new_tag('details', **{'class': 'group'})
                    
                    summary = soup.new_tag('summary', **{'class': 'flex justify-between items-center font-medium cursor-pointer list-none p-5 text-primary hover:bg-gray-50 transition'})
                    span_q = soup.new_tag('span', **{'class': 'font-bold flex items-center'})
                    span_q_icon = soup.new_tag('span', **{'class': 'text-accent text-2xl mr-3 font-serif'})
                    span_q_icon.string = "Q."
                    span_q.append(span_q_icon)
                    span_q.append(faq['q'])
                    
                    span_arrow = soup.new_tag('span', **{'class': 'transition group-open:rotate-180'})
                    i_arrow = soup.new_tag('i', **{'class': 'fas fa-chevron-down text-gray-400'})
                    span_arrow.append(i_arrow)
                    
                    summary.append(span_q)
                    summary.append(span_arrow)
                    
                    ans_div = soup.new_tag('div', **{'class': 'text-gray-600 mt-0 border-t border-gray-100 p-5 bg-gray-50 text-sm leading-relaxed flex'})
                    span_a_icon = soup.new_tag('span', **{'class': 'text-primary text-2xl font-serif font-bold mr-3'})
                    span_a_icon.string = "A."
                    
                    p_ans = soup.new_tag('p', **{'class': 'mt-1'})
                    p_ans.string = faq['a']
                    
                    ans_div.append(span_a_icon)
                    ans_div.append(p_ans)
                    
                    details.append(summary)
                    details.append(ans_div)
                    item_div.append(details)
                    
                    # 既存のFAQの先頭に差し込む（地域特有の質問を目立たせるため）
                    faq_container.insert(0, item_div)

        # municipalities-list
        mun_list = soup.find(id='municipalities-list')
        if mun_list:
            mun_list.clear()
            if slug == 'japan':
                mun_list['class'] = "mt-4 text-gray-600 font-medium w-full"
                
                # 地方ごとにグループ化
                grouped = {r: {} for r in REGION_MAP.keys()}
                for c_slug, c_data in cities.items():
                    if c_slug == 'japan': continue
                    region = get_region(c_data['prefName'])
                    if region not in grouped:
                        grouped[region] = {}
                    if c_data['prefName'] not in grouped[region]:
                        grouped[region][c_data['prefName']] = []
                    grouped[region][c_data['prefName']].append(c_data)
                
                tabs_div = soup.new_tag('div', **{'class': 'flex flex-wrap gap-1.5 mb-5 border-b border-gray-200 pb-2'})
                content_div = soup.new_tag('div', id='region-tab-content')
                
                is_first = True
                for region, prefs in grouped.items():
                    if not prefs: continue
                    
                    active_class = 'bg-primary text-white shadow'
                    inactive_class = 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    btn_class = f"region-tab-btn px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded transition-colors {active_class if is_first else inactive_class}"
                    
                    btn = soup.new_tag('button', type='button', **{'data-region': region, 'class': btn_class})
                    btn.string = region
                    tabs_div.append(btn)
                    
                    reg_content = soup.new_tag('div', id=f"region-content-{region}", **{'class': f"region-content {'block' if is_first else 'hidden'}"})
                    flex_wrap = soup.new_tag('div', **{'class': 'flex flex-wrap gap-2'})
                    
                    for pref, city_list in prefs.items():
                        for city in city_list:
                            a_tag = soup.new_tag('a', href=f"/{city['cityKey']}/", **{'class': 'group inline-flex items-center px-3 py-1.5 bg-white hover:bg-accent hover:text-white border border-gray-200 rounded-full text-xs transition duration-300 shadow-sm'})
                            i_icon = soup.new_tag('i', **{'class': 'fas fa-map-marker-alt text-accent group-hover:text-white mr-1.5 opacity-70'})
                            a_tag.append(i_icon)
                            a_tag.append(city['cityName'])
                            flex_wrap.append(a_tag)
                            
                    reg_content.append(flex_wrap)
                    content_div.append(reg_content)
                    
                    is_first = False
                    
                mun_list.append(tabs_div)
                mun_list.append(content_div)
            else:
                mun_list['class'] = "grid grid-cols-2 gap-y-2 mt-4 text-gray-600 font-medium"
                if 'municipalities' in d:
                    for m in d['municipalities']:
                        m_div = soup.new_tag('div', **{'class': 'flex items-center text-gray-700 font-medium text-sm'})
                        m_icon = soup.new_tag('i', **{'class': 'fas fa-check text-accent text-xs mr-2 flex-shrink-0'})
                        m_div.append(m_icon)
                        m_div.append(m)
                        mun_list.append(m_div)

        # 書き出し
        if slug == 'japan':
            # japan はルートの index.html に上書き
            output_path = index_path
        else:
            output_dir = os.path.join(base_dir, slug)
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, 'index.html')
            
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        
        print(f"Generated FULL static: {output_path}")

if __name__ == '__main__':
    import sys
    sys.exit(
        "⚠ このスクリプトは非推奨です（regional.js の一部セクションしか焼き込まない不完全な SSG）。\n"
        "  data-ssg=true を付与するため、未対応セクション（事例・繁忙期・条例など）が空になります。\n"
        "  都市ページの生成は regional.js を実際に実行して全セクションを焼き込む次を使用してください:\n"
        "      node scripts/prerender.mjs\n"
        "  どうしても実行する場合は build_full_static() を直接呼び出してください。"
    )
