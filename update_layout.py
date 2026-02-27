import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Numbers section
target_numbers_old = """            <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center lg:divide-x divide-white/20">
                <div class="px-4">
                    <p class="text-accent text-sm font-bold mb-3 tracking-wider">総管理物件数</p>
                    <div class="text-5xl font-bold font-serif mb-2 text-white">150<span
                            class="text-3xl text-accent ml-1">+</span></div>
                    <p class="text-gray-300 text-xs">沖縄北部エリア中心</p>
                </div>
                <div class="px-4">
                    <p class="text-accent text-sm font-bold mb-3 tracking-wider">月間清掃件数</p>
                    <div class="text-5xl font-bold font-serif mb-2 text-white">1,200<span
                            class="text-3xl text-accent ml-1">+</span></div>
                    <p class="text-gray-300 text-xs">リゾートクオリティを維持</p>
                </div>
                <div class="px-4">
                    <p class="text-accent text-sm font-bold mb-3 tracking-wider">年間ゲスト対応数</p>
                    <div class="text-5xl font-bold font-serif mb-2 text-white">50,000<span
                            class="text-3xl text-accent ml-1">+</span></div>
                    <p class="text-gray-300 text-xs">多言語で24時間365日対応</p>
                </div>
                <div class="px-4">
                    <p class="text-accent text-sm font-bold mb-3 tracking-wider">清掃クレーム発生率</p>
                    <div class="text-5xl font-bold font-serif mb-2 text-white">0.1<span
                            class="text-3xl text-accent ml-1">%以下</span></div>
                    <p class="text-gray-300 text-xs">徹底した品質管理システム</p>
                </div>
            </div>"""

target_numbers_new = """            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center lg:divide-x divide-white/20">
                <div class="px-2 sm:px-4">
                    <p class="text-accent text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wider">総管理物件数</p>
                    <div class="text-3xl sm:text-4xl md:text-5xl font-bold font-serif mb-1 sm:mb-2 text-white">150<span
                            class="text-xl sm:text-2xl md:text-3xl text-accent ml-1">+</span></div>
                    <p class="text-gray-300 text-[10px] sm:text-xs">沖縄北部エリア中心</p>
                </div>
                <div class="px-2 sm:px-4">
                    <p class="text-accent text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wider">月間清掃件数</p>
                    <div class="text-3xl sm:text-4xl md:text-5xl font-bold font-serif mb-1 sm:mb-2 text-white">1,200<span
                            class="text-xl sm:text-2xl md:text-3xl text-accent ml-1">+</span></div>
                    <p class="text-gray-300 text-[10px] sm:text-xs">リゾートクオリティを維持</p>
                </div>
                <div class="px-2 sm:px-4">
                    <p class="text-accent text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wider">年間ゲスト対応数</p>
                    <div class="text-3xl sm:text-4xl md:text-5xl font-bold font-serif mb-1 sm:mb-2 text-white">50,000<span
                            class="text-xl sm:text-2xl md:text-3xl text-accent ml-1">+</span></div>
                    <p class="text-gray-300 text-[10px] sm:text-xs">多言語で24時間365日対応</p>
                </div>
                <div class="px-2 sm:px-4">
                    <p class="text-accent text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wider">清掃クレーム発生率</p>
                    <div class="text-3xl sm:text-4xl md:text-5xl font-bold font-serif mb-1 sm:mb-2 text-white">0.1<span
                            class="text-xl sm:text-2xl md:text-3xl text-accent ml-1">%以下</span></div>
                    <p class="text-gray-300 text-[10px] sm:text-xs">徹底した品質管理システム</p>
                </div>
            </div>"""

content = content.replace(target_numbers_old, target_numbers_new)

# 2. Services section
target_services_old = """            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
                <!-- Service 1 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-edit"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">OTA掲載・作成</h4>
                    <p class="text-gray-600 text-xs">魅力的な写真選定や説明文作成で、予約率を高めるページを構築します。</p>
                </div>
                <!-- Service 2 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-chart-line"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">集客・価格調整</h4>
                    <p class="text-gray-600 text-xs">AIと市場データを用いたダイナミックプライシングで収益を最大化します。</p>
                </div>
                <!-- Service 3 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-headset"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">365日ゲスト対応</h4>
                    <p class="text-gray-600 text-xs">英語・中国語等の多言語対応。深夜の問い合わせにも迅速に回答します。</p>
                </div>
                <!-- Service 4 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-sparkles"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">プロ清掃・管理</h4>
                    <p class="text-gray-600 text-xs">自社基準の徹底された清掃と、消耗品の補充、写真付きレポート報告。</p>
                </div>
                <!-- Service 5 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-shield-alt"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">トラブル・クレーム</h4>
                    <p class="text-gray-600 text-xs">ご近所からの苦情や、備品の破損など、緊急時もすべて弊社が窓口となります。</p>
                </div>
                <!-- Service 6 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-star"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">レビュー管理</h4>
                    <p class="text-gray-600 text-xs">高評価の獲得施策と、低評価時の適切なフォローアップで施設の価値を維持。</p>
                </div>
                <!-- Service 7 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-concierge-bell"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">オプション手配</h4>
                    <p class="text-gray-600 text-xs">BBQ機材のレンタルやレンタカー案内など、ゲスト体験を向上させる手配。</p>
                </div>
                <!-- Service 8 -->
                <div
                    class="bg-gray-50 p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-3xl text-accent mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-calculator"></i></div>
                    <h4 class="font-bold text-primary text-lg mb-2">売上管理・報告</h4>
                    <p class="text-gray-600 text-xs">毎月の収益と稼働実績をまとめたレポートを発行し、透明性を確保します。</p>
                </div>
            </div>"""

target_services_new = """            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
                <!-- Service 1 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-edit"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">OTA掲載・作成</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">魅力的な写真選定や説明文作成で、予約率を高めるページを構築します。</p>
                </div>
                <!-- Service 2 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-chart-line"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">集客・価格調整</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">AIと市場データを用いたダイナミックプライシングで収益を最大化します。</p>
                </div>
                <!-- Service 3 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-headset"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">365日対応</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">英語・中国語等の多言語対応。深夜の問い合わせにも迅速に回答します。</p>
                </div>
                <!-- Service 4 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-sparkles"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">プロ清掃・管理</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">自社基準の徹底された清掃と、消耗品の補充、写真付きレポート報告。</p>
                </div>
                <!-- Service 5 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-shield-alt"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">トラブル等</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">近所からの苦情や備品の破損など、緊急時もすべて弊社が窓口となります。</p>
                </div>
                <!-- Service 6 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-star"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">レビュー管理</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">高評価の獲得施策と、低評価時の適切なフォローアップで施設の価値を維持。</p>
                </div>
                <!-- Service 7 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-concierge-bell"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">オプション</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">BBQ機材のレンタルやレンタカー案内など、体験を向上させる手配。</p>
                </div>
                <!-- Service 8 -->
                <div
                    class="bg-gray-50 p-4 sm:p-6 rounded-sm text-center border-t-4 border-primary hover:border-accent transition group">
                    <div class="text-2xl sm:text-3xl text-accent mb-3 sm:mb-4 transform group-hover:scale-110 transition"><i
                            class="fas fa-calculator"></i></div>
                    <h4 class="font-bold text-primary text-sm sm:text-lg mb-2">売上管理</h4>
                    <p class="text-gray-600 text-[10px] sm:text-xs leading-relaxed">毎月の収益と稼働実績をまとめたレポートを発行し、透明性を確保します。</p>
                </div>
            </div>"""

content = content.replace(target_services_old, target_services_new)

# 3. Social Proof (BIZ-HANARE)
target_proof_1_old = """                        <div class="space-y-4">
                            <div class="flex justify-between items-end">
                                <span class="text-gray-600 font-medium">年間平均稼働率</span>
                                <span class="text-3xl font-bold text-primary">85<span class="text-lg">%</span>達成</span>
                            </div>
                            <div class="flex justify-between items-end">
                                <span class="text-gray-600 font-medium">ゲスト評価 (OTA総合)</span>
                                <div class="text-right">
                                    <div class="text-accent text-lg">
                                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i
                                            class="fas fa-star"></i><i class="fas fa-star"></i><i
                                            class="fas fa-star"></i>
                                    </div>
                                    <span class="text-3xl font-bold text-primary">4.9<span
                                            class="text-lg text-gray-500"> / 5.0</span></span>
                                </div>
                            </div>
                        </div>"""

target_proof_1_new = """                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 sm:gap-0">
                                <span class="text-gray-600 font-medium">年間平均稼働率</span>
                                <span class="text-3xl font-bold text-primary">85<span class="text-lg">%</span>達成</span>
                            </div>
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 sm:gap-0 mt-4 sm:mt-0">
                                <span class="text-gray-600 font-medium">ゲスト評価 (OTA総合)</span>
                                <div class="text-left sm:text-right">
                                    <div class="text-accent text-lg">
                                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i
                                            class="fas fa-star"></i><i class="fas fa-star"></i><i
                                            class="fas fa-star"></i>
                                    </div>
                                    <span class="text-3xl font-bold text-primary">4.9<span
                                            class="text-lg text-gray-500"> / 5.0</span></span>
                                </div>
                            </div>
                        </div>"""

content = content.replace(target_proof_1_old, target_proof_1_new)

# 4. Social Proof (Rakuten)
target_proof_2_old = """                        <div class="space-y-4">
                            <div class="flex justify-between items-end">
                                <span class="text-gray-600 font-medium">収益改善率 (前社比)</span>
                                <span class="text-3xl font-bold text-accent">140<span class="text-lg">%</span>UP</span>
                            </div>
                            <div class="flex justify-between items-end">
                                <span class="text-gray-600 font-medium">清掃クレーム発生率</span>
                                <span class="text-3xl font-bold text-primary">0<span class="text-lg">件</span></span>
                            </div>
                        </div>"""

target_proof_2_new = """                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 sm:gap-0">
                                <span class="text-gray-600 font-medium">収益改善率 (前社比)</span>
                                <span class="text-3xl font-bold text-accent">140<span class="text-lg">%</span>UP</span>
                            </div>
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 sm:gap-0 mt-4 sm:mt-0">
                                <span class="text-gray-600 font-medium">清掃クレーム発生率</span>
                                <span class="text-3xl font-bold text-primary">0<span class="text-lg">件</span></span>
                            </div>
                        </div>"""

content = content.replace(target_proof_2_old, target_proof_2_new)


# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating")
