/* Live rooms, chat, language and the Terranimus account for the temple. A classic script loaded after the page's own, so it shares
   its globals (seats, visitors, addVisitor, donate, say, showToast, me, mySkin, setLook ...). Everything here is optional: if the
   room server or the account is unreachable the temple still works alone, as it did before. */
(() => {
  'use strict'
  /* ---------------------------------------------------------------- language */
  const LANGS = ['vi', 'en', 'ja', 'ko', 'zh', 'hi', 'ru']
  const SLUG = { vi: 'chua', en: 'temple', ja: 'tera', ko: 'sawon', zh: 'simiao', hi: 'mandir', ru: 'khram' }
  const T = {
    vi: { slow: 'Chậm một chút nhé, thiền cần thong thả.', title: 'Chánh Điện Online', intro: 'Nhập pháp danh, chọn y phục rồi vào an tọa. Các nút dâng cánh sen, dâng hương, hoa sen, thỉnh chuông đều miễn phí.', name: 'Pháp danh', cloth: 'Y phục', enter: 'Vào chánh điện', ph: 'Ví dụ: Diệu Hạnh, Minh Tâm…', petal: 'Cánh sen', incense: 'Dâng hương', lotus: 'Hoa sen', bell: 'Thỉnh chuông', mute: 'Tắt nhạc', unmute: 'Bật nhạc', stand: 'Đứng lên', sit: 'Ngồi xuống', leave: 'Rời', people: 'phật tử', chanting: 'đang tụng kinh', board: 'Tấm lòng thành', room: 'Phòng', next: 'Phòng kế', go: 'Đến phòng', goPh: 'Số phòng', share: 'Chia sẻ liên kết', copied: 'Đã chép liên kết', chat: 'Trò chuyện', chatPh: 'Nhắn trong phòng…', send: 'Gửi', joined: 'đã vào chánh điện', gave: 'đã dâng', home: 'Tử Vi', signin: 'Đăng nhập để lưu pháp danh và công đức', signed: 'Đã đăng nhập', full: 'Phòng đã đầy, chuyển sang phòng kế.', offline: 'Mất kết nối, đang nối lại…', skins: { man: 'Nam áo lam', woman: 'Nữ áo lam', granny: 'Áo nâu' , monk: 'Tăng sĩ', nun: 'Ni cô', child: 'Em bé' } },
    en: { slow: 'Slow down a little.', title: 'Online Temple Hall', intro: 'Enter a Dharma name, pick your clothes and take a seat. Offering a petal, incense, a lotus or ringing the bell is free.', name: 'Dharma name', cloth: 'Clothes', enter: 'Enter the hall', ph: 'For example: Serene Heart…', petal: 'Lotus petal', incense: 'Incense', lotus: 'Lotus', bell: 'Ring bell', mute: 'Mute music', unmute: 'Music on', stand: 'Stand up', sit: 'Sit down', leave: 'Leave', people: 'visitors', chanting: 'is chanting', board: 'Sincerity board', room: 'Room', next: 'Next room', go: 'Go to room', goPh: 'Room no.', share: 'Share link', copied: 'Link copied', chat: 'Chat', chatPh: 'Message this room…', send: 'Send', joined: 'entered the hall', gave: 'offered', home: 'Astrology', signin: 'Sign in to keep your Dharma name and merit', signed: 'Signed in', full: 'This room is full, moving to the next.', offline: 'Connection lost, reconnecting…', skins: { man: 'Man, blue robe', woman: 'Woman, blue robe', granny: 'Brown robe' , monk: 'Monk', nun: 'Nun', child: 'Child' } },
    ja: { slow: '少しゆっくりお願いします。', title: 'オンライン本堂', intro: '法名を入力し、服を選んで着席してください。花びら・お香・蓮・鐘は無料です。', name: '法名', cloth: '服装', enter: '本堂に入る', ph: '例：妙行', petal: '蓮の花びら', incense: 'お香', lotus: '蓮の花', bell: '鐘を鳴らす', mute: '音楽オフ', unmute: '音楽オン', stand: '立つ', sit: '座る', leave: '退出', people: '人', chanting: '読経中', board: '真心ボード', room: 'ルーム', next: '次のルーム', go: 'ルームへ', goPh: 'ルーム番号', share: 'リンクを共有', copied: 'リンクをコピーしました', chat: 'チャット', chatPh: 'ルームにメッセージ…', send: '送信', joined: 'が入堂しました', gave: 'が捧げました', home: '紫微斗数', signin: 'ログインして法名と功徳を保存', signed: 'ログイン中', full: 'このルームは満席です。次へ移動します。', offline: '接続が切れました。再接続中…', skins: { man: '男性・藍の衣', woman: '女性・藍の衣', granny: '茶の衣' , monk: '僧侶', nun: '尼僧', child: '子ども' } },
    ko: { slow: '조금만 천천히 해 주세요.', title: '온라인 법당', intro: '법명을 입력하고 옷을 골라 자리에 앉으세요. 꽃잎·향·연꽃·종은 무료입니다.', name: '법명', cloth: '복장', enter: '법당 입장', ph: '예: 묘행', petal: '연꽃잎', incense: '향', lotus: '연꽃', bell: '종 울리기', mute: '음악 끄기', unmute: '음악 켜기', stand: '일어서기', sit: '앉기', leave: '나가기', people: '명', chanting: '독경 중', board: '정성 보드', room: '방', next: '다음 방', go: '방으로 이동', goPh: '방 번호', share: '링크 공유', copied: '링크를 복사했습니다', chat: '채팅', chatPh: '이 방에 메시지…', send: '보내기', joined: '님이 입장했습니다', gave: '님이 올렸습니다', home: '자미두수', signin: '로그인하여 법명과 공덕 저장', signed: '로그인됨', full: '방이 가득 찼습니다. 다음 방으로 이동합니다.', offline: '연결이 끊겼습니다. 다시 연결 중…', skins: { man: '남성·푸른 법복', woman: '여성·푸른 법복', granny: '갈색 법복' , monk: '스님', nun: '비구니', child: '어린이' } },
    zh: { slow: '请稍慢一点。', title: '线上大殿', intro: '输入法名，选择衣着，入座。供花瓣、上香、献莲花、敲钟都是免费的。', name: '法名', cloth: '衣着', enter: '进入大殿', ph: '例如：妙行', petal: '莲花瓣', incense: '上香', lotus: '莲花', bell: '敲钟', mute: '关闭音乐', unmute: '开启音乐', stand: '起身', sit: '坐下', leave: '离开', people: '位', chanting: '正在诵经', board: '诚心榜', room: '房间', next: '下一个房间', go: '前往房间', goPh: '房间号', share: '分享链接', copied: '链接已复制', chat: '聊天', chatPh: '在房间里留言…', send: '发送', joined: '进入了大殿', gave: '供奉了', home: '紫微斗数', signin: '登录以保存法名和功德', signed: '已登录', full: '房间已满，转到下一个房间。', offline: '连接断开，正在重连…', skins: { man: '男·蓝衣', woman: '女·蓝衣', granny: '褐衣' , monk: '僧人', nun: '比丘尼', child: '孩童' } },
    hi: { slow: 'थोड़ा धीरे करें।', title: 'ऑनलाइन मंदिर कक्ष', intro: 'अपना धर्म नाम लिखें, वस्त्र चुनें और आसन ग्रहण करें। पंखुड़ी, धूप, कमल और घंटी अर्पण निःशुल्क हैं।', name: 'धर्म नाम', cloth: 'वस्त्र', enter: 'कक्ष में प्रवेश', ph: 'जैसे: शांत हृदय…', petal: 'कमल की पंखुड़ी', incense: 'धूप', lotus: 'कमल', bell: 'घंटी', mute: 'संगीत बंद', unmute: 'संगीत चालू', stand: 'खड़े हों', sit: 'बैठें', leave: 'बाहर', people: 'भक्त', chanting: 'पाठ कर रहे हैं', board: 'श्रद्धा तालिका', room: 'कक्ष', next: 'अगला कक्ष', go: 'कक्ष में जाएँ', goPh: 'कक्ष संख्या', share: 'लिंक साझा करें', copied: 'लिंक कॉपी हो गया', chat: 'चैट', chatPh: 'इस कक्ष में संदेश…', send: 'भेजें', joined: 'कक्ष में आए', gave: 'ने अर्पित किया', home: 'ज्योतिष', signin: 'धर्म नाम और पुण्य सहेजने के लिए साइन इन करें', signed: 'साइन इन', full: 'यह कक्ष भरा है, अगले में जा रहे हैं।', offline: 'कनेक्शन टूटा, फिर जुड़ रहे हैं…', skins: { man: 'पुरुष, नीला वस्त्र', woman: 'महिला, नीला वस्त्र', granny: 'भूरा वस्त्र' , monk: 'भिक्षु', nun: 'भिक्षुणी', child: 'बच्चा' } },
    ru: { slow: 'Чуть помедленнее.', title: 'Онлайн-храм', intro: 'Введите буддийское имя, выберите одежду и займите место. Лепесток, благовония, лотос и колокол — бесплатно.', name: 'Буддийское имя', cloth: 'Одежда', enter: 'Войти в зал', ph: 'Например: Тихое Сердце…', petal: 'Лепесток лотоса', incense: 'Благовония', lotus: 'Лотос', bell: 'Колокол', mute: 'Выкл. музыку', unmute: 'Вкл. музыку', stand: 'Встать', sit: 'Сесть', leave: 'Выйти', people: 'гостей', chanting: 'читает сутры', board: 'Доска искренности', room: 'Комната', next: 'Следующая', go: 'В комнату', goPh: 'Номер', share: 'Поделиться ссылкой', copied: 'Ссылка скопирована', chat: 'Чат', chatPh: 'Сообщение в комнату…', send: 'Отправить', joined: 'вошёл(а) в зал', gave: 'поднёс(ла)', home: 'Астрология', signin: 'Войдите, чтобы сохранить имя и заслуги', signed: 'Вы вошли', full: 'Комната заполнена, переходим в следующую.', offline: 'Связь потеряна, переподключение…', skins: { man: 'Мужчина, синее', woman: 'Женщина, синее', granny: 'Коричневое' , monk: 'Монах', nun: 'Монахиня', child: 'Ребёнок' } },
  }
  /* the rest of the page's words (what is not in T): enter hint, credit, track names, toasts */
  const GH = 'https://github.com/kentjuno/chanh-dien-online'
  const X = {
    vi: { invite: 'Mời bạn', hint: 'Khi đã vào: chạm chánh điện để tụng một câu, chạm bồ đoàn trống (hoặc phím mũi tên) để đổi chỗ, nút Đứng lên / Ngồi xuống ở dưới.', credit: 'Thực hiện bởi Kent Juno · <a href="' + GH + '" rel="noopener">mã nguồn mở (MIT)</a>. Trang cộng đồng, không đại diện cho chùa hay tổ chức tôn giáo nào.', next: 'Bài kế tiếp', seated: 'Đã an tọa.', standNote: 'Chạm vào bồ đoàn trống để đi tới.', hallFull: 'Chánh điện đã kín chỗ, xin chờ một lát.', m1: 'Trăng trên rừng trúc', m2: 'Hơi thở ban mai' },
    en: { invite: 'Invite a friend', hint: 'Once inside: tap the hall to chant a line, tap an empty cushion (or use the arrow keys) to change seat, and use the Stand up / Sit down button below.', credit: 'Made by Kent Juno · <a href="' + GH + '" rel="noopener">open source (MIT)</a>. A community page; it does not represent any temple or religious organisation.', next: 'Next track', seated: 'Seated.', standNote: 'Tap an empty cushion to move there.', hallFull: 'The hall is full, please wait a moment.', m1: 'Moon over the bamboo grove', m2: 'Morning breath' },
    ja: { invite: '友だちを招待', hint: '入堂後：本堂をタップして一句唱え、空いた座布団（または矢印キー）で席を移り、下の「立つ／座る」ボタンを使います。', credit: 'Kent Juno 制作 · <a href="' + GH + '" rel="noopener">オープンソース (MIT)</a>。コミュニティのページで、特定の寺院や宗教団体を代表するものではありません。', next: '次の曲', seated: '着席しました。', standNote: '空いた座布団をタップして移動します。', hallFull: '本堂は満席です。しばらくお待ちください。', m1: '竹林にのぼる月', m2: '朝の息吹' },
    ko: { invite: '친구 초대', hint: '입장 후: 법당을 눌러 한 구절을 외고, 빈 방석(또는 방향키)을 눌러 자리를 옮기며, 아래의 일어서기/앉기 버튼을 쓰세요.', credit: 'Kent Juno 제작 · <a href="' + GH + '" rel="noopener">오픈 소스 (MIT)</a>. 커뮤니티 페이지이며 어떤 사찰이나 종교 단체도 대표하지 않습니다.', next: '다음 곡', seated: '자리에 앉았습니다.', standNote: '빈 방석을 눌러 이동하세요.', hallFull: '법당이 가득 찼습니다. 잠시만 기다려 주세요.', m1: '대숲 위의 달', m2: '아침의 숨결' },
    zh: { invite: '邀请朋友', hint: '进入后：点击大殿诵一句，点击空蒲团（或方向键）换座位，使用下方的“起身／坐下”按钮。', credit: '由 Kent Juno 制作 · <a href="' + GH + '" rel="noopener">开源 (MIT)</a>。社区页面，不代表任何寺院或宗教组织。', next: '下一首', seated: '已入座。', standNote: '点击空蒲团即可前往。', hallFull: '大殿已满，请稍候。', m1: '竹林上的月亮', m2: '晨间的呼吸' },
    hi: { invite: 'मित्र को बुलाएँ', hint: 'अंदर आने के बाद: मंत्र बोलने के लिए कक्ष को छुएँ, स्थान बदलने के लिए खाली आसन (या तीर कुंजियाँ) चुनें, और नीचे “खड़े हों / बैठें” बटन का उपयोग करें।', credit: 'Kent Juno द्वारा निर्मित · <a href="' + GH + '" rel="noopener">ओपन सोर्स (MIT)</a>। यह एक सामुदायिक पृष्ठ है, किसी मंदिर या धार्मिक संस्था का प्रतिनिधि नहीं।', next: 'अगला गीत', seated: 'आसन ग्रहण कर लिया।', standNote: 'वहाँ जाने के लिए खाली आसन को छुएँ।', hallFull: 'कक्ष भरा हुआ है, कृपया थोड़ी प्रतीक्षा करें।', m1: 'बाँस के वन पर चाँद', m2: 'प्रभात की साँस' },
    ru: { invite: 'Пригласить друга', hint: 'Войдя: коснитесь зала, чтобы произнести строку; коснитесь свободной подушки (или стрелок), чтобы сменить место; ниже кнопка «Встать / Сесть».', credit: 'Автор: Kent Juno · <a href="' + GH + '" rel="noopener">открытый код (MIT)</a>. Страница сообщества; не представляет ни один храм или религиозную организацию.', next: 'Следующий трек', seated: 'Вы сели.', standNote: 'Коснитесь свободной подушки, чтобы пересесть.', hallFull: 'Зал заполнен, подождите немного.', m1: 'Луна над бамбуковой рощей', m2: 'Утреннее дыхание' },
  }
  const BOTNAMES = {
    vi: ['Diệu Hạnh', 'Minh Tâm', 'Thiện Đức', 'Huệ An', 'Tịnh Nhã', 'Quảng Trí', 'Chơn Như', 'Pháp Hỷ', 'Nguyên Thanh', 'Tâm Đăng', 'Diệu Liên', 'Trí Hải', 'Phước Lộc', 'Hạnh Nguyện'],
    en: ['Serene Heart', 'Bright Mind', 'Kind Virtue', 'Quiet Joy', 'Pure Grace', 'Wide Wisdom', 'True Way', 'Dharma Joy', 'Calm River', 'Lamp of Mind', 'Lotus Dew', 'Sea of Wisdom', 'Blessed Path', 'Gentle Vow'],
    ja: ['妙行', '明心', '善徳', '慧安', '浄雅', '広智', '真如', '法喜', '源清', '心灯', '妙蓮', '智海', '福禄', '行願'],
    ko: ['묘행', '명심', '선덕', '혜안', '정아', '광지', '진여', '법희', '원청', '심등', '묘련', '지해', '복록', '행원'],
    zh: ['妙行', '明心', '善德', '慧安', '净雅', '广智', '真如', '法喜', '源清', '心灯', '妙莲', '智海', '福禄', '行愿'],
    hi: ['शांतहृदय', 'प्रज्ञा', 'सद्गुण', 'शांति', 'निर्मला', 'विशाल', 'तथता', 'धर्मप्रिय', 'निर्मल', 'दीपक', 'कमला', 'ज्ञानसागर', 'शुभमार्ग', 'करुणा'],
    ru: ['Тихое Сердце', 'Ясный Ум', 'Добродетель', 'Светлая Радость', 'Чистота', 'Мудрость', 'Истинный Путь', 'Радость Дхармы', 'Тихая Река', 'Лампа Ума', 'Лотос', 'Море Мудрости', 'Благой Путь', 'Мягкий Обет'],
  }
  const $ = (id) => document.getElementById(id)
  const params = new URLSearchParams(location.search)
  const slugLang = Object.keys(SLUG).find((l) => location.pathname.split('/')[1] === SLUG[l])
  const pick = (v) => (LANGS.includes(v) ? v : null)
  let lang = pick(params.get('lang')) || slugLang || pick(safe(() => localStorage.getItem('chua.lang'))) || pick((navigator.language || 'vi').slice(0, 2)) || 'vi'
  function safe(f) { try { return f() } catch { return null } }
  const t = (k) => (T[lang] && T[lang][k]) || (X[lang] && X[lang][k]) || T.vi[k] || X.vi[k] || k

  /* ---------------------------------------------------------------- the voice: what is spoken and written aloud follows the language */
  const VOICE = {
    vi: { tag: 'vi', sys: 'Hệ thống', look: 'Đang tìm giọng đọc tiếng Việt…', ok: 'Giọng đọc: ', none: 'Máy này chưa có giọng đọc tiếng Việt: lời nguyện chỉ hiện chữ.', warn: 'Máy này chưa có giọng tiếng Việt nên không đọc thành tiếng.', welcome: (n) => 'Hoan nghênh ' + n + ' vào chánh điện', gave: (n, l, x) => n + ' dâng ' + l + '. ' + x,
      sutra: ['Nam mô A Di Đà Phật', 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật', 'Nam mô Đại Bi Quán Thế Âm Bồ Tát', 'Nguyện cầu bình an cho gia đình', 'Cầu cho cha mẹ được khỏe mạnh', 'Nguyện đem công đức này hướng về khắp tất cả'] },
    en: { tag: 'en', sys: 'System', look: 'Looking for an English voice…', ok: 'Voice: ', none: 'This device has no English voice: prayers are shown as text only.', warn: 'This device has no English voice, so nothing is read aloud.', welcome: (n) => 'Welcome, ' + n + ', to the hall', gave: (n, l, x) => n + ' offers ' + l + '. ' + x,
      sutra: ['Namo Amitabha Buddha', 'Homage to Shakyamuni Buddha, the teacher', 'Homage to Avalokiteshvara, the Bodhisattva of compassion', 'May my family be safe and well', 'May my parents be healthy and strong', 'May the merit of this offering reach all beings'] },
    ja: { tag: 'ja', sys: 'システム', look: '日本語の音声を探しています…', ok: '音声：', none: 'この端末には日本語の音声がありません。祈りは文字のみで表示します。', warn: 'この端末には日本語の音声がないため、読み上げません。', welcome: (n) => 'ようこそ、' + n + 'さん、本堂へ', gave: (n, l, x) => n + 'が' + l + 'を捧げます。' + x,
      sutra: ['南無阿弥陀仏', '南無釈迦牟尼仏', '南無観世音菩薩', '家族の安らぎを願います', '父母の健康を願います', 'この功徳があまねく一切に及びますように'] },
    ko: { tag: 'ko', sys: '시스템', look: '한국어 음성을 찾는 중…', ok: '음성: ', none: '이 기기에는 한국어 음성이 없습니다. 기도문은 글자로만 표시됩니다.', warn: '이 기기에는 한국어 음성이 없어 소리 내어 읽지 않습니다.', welcome: (n) => n + '님, 법당에 오신 것을 환영합니다', gave: (n, l, x) => n + '님이 ' + l + ' 올립니다. ' + x,
      sutra: ['나무아미타불', '나무석가모니불', '나무관세음보살', '가족의 평안을 기원합니다', '부모님의 건강을 기원합니다', '이 공덕이 모든 중생에게 두루 미치기를'] },
    zh: { tag: 'zh', sys: '系统', look: '正在寻找中文语音…', ok: '语音：', none: '此设备没有中文语音，祈愿文只显示文字。', warn: '此设备没有中文语音，因此不朗读。', welcome: (n) => '欢迎' + n + '来到大殿', gave: (n, l, x) => n + '供奉' + l + '。' + x,
      sutra: ['南无阿弥陀佛', '南无本师释迦牟尼佛', '南无大慈大悲观世音菩萨', '愿家人平安', '愿父母身体健康', '愿以此功德，普及于一切'] },
    hi: { tag: 'hi', sys: 'सिस्टम', look: 'हिन्दी आवाज़ खोजी जा रही है…', ok: 'आवाज़: ', none: 'इस डिवाइस में हिन्दी आवाज़ नहीं है: प्रार्थनाएँ केवल लिखी दिखेंगी।', warn: 'इस डिवाइस में हिन्दी आवाज़ नहीं है, इसलिए बोलकर नहीं पढ़ा जाएगा।', welcome: (n) => n + ', मंदिर कक्ष में आपका स्वागत है', gave: (n, l, x) => n + ' ने ' + l + ' अर्पित किया। ' + x,
      sutra: ['नमो अमिताभ बुद्ध', 'नमो भगवान शाक्यमुनि बुद्ध', 'नमो अवलोकितेश्वर बोधिसत्त्व', 'मेरे परिवार की शांति की कामना', 'माता-पिता के स्वास्थ्य की कामना', 'इस पुण्य का फल सभी प्राणियों तक पहुँचे'] },
    ru: { tag: 'ru', sys: 'Система', look: 'Ищу русский голос…', ok: 'Голос: ', none: 'На этом устройстве нет русского голоса: молитвы показываются только текстом.', warn: 'На этом устройстве нет русского голоса, поэтому вслух не читается.', welcome: (n) => 'Добро пожаловать в зал, ' + n, gave: (n, l, x) => n + ' приносит: ' + l + '. ' + x,
      sutra: ['Намо Амитабха Будда', 'Почтение Будде Шакьямуни, Учителю', 'Почтение Авалокитешваре, бодхисаттве сострадания', 'Пусть моя семья будет в мире и здравии', 'Пусть мои родители будут здоровы', 'Пусть заслуга этого дара достигнет всех существ'] },
  }
  window.chuaVoice = { lang: () => lang, v: () => VOICE[lang] || VOICE.vi, label: (kind) => t(kind), str: (k) => t(k), gaveWord: () => t('gave'), joinedWord: () => t('joined') }

  function applyLang() {
    document.documentElement.lang = lang
    if (window.pickVoice) window.pickVoice()
    document.title = `${t('title')} · Tịnh Tâm`
    const set = (sel, txt) => { const e = document.querySelector(sel); if (e) e.textContent = txt }
    set('#gate h1', t('title')); set('#gate p', t('intro')); set('label[for=dharma]', t('name'))
    $('dharma').placeholder = t('ph')
    document.querySelectorAll('#skin button').forEach((b) => { b.textContent = t('skins')[b.dataset.skin] || b.textContent })
    set('#gateForm .btn.primary', t('enter'))
    document.querySelectorAll('#gifts button').forEach((b) => { const k = { petal: 'petal', incense: 'incense', lotus: 'lotus', bell: 'bell' }[b.dataset.fx]; b.querySelector('b').textContent = t(k); b.title = t(k); b.setAttribute('aria-label', t(k)) })
    $('leave').textContent = t('leave')
    const cnt = $('count').nextElementSibling; if (cnt) cnt.textContent = t('people')
    if ($('enterHint')) $('enterHint').textContent = t('hint'); if ($('credit')) $('credit').innerHTML = t('credit')
    if ($('mute')) $('mute').textContent = $('mute').getAttribute('aria-pressed') === 'true' ? t('unmute') : t('mute')
    if ($('pose')) $('pose').textContent = $('pose').getAttribute('aria-pressed') === 'true' ? t('sit') : t('stand')
    if ($('nextTrack')) $('nextTrack').title = t('next')
    const clothLbl = document.querySelector('#gateForm label:not([for])'); if (clothLbl) clothLbl.textContent = t('cloth')
    const meHint = document.querySelector('#me .hint'); if (meHint) meHint.textContent = t('chanting')
    const bt = document.querySelector('#board h3'); if (bt) bt.textContent = t('board')
    if ($('chatText')) { $('chatText').placeholder = t('chatPh'); $('chatBtn').title = t('chat'); $('chatBtn').setAttribute('aria-label', t('chat')) }
    if ($('chipNext')) { $('chipNext').querySelector('.rcl').textContent = t('next'); $('chipNext').title = t('next'); $('chipShare').querySelector('.rcl').textContent = t('invite'); $('chipShare').title = t('invite'); count() }
    if ($('roomGo')) { $('roomNext').textContent = t('next'); $('roomGo').textContent = t('go'); $('roomNo').placeholder = t('goPh'); $('roomShare').textContent = t('share') }
    if ($('homeLink')) $('homeLink').textContent = '← ' + t('home')
    for (const id of ['langSel', 'langSelGate']) if ($(id)) $(id).value = lang
    refreshAccount()
  }

  /* ---------------------------------------------------------------- DOM added by this script */
  const top = $('top')
  const mk = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild }
  top.prepend(mk('<a class="chip" id="homeLink" href="/">← Tử Vi</a>'))
  const langHtml = (id) => '<select class="btn lang" id="' + id + '" aria-label="Language">' + LANGS.map((l) => `<option value="${l}">${l.toUpperCase()}</option>`).join('') + '</select>'
  $('count').parentElement.id = 'countChip'
  $('countChip').style.cursor = 'pointer'
  $('countChip').append(mk('<b id="roomChip" hidden></b>'), mk('<button class="rc" id="chipNext" type="button" hidden><span class="rcl"></span> ›</button>'), mk('<button class="rc" id="chipShare" type="button" hidden>🔗 <span class="rcl"></span></button>'))
  const panel = mk('<div id="roomPanel" hidden><div class="rp-row"><b id="roomTitle"></b></div><div class="rp-row"><input id="roomNo" inputmode="numeric" maxlength="5" autocomplete="off"><button class="btn" id="roomGo" type="button"></button></div><div class="rp-row"><button class="btn" id="roomNext" type="button"></button><button class="btn" id="roomShare" type="button"></button></div></div>')
  $('stage').append(panel)
  panel.append(mk('<div class="rp-row">' + langHtml('langSel') + '</div>'))
  $('gateForm').insertBefore(mk(langHtml('langSelGate')), $('gateForm').children[1])
  const chatForm = mk('<form id="chatForm" hidden autocomplete="off"><input id="chatText" maxlength="140" enterkeyhint="send"><button class="btn" type="submit" id="chatSend">↵</button></form>')
  const feed = $('feed')
  const chatBox = mk('<div id="chat"></div>')
  feed.replaceWith(chatBox); chatBox.append(feed, chatForm)
  const rowEl = document.querySelector('#bottom .row')
  const chatBtn = mk('<button class="btn" id="chatBtn" type="button" hidden>💬</button>')
  rowEl.prepend(chatBtn)
  const acct = mk('<span class="chip" id="acct" hidden></span>')
  top.insertBefore(acct, $('countChip'))


  /* ---------------------------------------------------------------- account (Terranimus Identity, through the Tử Vi origin) */
  const acc = { user: null, profile: null, signIn: null }
  async function api(path, init) {
    const r = await fetch(path, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...init })
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  }
  function refreshAccount() {
    if (acc.user) { acct.hidden = false; acct.textContent = `${t('signed')}: ${acc.user.name || acc.user.email || ''}` }
    else if (acc.signIn && (acc.signIn.mail || acc.signIn.google || acc.signIn.email)) {
      const href = acc.signIn.mail || acc.signIn.google || acc.signIn.email
      let hint = document.getElementById('signHint')
      if (!hint) { hint = mk('<div class="row"><span class="hint"><a id="signHint" href="#"></a></span></div>'); $('gateForm').insertBefore(hint, $('gateForm').lastElementChild) }
      const a = hint.querySelector('a'); a.textContent = t('signin'); a.href = href.includes('next=') ? href : href + (href.includes('?') ? '&' : '?') + 'next=' + encodeURIComponent(location.pathname)
    }
  }
  const saveProfile = (patch) => { if (!acc.user) return Promise.resolve(); return api('/api/v1/chua/profile', { method: 'PUT', body: JSON.stringify(patch) }).then((r) => (acc.profile = r.profile)).catch(() => {}) }
  async function loadAccount() {
    try {
      const me = await api('/api/v1/me')
      if (me.signedIn) {
        acc.user = me.user
        const p = (await api('/api/v1/chua/profile')).profile
        acc.profile = p
        if (p.phapDanh) $('dharma').value = p.phapDanh
        else if (me.user && me.user.name && !$('dharma').value) $('dharma').value = me.user.name
        if (p.skin) { const b = document.querySelector(`#skin button[data-skin="${p.skin}"]`); if (b) b.click() }
        if (!params.get('lang') && !slugLang && p.lang && LANGS.includes(p.lang)) { lang = p.lang; applyLang() }
        if (!roomFromUrl() && p.room) room = p.room
      } else acc.signIn = me.signIn
    } catch { /* the temple works without an account */ }
    refreshAccount()
  }

  /* ---------------------------------------------------------------- rooms */
  const SEATN = seats.length
  let MAXN = 50
  const spotAt = (i) => (i < SEATN ? seats[i] : standSpots[i - SEATN])
  const roomFromUrl = () => { const m = /\/room\/(\d{1,5})\/?$/.exec(location.pathname); return m ? Number(m[1]) : null }
  let room = roomFromUrl() || 1
  let ws = null, myId = null, wantOpen = false, tries = 0, entered = null
  const peers = new Map()      // server id -> visitor
  const botsOn = new Map()     // bot index -> visitor
  look = ((room - 1) % LOOKS.length + LOOKS.length) % LOOKS.length
  const botName = (i) => (BOTNAMES[lang] || BOTNAMES.vi)[i % 14]
  const base = () => `/${SLUG[lang]}`

  function clearAll() { for (const v of [...visitors]) removeVisitor(v); peers.clear(); botsOn.clear(); me = null }
  function setBots(list) {
    const want = new Set(list)
    for (const [i, v] of [...botsOn]) if (!want.has(i)) { removeVisitor(v); botsOn.delete(i) }
    for (const i of want) {
      if (botsOn.has(i)) continue
      const seat = seats[SEATN - 1 - i]
      if (!seat || seat.taken) continue
      const v = addVisitor(botName(i), SKINS[i % SKINS.length], true, false, seat)
      if (v) { v.bot = true; v.coins = 0; botsOn.set(i, v) }
    }
    count()
  }
  function count() {
    $('count').textContent = visitors.length
    const label = `${t('room')} ${room} · ${peers.size + (me ? 1 : 0)}/${MAXN}`
    $('roomTitle').textContent = label
    // inside a live room the top chip says which room, how full it is, and offers the next room and an invitation
    const live = !!me
    $('roomChip').hidden = !live; $('chipNext').hidden = !live; $('chipShare').hidden = !live
    $('count').hidden = live; $('count').nextElementSibling.hidden = live
    if (live) $('roomChip').textContent = label
  }

  function connect() {
    wantOpen = true
    if (ws) { ws.onclose = null; ws.onmessage = null; try { ws.close() } catch {} ws = null }   // never two sockets for one person
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/chua/ws?room=${room}`)
    ws.onopen = () => { tries = 0; ws.send(JSON.stringify({ t: 'join', name: entered.name, skin: entered.skin })) }
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data) } catch { return } on(m) }
    ws.onclose = () => { if (!wantOpen) return; showToast(t('offline')); setTimeout(() => { if (wantOpen) { clearAll(); reenter() } }, Math.min(8000, 800 * 2 ** tries++)) }
  }
  function on(m) {
    if (m.t === 'welcome') {
      clearAll(); myId = m.you; MAXN = m.max || 50; loadBoard()
      for (const p of m.people) {
        const seat = spotAt(p.seat); if (!seat) continue
        const mine = p.id === myId
        const v = addVisitor(mine ? entered.name : p.name, p.skin, !mine, mine, seat)
        if (!v) continue
        if (mine) { me = v; $('pose').hidden = !!seat.stand } else { v.coins = 0; peers.set(p.id, v) }
      }
      look = ((room - 1) % LOOKS.length + LOOKS.length) % LOOKS.length
      setBots(m.bots); renderBoard(); history.replaceState(null, '', `${base()}/room/${room}${location.search}`)
      saveProfile({ room })
    } else if (m.t === 'joined') {
      const seat = spotAt(m.p.seat); if (!seat || seat.taken) return
      const v = addVisitor(m.p.name, m.p.skin, false, false, seat); if (v) { v.coins = 0; peers.set(m.p.id, v); say(m.p.name, ' ' + t('joined')) }
      setBots(m.bots)
    } else if (m.t === 'left') {
      const v = peers.get(m.id); if (v) { removeVisitor(v); peers.delete(m.id) }
      setBots(m.bots)
    } else if (m.t === 'moved') {
      const v = peers.get(m.id), sp = spotAt(m.seat)
      if (v && sp && !sp.taken && window.relocate) window.relocate(v, sp)
    } else if (m.t === 'pose') {
      const v = peers.get(m.id)
      if (v && !v.seat.stand) { if (m.up && v.state === 'sit') { v.state = 'rising'; v.sitT = 0; v.next = null } else if (!m.up && v.state === 'stand') { v.state = 'sitting'; v.sitT = 0 } }
    } else if (m.t === 'chat') {
      const v = m.id === myId ? me : peers.get(m.id); say(m.name, m.text); if (v) { v.bow = .6 }
    } else if (m.t === 'act') {
      const v = peers.get(m.id); if (v) donate(v, { petal: 1, incense: 5, lotus: 20, bell: 99 }[m.kind] || 1, m.kind, '', true)
    } else if (m.t === 'slow') {
      showToast(t('slow'))
    } else if (m.t === 'full') {
      showToast(t('full')); gotoNext()
    }
    count()
  }
  async function gotoNext() {
    try { const r = await (await fetch('/chua/api/next?from=' + room)).json(); switchRoom(r.room) } catch { showToast(t('offline')) }
  }
  function switchRoom(n) {
    n = Number(n); if (!Number.isInteger(n) || n < 1 || n > 99999 || !entered) return
    wantOpen = false; if (ws) { try { ws.close() } catch {} }
    clearAll(); room = n; $('roomPanel').hidden = true; connect()
  }
  function reenter() { if (entered) connect() }

  /* hooks the page's own code calls */
  window.chuaOnEnter = (name, skin) => {
    if (ws && ws.readyState <= 1 && me && entered && entered.name === name) return    // already in: a second submit must not join again
    entered = { name, skin }
    for (const v of [...visitors]) removeVisitor(v)       // the offline demo crowd gives way to the live room
    me = null; chatBtn.hidden = false; $('roomPanel').hidden = true
    connect(); saveProfile({ phapDanh: name, skin, lang, room })
  }
  window.chuaOnLeave = () => { wantOpen = false; if (ws) try { ws.close() } catch {} ; clearAll(); chatForm.hidden = true; chatBtn.hidden = true; DEMO_RESTORE && DEMO_RESTORE() }
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)) }
  window.chuaOnMove = (spot) => { const i = seats.indexOf(spot); send({ t: 'move', seat: i >= 0 ? i : SEATN + standSpots.indexOf(spot) }) }
  window.chuaOnPose = (up) => send({ t: 'pose', up })
  /* today's board, from the Directory: refreshed now and then and after an offering */
  async function loadBoard() {
    try { const r = await (await fetch(base() + '/api/leaderboard')).json(); window.chuaBoard = r.top || []; if (window.renderBoard) window.renderBoard() } catch {}
  }
  setInterval(() => { if (me) loadBoard() }, 20000)
  window.chuaOnGift = (kind, coins) => {
    setTimeout(loadBoard, 1500)
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'act', kind }))
    pendingMerit += coins; clearTimeout(window.chuaOnGift._t); window.chuaOnGift._t = setTimeout(flushMerit, 4000)
  }
  let pendingMerit = 0
  function flushMerit() { let a = pendingMerit; pendingMerit = 0; while (a > 0) { const n = Math.min(a, 500); saveProfile({ addMerit: n }); a -= n } }
  addEventListener('pagehide', flushMerit)
  const DEMO_RESTORE = null

  /* ---------------------------------------------------------------- controls */
  chatBtn.addEventListener('click', () => { chatForm.hidden = !chatForm.hidden; if (!chatForm.hidden) $('chatText').focus() })
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault(); const text = $('chatText').value.trim(); if (!text || !ws || ws.readyState !== 1) return
    ws.send(JSON.stringify({ t: 'chat', text })); $('chatText').value = ''
  })
  $('countChip').addEventListener('click', () => { $('roomPanel').hidden = !$('roomPanel').hidden; $('roomNo').value = '' ; count() })
  $('roomGo').addEventListener('click', () => switchRoom($('roomNo').value))
  $('roomNo').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); switchRoom($('roomNo').value) } })
  $('roomNext').addEventListener('click', gotoNext)
  $('roomShare').addEventListener('click', shareRoom)
  $('chipShare').addEventListener('click', (e) => { e.stopPropagation(); shareRoom() })
  $('chipNext').addEventListener('click', (e) => { e.stopPropagation(); gotoNext() })
  async function shareRoom() {
    const url = `${location.origin}${base()}/room/${room}`
    try { if (navigator.share) await navigator.share({ title: t('title'), url }); else { await navigator.clipboard.writeText(url); showToast(t('copied')) } } catch { try { await navigator.clipboard.writeText(url); showToast(t('copied')) } catch {} }
  }
  for (const id of ['langSel', 'langSelGate']) $(id).addEventListener('change', (e) => {
    lang = e.target.value; try { localStorage.setItem('chua.lang', lang) } catch {}
    saveProfile({ lang }); applyLang()
    const tail = location.pathname.replace(/^\/[^/]+/, ''); history.replaceState(null, '', `${base()}${tail || '/'}${location.search}`)
    for (const [i, v] of botsOn) v.name = botName(i)
  })

  applyLang()
  loadAccount().then(() => { if (!entered && acc.user && acc.profile && acc.profile.phapDanh && params.get('enter') !== '0') $('gateForm').requestSubmit() })
})()
