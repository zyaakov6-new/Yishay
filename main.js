/* ============================================================
   BEIT KNESSET YISHAI – main.js
   ============================================================ */

/* ── NAVBAR scroll effect ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── HAMBURGER / MOBILE MENU ── */
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
}

/* ── TABS ── */
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;

    // deactivate siblings
    btn.closest('.tabs').querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // show matching panel
    const section = btn.closest('section') || btn.closest('.section-times');
    section.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = section.querySelector(`#panel-${tabId}`);
    if (panel) panel.classList.add('active');
  });
});

/* ── LIVE DATE BAR ── */
function updateLiveDateBar() {
  const bar = document.getElementById('liveDateBar');
  if (!bar) return;

  const now = new Date();

  const hebrewDays = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const hebrewMonths = [
    'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
    'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
  ];

  const dayName  = hebrewDays[now.getDay()];
  const dateStr  = `${now.getDate()} ב${hebrewMonths[now.getMonth()]} ${now.getFullYear()}`;
  const timeStr  = now.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' });

  bar.innerHTML = `
    <span>📅 יום ${dayName}, ${dateStr}</span>
    &nbsp;·&nbsp;
    <span>🕐 שעה: ${timeStr}</span>
    &nbsp;·&nbsp;
    <span id="todayPrayerHint"></span>
  `;

  // dynamic hint
  const hint = document.getElementById('todayPrayerHint');
  if (hint) {
    const day = now.getDay();
    if (day === 6) hint.textContent = 'שבת שלום — שחרית שבת 08:00';
    else if (day === 5) hint.textContent = 'שישי — שחרית 06:45 · קבלת שבת בערב';
    else hint.textContent = 'שחרית 06:20 · מנחה גדולה 12:30 · מנחה קטנה 17:30 · ערבית 18:00 / 19:00 / 22:00';
  }
}
updateLiveDateBar();
setInterval(updateLiveDateBar, 60000);

/* ── SUN TIMES (approximate, Mazkeret Batya ≈ lat 31.86, lon 34.85) ── */
function calcSunTimes(date) {
  // Simple solar noon + offset approach for Israel
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / 86400000
  );

  // Approx sunrise/sunset for lat ≈ 31.86°
  // Declination in radians
  const decl = 0.409 * Math.sin((2 * Math.PI / 365) * dayOfYear - 1.39);
  const lat   = 31.86 * Math.PI / 180;
  const ha    = Math.acos(-Math.tan(lat) * Math.tan(decl));
  const haDeg = ha * 180 / Math.PI;

  // Solar noon ≈ 13:00 Israel time (UTC+2/+3)
  const offset = date.getTimezoneOffset() < -120 ? 3 : 2; // DST rough
  const noonUTC = 12 - (34.85 / 15) - (0); // equation of time ignored

  const sunriseH_UTC = noonUTC - haDeg / 15;
  const sunsetH_UTC  = noonUTC + haDeg / 15;

  const sunrise = new Date(date);
  sunrise.setUTCHours(Math.floor(sunriseH_UTC), Math.round((sunriseH_UTC % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setUTCHours(Math.floor(sunsetH_UTC), Math.round((sunsetH_UTC % 1) * 60), 0, 0);

  // Tzet hakochavim = ~18 min after sunset
  const tzet = new Date(sunset.getTime() + 18 * 60000);

  // Candle lighting = 18 min before sunset (Friday)
  const candleLighting = new Date(sunset.getTime() - 18 * 60000);

  // Havdalah = ~42 min after sunset
  const havdalah = new Date(sunset.getTime() + 42 * 60000);

  const fmt = d => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return {
    sunrise:        fmt(sunrise),
    sunset:         fmt(sunset),
    tzet:           fmt(tzet),
    candleLighting: fmt(candleLighting),
    havdalah:       fmt(havdalah),
    minchaEveningBase: sunset
  };
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateSunTimes() {
  const today  = new Date();
  const st     = calcSunTimes(today);

  setEl('netzTime',      st.sunrise);
  setEl('minchaEvening', st.sunset + ' (20 דק׳ לפני)');
  setEl('arvitTime',     st.tzet);

  // Next Friday for shabbat entry
  const friday = new Date(today);
  const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
  friday.setDate(today.getDate() + daysUntilFriday);
  const fst = calcSunTimes(friday);
  setEl('shabEntry', fst.candleLighting);
  setEl('shabExit',  fst.havdalah);
  setEl('pCandleLight', fst.candleLighting);
  setEl('pHavdalah',    fst.havdalah);

  // Shabbat parasha in weekday tab label
  const shabParashaEl = document.getElementById('shabbatParasha');
  if (shabParashaEl) {
    const pData = getParashaData();
    shabParashaEl.textContent = pData ? `פרשת ${pData.name}` : '';
  }
}
updateSunTimes();

/* ── PARASHA LOOKUP (5785 / 5786 cycle) ── */
// Parasha starts at Saturday. This covers a good portion of 5785/5786.
const PARSHIYOT = [
  // [yyyy, mm (0-based), dd, name, sefer, verse, pesukim]
  [2024,10, 2,  'בראשית',      'בראשית',   'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ', 146],
  [2024,10, 9,  'נח',           'בראשית',   'אֵלֶּה תּוֹלְדֹת נֹחַ נֹחַ אִישׁ צַדִּיק תָּמִים הָיָה בְּדֹרֹתָיו', 153],
  [2024,10,16,  'לך לך',        'בראשית',   'וַיֹּאמֶר ה׳ אֶל אַבְרָם לֶךְ לְךָ מֵאַרְצְךָ', 126],
  [2024,10,23,  'וירא',         'בראשית',   'וַיֵּרָא אֵלָיו ה׳ בְּאֵלֹנֵי מַמְרֵא', 147],
  [2024,10,30,  'חיי שרה',      'בראשית',   'וַיִּהְיוּ חַיֵּי שָׂרָה מֵאָה שָׁנָה וְעֶשְׂרִים שָׁנָה וְשֶׁבַע שָׁנִים', 105],
  [2024,11, 7,  'תולדות',       'בראשית',   'וְאֵלֶּה תּוֹלְדֹת יִצְחָק בֶּן אַבְרָהָם', 106],
  [2024,11,14,  'ויצא',         'בראשית',   'וַיֵּצֵא יַעֲקֹב מִבְּאֵר שָׁבַע וַיֵּלֶךְ חָרָנָה', 148],
  [2024,11,21,  'וישלח',        'בראשית',   'וַיִּשְׁלַח יַעֲקֹב מַלְאָכִים לְפָנָיו', 154],
  [2024,11,28,  'וישב',         'בראשית',   'וַיֵּשֶׁב יַעֲקֹב בְּאֶרֶץ מְגוּרֵי אָבִיו', 112],
  [2024,12, 5,  'מקץ',          'בראשית',   'וַיְהִי מִקֵּץ שְׁנָתַיִם יָמִים וּפַרְעֹה חֹלֵם', 146],
  [2024,12,12,  'ויגש',         'בראשית',   'וַיִּגַּשׁ אֵלָיו יְהוּדָה', 106],
  [2024,12,19,  'ויחי',         'בראשית',   'וַיְחִי יַעֲקֹב בְּאֶרֶץ מִצְרַיִם שְׁבַע עֶשְׂרֵה שָׁנָה', 85],
  [2024,12,26,  'שמות',         'שמות',     'וְאֵלֶּה שְׁמוֹת בְּנֵי יִשְׂרָאֵל הַבָּאִים מִצְרָיְמָה', 124],
  [2025, 0, 2,  'וארא',         'שמות',     'וַיְדַבֵּר אֱלֹהִים אֶל מֹשֶׁה וַיֹּאמֶר אֵלָיו אֲנִי ה׳', 121],
  [2025, 0, 9,  'בא',           'שמות',     'וַיֹּאמֶר ה׳ אֶל מֹשֶׁה בֹּא אֶל פַּרְעֹה', 105],
  [2025, 0,16,  'בשלח',         'שמות',     'וַיְהִי בְּשַׁלַּח פַּרְעֹה אֶת הָעָם', 116],
  [2025, 0,23,  'יתרו',         'שמות',     'וַיִּשְׁמַע יִתְרוֹ כֹהֵן מִדְיָן', 72],
  [2025, 0,30,  'משפטים',       'שמות',     'וְאֵלֶּה הַמִּשְׁפָּטִים אֲשֶׁר תָּשִׂים לִפְנֵיהֶם', 118],
  [2025, 1, 6,  'תרומה',        'שמות',     'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה לֵּאמֹר דַּבֵּר אֶל בְּנֵי יִשְׂרָאֵל וְיִקְחוּ לִי תְּרוּמָה', 96],
  [2025, 1,13,  'תצוה',         'שמות',     'וְאַתָּה תְּצַוֶּה אֶת בְּנֵי יִשְׂרָאֵל', 101],
  [2025, 1,20,  'כי תשא',       'שמות',     'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה לֵּאמֹר', 139],
  [2025, 1,27,  'ויקהל–פקודי',  'שמות',     'וַיַּקְהֵל מֹשֶׁה אֶת כָּל עֲדַת בְּנֵי יִשְׂרָאֵל', 122],
  [2025, 2, 6,  'ויקרא',        'ויקרא',    'וַיִּקְרָא אֶל מֹשֶׁה וַיְדַבֵּר ה׳ אֵלָיו מֵאֹהֶל מוֹעֵד', 111],
  [2025, 2,13,  'צו',           'ויקרא',    'צַו אֶת אַהֲרֹן וְאֶת בָּנָיו לֵאמֹר', 97],
  [2025, 2,20,  'שמיני',        'ויקרא',    'וַיְהִי בַּיּוֹם הַשְּׁמִינִי קָרָא מֹשֶׁה לְאַהֲרֹן', 91],
  [2025, 2,27,  'תזריע–מצורע', 'ויקרא',    'אִשָּׁה כִּי תַזְרִיעַ וְיָלְדָה זָכָר', 152],
  [2025, 3, 3,  'אחרי מות–קדושים','ויקרא', 'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה אַחֲרֵי מוֹת שְׁנֵי בְּנֵי אַהֲרֹן', 148],
  [2025, 3,10,  'אמור',         'ויקרא',    'וַיֹּאמֶר ה׳ אֶל מֹשֶׁה אֱמֹר אֶל הַכֹּהֲנִים', 124],
  [2025, 3,17,  'בהר–בחוקתי',  'ויקרא',    'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה בְּהַר סִינַי', 122],
  [2025, 3,24,  'במדבר',        'במדבר',    'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה בְּמִדְבַּר סִינַי', 159],
  [2025, 4, 1,  'נשא',          'במדבר',    'שְׂאוּ אֶת רֹאשׁ בְּנֵי גֵרְשׁוֹן', 176],
  [2025, 4, 8,  'בהעלתך',       'במדבר',    'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה לֵּאמֹר דַּבֵּר אֶל אַהֲרֹן', 136],
  [2025, 4,15,  'שלח',          'במדבר',    'שְׁלַח לְךָ אֲנָשִׁים וְיָתֻרוּ אֶת אֶרֶץ כְּנַעַן', 119],
  [2025, 4,22,  'קרח',          'במדבר',    'וַיִּקַּח קֹרַח בֶּן יִצְהָר', 95],
  [2025, 4,29,  'חקת',          'במדבר',    'זֹאת חֻקַּת הַתּוֹרָה אֲשֶׁר צִוָּה ה׳', 87],
  [2025, 5, 5,  'בלק',          'במדבר',    'וַיַּרְא בָּלָק בֶּן צִפּוֹר אֵת כָּל אֲשֶׁר עָשָׂה יִשְׂרָאֵל', 104],
  [2025, 5,12,  'פינחס',        'במדבר',    'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה לֵּאמֹר פִּינְחָס בֶּן אֶלְעָזָר', 168],
  [2025, 5,19,  'מטות–מסעי',   'במדבר',    'וַיְדַבֵּר מֹשֶׁה אֶל רָאשֵׁי הַמַּטּוֹת', 244],
  [2025, 5,26,  'דברים',        'דברים',    'אֵלֶּה הַדְּבָרִים אֲשֶׁר דִּבֶּר מֹשֶׁה', 105],
  [2025, 6, 3,  'ואתחנן',       'דברים',    'וָאֶתְחַנַּן אֶל ה׳ בָּעֵת הַהִוא', 118],
  [2025, 6,10,  'עקב',          'דברים',    'וְהָיָה עֵקֶב תִּשְׁמְעוּן אֵת הַמִּשְׁפָּטִים הָאֵלֶּה', 111],
  [2025, 6,17,  'ראה',          'דברים',    'רְאֵה אָנֹכִי נֹתֵן לִפְנֵיכֶם הַיּוֹם בְּרָכָה וּקְלָלָה', 126],
  [2025, 6,24,  'שופטים',       'דברים',    'שֹׁפְטִים וְשֹׁטְרִים תִּתֶּן לְךָ בְּכָל שְׁעָרֶיךָ', 97],
  [2025, 7, 1,  'כי תצא',       'דברים',    'כִּי תֵצֵא לַמִּלְחָמָה עַל אֹיְבֶיךָ', 110],
  [2025, 7, 8,  'כי תבוא',      'דברים',    'וְהָיָה כִּי תָבוֹא אֶל הָאָרֶץ אֲשֶׁר ה׳ אֱלֹהֶיךָ נֹתֵן לָךְ', 122],
  [2025, 7,15,  'נצבים–וילך',  'דברים',    'אַתֶּם נִצָּבִים הַיּוֹם כֻּלְּכֶם לִפְנֵי ה׳ אֱלֹהֵיכֶם', 70],
  [2025, 7,22,  'האזינו',       'דברים',    'הַאֲזִינוּ הַשָּׁמַיִם וַאֲדַבֵּרָה', 52],
  [2025, 7,29,  'וזאת הברכה',   'דברים',    'וְזֹאת הַבְּרָכָה אֲשֶׁר בֵּרַךְ מֹשֶׁה', 41],
  // repeat cycle 5786
  [2025, 9,18,  'בראשית',      'בראשית',   'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ', 146],
  [2025, 9,25,  'נח',           'בראשית',   'אֵלֶּה תּוֹלְדֹת נֹחַ נֹחַ אִישׁ צַדִּיק', 153],
  [2025,10, 1,  'לך לך',        'בראשית',   'וַיֹּאמֶר ה׳ אֶל אַבְרָם לֶךְ לְךָ מֵאַרְצְךָ', 126],
  [2025,10, 8,  'וירא',         'בראשית',   'וַיֵּרָא אֵלָיו ה׳ בְּאֵלֹנֵי מַמְרֵא', 147],
  [2025,10,15,  'חיי שרה',      'בראשית',   'וַיִּהְיוּ חַיֵּי שָׂרָה מֵאָה שָׁנָה', 105],
  [2025,10,22,  'תולדות',       'בראשית',   'וְאֵלֶּה תּוֹלְדֹת יִצְחָק בֶּן אַבְרָהָם', 106],
  [2025,10,29,  'ויצא',         'בראשית',   'וַיֵּצֵא יַעֲקֹב מִבְּאֵר שָׁבַע', 148],
  [2025,11, 6,  'וישלח',        'בראשית',   'וַיִּשְׁלַח יַעֲקֹב מַלְאָכִים לְפָנָיו', 154],
  [2025,11,13,  'וישב',         'בראשית',   'וַיֵּשֶׁב יַעֲקֹב בְּאֶרֶץ מְגוּרֵי אָבִיו', 112],
  [2025,11,20,  'מקץ',          'בראשית',   'וַיְהִי מִקֵּץ שְׁנָתַיִם יָמִים', 146],
  [2025,11,27,  'ויגש',         'בראשית',   'וַיִּגַּשׁ אֵלָיו יְהוּדָה', 106],
  [2026, 0, 3,  'ויחי',         'בראשית',   'וַיְחִי יַעֲקֹב בְּאֶרֶץ מִצְרַיִם', 85],
  [2026, 0,10,  'שמות',         'שמות',     'וְאֵלֶּה שְׁמוֹת בְּנֵי יִשְׂרָאֵל', 124],
  [2026, 0,17,  'וארא',         'שמות',     'וַיְדַבֵּר אֱלֹהִים אֶל מֹשֶׁה', 121],
  [2026, 0,24,  'בא',           'שמות',     'וַיֹּאמֶר ה׳ אֶל מֹשֶׁה בֹּא אֶל פַּרְעֹה', 105],
  [2026, 0,31,  'בשלח',         'שמות',     'וַיְהִי בְּשַׁלַּח פַּרְעֹה אֶת הָעָם', 116],
  [2026, 1, 7,  'יתרו',         'שמות',     'וַיִּשְׁמַע יִתְרוֹ כֹהֵן מִדְיָן', 72],
  [2026, 1,14,  'משפטים',       'שמות',     'וְאֵלֶּה הַמִּשְׁפָּטִים אֲשֶׁר תָּשִׂים לִפְנֵיהֶם', 118],
  [2026, 1,21,  'תרומה',        'שמות',     'וְיִקְחוּ לִי תְּרוּמָה', 96],
  [2026, 1,28,  'תצוה',         'שמות',     'וְאַתָּה תְּצַוֶּה אֶת בְּנֵי יִשְׂרָאֵל', 101],
  [2026, 2, 7,  'כי תשא',       'שמות',     'כִּי תִשָּׂא אֶת רֹאשׁ בְּנֵי יִשְׂרָאֵל', 139],
  [2026, 2,14,  'ויקהל–פקודי',  'שמות',     'וַיַּקְהֵל מֹשֶׁה אֶת כָּל עֲדַת בְּנֵי יִשְׂרָאֵל', 122],
  [2026, 2,21,  'ויקרא',        'ויקרא',    'וַיִּקְרָא אֶל מֹשֶׁה וַיְדַבֵּר ה׳ אֵלָיו', 111],
  [2026, 2,28,  'צו',           'ויקרא',    'צַו אֶת אַהֲרֹן וְאֶת בָּנָיו לֵאמֹר', 97],
  [2026, 3, 4,  'שמיני',        'ויקרא',    'וַיְהִי בַּיּוֹם הַשְּׁמִינִי', 91],
  [2026, 3,11,  'תזריע–מצורע', 'ויקרא',    'אִשָּׁה כִּי תַזְרִיעַ', 152],
  [2026, 3,18,  'אחרי מות–קדושים','ויקרא', 'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה אַחֲרֵי מוֹת', 148],
  [2026, 3,25,  'אמור',         'ויקרא',    'וַיֹּאמֶר ה׳ אֶל מֹשֶׁה אֱמֹר אֶל הַכֹּהֲנִים', 124],
  [2026, 4, 2,  'בהר–בחוקתי',  'ויקרא',    'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה בְּהַר סִינַי', 122],
  [2026, 4, 9,  'במדבר',        'במדבר',    'וַיְדַבֵּר ה׳ אֶל מֹשֶׁה בְּמִדְבַּר סִינַי', 159],
  [2026, 4,16,  'נשא',          'במדבר',    'שְׂאוּ אֶת רֹאשׁ בְּנֵי גֵרְשׁוֹן', 176],
  [2026, 4,23,  'בהעלתך',       'במדבר',    'בְּהַעֲלֹתְךָ אֶת הַנֵּרֹת', 136],
  [2026, 4,30,  'שלח',          'במדבר',    'שְׁלַח לְךָ אֲנָשִׁים וְיָתֻרוּ אֶת אֶרֶץ כְּנַעַן', 119],
  [2026, 5, 6,  'קרח',          'במדבר',    'וַיִּקַּח קֹרַח', 95],
  [2026, 5,13,  'חקת–בלק',     'במדבר',    'זֹאת חֻקַּת הַתּוֹרָה', 191],
  [2026, 5,20,  'פינחס',        'במדבר',    'פִּינְחָס בֶּן אֶלְעָזָר בֶּן אַהֲרֹן', 168],
  [2026, 5,27,  'מטות–מסעי',   'במדבר',    'וַיְדַבֵּר מֹשֶׁה אֶל רָאשֵׁי הַמַּטּוֹת', 244],
  [2026, 6, 4,  'דברים',        'דברים',    'אֵלֶּה הַדְּבָרִים אֲשֶׁר דִּבֶּר מֹשֶׁה', 105],
  [2026, 6,11,  'ואתחנן',       'דברים',    'וָאֶתְחַנַּן אֶל ה׳', 118],
  [2026, 6,18,  'עקב',          'דברים',    'וְהָיָה עֵקֶב תִּשְׁמְעוּן', 111],
  [2026, 6,25,  'ראה',          'דברים',    'רְאֵה אָנֹכִי נֹתֵן לִפְנֵיכֶם', 126],
  [2026, 7, 1,  'שופטים',       'דברים',    'שֹׁפְטִים וְשֹׁטְרִים תִּתֶּן לְךָ', 97],
  [2026, 7, 8,  'כי תצא',       'דברים',    'כִּי תֵצֵא לַמִּלְחָמָה', 110],
  [2026, 7,15,  'כי תבוא',      'דברים',    'וְהָיָה כִּי תָבוֹא אֶל הָאָרֶץ', 122],
  [2026, 7,22,  'נצבים–וילך',  'דברים',    'אַתֶּם נִצָּבִים הַיּוֹם', 70],
  [2026, 7,29,  'האזינו',       'דברים',    'הַאֲזִינוּ הַשָּׁמַיִם וַאֲדַבֵּרָה', 52],
];

function getParashaData() {
  const today  = new Date();
  // Find next Saturday
  const daysToSat = (6 - today.getDay() + 7) % 7;
  const nextSat   = new Date(today);
  nextSat.setDate(today.getDate() + daysToSat);
  const ns_y = nextSat.getFullYear();
  const ns_m = nextSat.getMonth();
  const ns_d = nextSat.getDate();

  // Find the entry closest on or before nextSat
  let best = null;
  for (const row of PARSHIYOT) {
    const [y,m,d] = row;
    const rowDate = new Date(y, m, d);
    if (rowDate <= nextSat) {
      if (!best || rowDate > new Date(best[0], best[1], best[2])) best = row;
    }
  }
  if (!best) return null;
  return { name: best[3], sefer: best[4], verse: best[5], pesukim: best[6] };
}

function updateParasha() {
  const data = getParashaData();
  if (!data) return;

  setEl('parashaName', `פרשת ${data.name}`);
  setEl('parashaBook', `ספר ${data.sefer}`);
  setEl('parashaVerse', data.verse);
  setEl('pPesukim',  data.pesukim);
  setEl('pSefer', data.sefer);
}
updateParasha();

/* ── HEBREW DATE (simple approximation) ── */
function toHebrewDateStr(date) {
  const hebrewMonthNames = [
    'תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר',
    'סיון','תמוז','אב','אלול'
  ];
  // Very rough: use Hebcal-like offset
  // Just show the approximate month based on Gregorian
  const month = date.getMonth();
  // Approximate Hebrew month (offset by ~7 months from Gregorian)
  const hebrewMonthApprox = hebrewMonthNames[(month + 6) % 12];
  const hebrewYear = date.getFullYear() + 3760 + (date.getMonth() >= 9 ? 1 : 0);
  return `${hebrewMonthApprox} ה'תשפ"${String(hebrewYear).slice(-2) > 85 ? 'ו' : 'ה'}`;
}

function updateHebrewDate() {
  const today = new Date();
  const hebStr = toHebrewDateStr(today);
  setEl('pHebrewDate', hebStr);
}
updateHebrewDate();

/* ── SCROLL REVEAL ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(
  '.tcard, .rcard, .af-item, .cd-item, .shiur-block, .parasha-main-card, .stained-glass'
).forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

/* ── SMOOTH ANCHOR SCROLL (offset for sticky nav) ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 75;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ── ACTIVE NAV HIGHLIGHT on scroll ── */
const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
const sections = document.querySelectorAll('section[id]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => {
        l.style.color = '';
        if (l.getAttribute('href') === `#${e.target.id}`) {
          l.style.color = 'var(--gold-light)';
        }
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => sectionObserver.observe(s));
