let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let editQuill = null;
let allArticles = []; 
let allLangs = []; 
let allCategories = [];
let globalTrackingConfig = { interval: 0, maxLogs: 100, sources: [], logs: [] };
let globalSettings = {};
let globalVisits = [];
let globalCrawlConfigs = []; 
let currentPage = 1;
let pageSize = 50;
let filteredVisits = [];

// 文章列表分页/筛选
let articleCurrentPage = 1;
let articlePageSize = 50;
// 采集列表分页/筛选
let crawledCurrentPage = 1;
let crawledPageSize = 50;

const COMMON_LANGUAGES = [
    { name: '简体中文', code: 'zh', flag: '🇨🇳', desc: 'ISO标准代码', iso: 'zh' },
    { name: 'English', code: 'en', flag: '🇺🇸', desc: 'ISO标准代码', iso: 'en' },
    { name: '繁體中文', code: 'tw', flag: '🇭🇰', desc: '系统映射为中文', iso: 'zh' },
    { name: '日本語', code: 'jp', flag: '🇯🇵', desc: '系统映射为日语(ja)', iso: 'ja' },
    { name: '한국어', code: 'kr', flag: '🇰🇷', desc: '系统映射为韩语(ko)', iso: 'ko' },
    { name: 'Français', code: 'fr', flag: '🇫🇷', desc: 'ISO标准代码', iso: 'fr' },
    { name: 'Deutsch', code: 'de', flag: '🇩🇪', desc: 'ISO标准代码', iso: 'de' },
    { name: 'Español', code: 'es', flag: '🇪🇸', desc: 'ISO标准代码', iso: 'es' },
    { name: 'Русский', code: 'ru', flag: '🇷🇺', desc: 'ISO标准代码', iso: 'ru' },
    { name: 'Português', code: 'pt', flag: '🇵🇹', desc: 'ISO标准代码', iso: 'pt' },
    { name: 'Italiano', code: 'it', flag: '🇮🇹', desc: 'ISO标准代码', iso: 'it' },
    { name: 'العربية', code: 'ar', flag: '🇸🇦', desc: 'ISO标准代码', iso: 'ar' },
    { name: 'Türkçe', code: 'tr', flag: '🇹🇷', desc: 'ISO标准代码', iso: 'tr' },
    { name: 'Tiếng Việt', code: 'vn', flag: '🇻🇳', desc: '系统映射为越南语(vi)', iso: 'vi' },
    { name: 'ไทย', code: 'th', flag: '🇹🇭', desc: 'ISO标准代码', iso: 'th' },
    { name: 'Bahasa Indonesia', code: 'id', flag: '🇮🇩', desc: 'ISO标准代码', iso: 'id' },
    { name: 'فارسی', code: 'fa', flag: '🇮🇷', desc: '波斯语', iso: 'fa' },
    { name: 'עברית', code: 'he', flag: '🇮🇱', desc: '希伯来语', iso: 'he' },
    { name: 'Nederlands', code: 'nl', flag: '🇳🇱', desc: '荷兰语', iso: 'nl' },
    { name: 'Polski', code: 'pl', flag: '🇵🇱', desc: '波兰语', iso: 'pl' },
    { name: 'Українська', code: 'uk', flag: '🇺🇦', desc: '乌克兰语', iso: 'uk' },
    { name: '南非语', code: 'af', flag: '🇿🇦', desc: 'Afrikaans', iso: 'af' },
    { name: '阿尔巴尼亚语', code: 'sq', flag: '🇦🇱', desc: 'Albanian', iso: 'sq' },
    { name: '阿姆哈拉语', code: 'am', flag: '🇪🇹', desc: 'Amharic', iso: 'am' },
    { name: '亚美尼亚语', code: 'hy', flag: '🇦🇲', desc: 'Armenian', iso: 'hy' },
    { name: '阿塞拜疆语', code: 'az', flag: '🇦🇿', desc: 'Azerbaijani', iso: 'az' },
    { name: '巴斯克语', code: 'eu', flag: '🇪🇸', desc: 'Basque', iso: 'eu' },
    { name: '白俄罗斯语', code: 'be', flag: '🇧🇾', desc: 'Belarusian', iso: 'be' },
    { name: '孟加拉语', code: 'bn', flag: '🇧🇩', desc: 'Bengali', iso: 'bn' },
    { name: '波斯尼亚语', code: 'bs', flag: '🇧🇦', desc: 'Bosnian', iso: 'bs' },
    { name: '保加利亚语', code: 'bg', flag: '🇧🇬', desc: 'Bulgarian', iso: 'bg' },
    { name: '缅甸语', code: 'my', flag: '🇲🇲', desc: 'Burmese', iso: 'my' },
    { name: '加泰罗尼亚语', code: 'ca', flag: '🇦🇩', desc: 'Catalan', iso: 'ca' },
    { name: '宿务语', code: 'ceb', flag: '🇵🇭', desc: 'Cebuano', iso: 'ceb' },
    { name: '克罗地亚语', code: 'hr', flag: '🇭🇷', desc: 'Croatian', iso: 'hr' },
    { name: '捷克语', code: 'cs', flag: '🇨🇿', desc: 'Czech', iso: 'cs' },
    { name: '丹麦语', code: 'da', flag: '🇩🇰', desc: 'Danish', iso: 'da' },
    { name: '爱沙尼亚语', code: 'et', flag: '🇪🇪', desc: 'Estonian', iso: 'et' },
    { name: '芬兰语', code: 'fi', flag: '🇫🇮', desc: 'Finnish', iso: 'fi' },
    { name: '加利西亚语', code: 'gl', flag: '🇪🇸', desc: 'Galician', iso: 'gl' },
    { name: '格鲁吉亚语', code: 'ka', flag: '🇬🇪', desc: 'Georgian', iso: 'ka' },
    { name: '希腊语', code: 'el', flag: '🇬🇷', desc: 'Greek', iso: 'el' },
    { name: '古吉拉特语', code: 'gu', flag: '🇮🇳', desc: 'Gujarati', iso: 'gu' },
    { name: '印地语', code: 'hi', flag: '🇮🇳', desc: 'Hindi', iso: 'hi' },
    { name: '匈牙利语', code: 'hu', flag: '🇭🇺', desc: 'Hungarian', iso: 'hu' },
    { name: '冰岛语', code: 'is', flag: '🇮🇸', desc: 'Icelandic', iso: 'is' },
    { name: '爱尔兰语', code: 'ga', flag: '🇮🇪', desc: 'Irish', iso: 'ga' },
    { name: '卡纳达语', code: 'kn', flag: '🇮🇳', desc: 'Kannada', iso: 'kn' },
    { name: '哈萨克语', code: 'kk', flag: '🇰🇿', desc: 'Kazakh', iso: 'kk' },
    { name: '高棉语', code: 'km', flag: '🇰🇭', desc: 'Khmer', iso: 'km' },
    { name: '老挝语', code: 'lo', flag: '🇱🇦', desc: 'Lao', iso: 'lo' },
    { name: '拉脱维亚语', code: 'lv', flag: '🇱🇻', desc: 'Latvian', iso: 'lv' },
    { name: '立陶宛语', code: 'lt', flag: '🇱🇹', desc: 'Lithuanian', iso: 'lt' },
    { name: '马来语', code: 'ms', flag: '🇲🇾', desc: 'Malay', iso: 'ms' },
    { name: '马拉雅拉姆语', code: 'ml', flag: '🇮🇳', desc: 'Malayalam', iso: 'ml' },
    { name: '马耳他语', code: 'mt', flag: '🇲🇹', desc: 'Maltese', iso: 'mt' },
    { name: '马拉地语', code: 'mr', flag: '🇮🇳', desc: 'Marathi', iso: 'mr' },
    { name: '蒙古语', code: 'mn', flag: '🇲🇳', desc: 'Mongolian', iso: 'mn' },
    { name: '尼泊尔语', code: 'ne', flag: '🇳🇵', desc: 'Nepali', iso: 'ne' },
    { name: '书面挪威语', code: 'nb', flag: '🇳🇴', desc: 'Norwegian', iso: 'nb' },
    { name: '旁遮普语', code: 'pa', flag: '🇮🇳', desc: 'Punjabi', iso: 'pa' },
    { name: '罗马尼亚语', code: 'ro', flag: '🇷🇴', desc: 'Romanian', iso: 'ro' },
    { name: '塞尔维亚语', code: 'sr', flag: '🇷🇸', desc: 'Serbian', iso: 'sr' },
    { name: '斯洛伐克语', code: 'sk', flag: '🇸🇰', desc: 'Slovak', iso: 'sk' },
    { name: '斯洛文尼亚语', code: 'sl', flag: '🇸🇮', desc: 'Slovenian', iso: 'sl' },
    { name: '索马里语', code: 'so', flag: '🇸🇴', desc: 'Somali', iso: 'so' },
    { name: '斯瓦希里语', code: 'sw', flag: '🇰🇪', desc: 'Swahili', iso: 'sw' },
    { name: '瑞典语', code: 'sv', flag: '🇸🇪', desc: 'Swedish', iso: 'sv' },
    { name: '他加禄语', code: 'tl', flag: '🇵🇭', desc: 'Tagalog', iso: 'tl' },
    { name: '泰米尔语', code: 'ta', flag: '🇮🇳', desc: 'Tamil', iso: 'ta' },
    { name: '泰卢固语', code: 'te', flag: '🇮🇳', desc: 'Telugu', iso: 'te' },
    { name: '乌尔都语', code: 'ur', flag: '🇵🇰', desc: 'Urdu', iso: 'ur' },
    { name: '乌兹别克语', code: 'uz', flag: '🇺🇿', desc: 'Uzbek', iso: 'uz' },
    { name: '威尔士语', code: 'cy', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', desc: 'Welsh', iso: 'cy' }
];

document.addEventListener('DOMContentLoaded', () => {
    const t = localStorage.getItem('wad_theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light'); 
    document.documentElement.classList.add(t);
    
    if (sessionStorage.getItem('wad_admin_pwd')) fetchData();
    if(document.getElementById('editor-container')) quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    if(document.getElementById('edit-editor-container')) editQuill = new Quill('#edit-editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    
    const sizeSelect = document.getElementById('pageSizeSelect');
    if(sizeSelect) pageSize = parseInt(sizeSelect.value) || 50;

    bindUploadEvents();
    initLangCodeTable();
    injectArticleFilters();
    injectPaginationContainers();
    ensureCoverPreview();
});

function bindUploadEvents() {
    document.getElementById('artCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try { const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData }); const data = await res.json(); if (data.url) { document.getElementById('artCoverUrl').value = data.url; updateCoverPreview('artCoverUrl', 'artCoverPreview'); } } catch (err) {}
    });
    document.getElementById('editArtCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try { const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData }); const data = await res.json(); if (data.url) { document.getElementById('editArtCoverUrl').value = data.url; updateCoverPreview('editArtCoverUrl', 'editArtCoverPreview'); } } catch (err) {}
    });
    // 新增网站 LOGO 上传
    document.getElementById('siteLogoFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try { 
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData }); 
            const data = await res.json(); 
            if (data.url) { document.getElementById('siteLogoUrl').value = data.url; } 
        } catch (err) { alert('LOGO 上传失败'); }
    });
}

function updateCoverPreview(inputId, imgId) {
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    if (!input || !img) return;
    if (input.value) { img.src = input.value; img.style.display = 'block'; } 
    else { img.style.display = 'none'; }
}

function ensureCoverPreview() {
    const artUrl = document.getElementById('artCoverUrl');
    if (artUrl && !document.getElementById('artCoverPreview')) {
        const img = document.createElement('img');
        img.id = 'artCoverPreview';
        img.style.cssText = 'max-width:100px;max-height:100px;border-radius:4px;margin-top:6px;display:none;border:1px solid var(--cms-border);';
        artUrl.parentElement.appendChild(img);
        artUrl.addEventListener('change', () => updateCoverPreview('artCoverUrl', 'artCoverPreview'));
        setInterval(() => updateCoverPreview('artCoverUrl', 'artCoverPreview'), 1000);
    }
    const editUrl = document.getElementById('editArtCoverUrl');
    if (editUrl && !document.getElementById('editArtCoverPreview')) {
        const img = document.createElement('img');
        img.id = 'editArtCoverPreview';
        img.style.cssText = 'max-width:100px;max-height:100px;border-radius:4px;margin-top:6px;display:none;border:1px solid var(--cms-border);';
        editUrl.parentElement.appendChild(img);
        editUrl.addEventListener('change', () => updateCoverPreview('editArtCoverUrl', 'editArtCoverPreview'));
        setInterval(() => updateCoverPreview('editArtCoverUrl', 'editArtCoverPreview'), 1000);
    }
}

function injectArticleFilters() {
    const artBtnGroup = document.querySelector('#tab-articles .flex.flex-wrap.justify-between.items-center.mb-4.gap-2 .flex.items-center.gap-2');
    if (!artBtnGroup || document.getElementById('artFilterStartDate')) return;
    const startInput = document.createElement('input');
    startInput.type = 'date'; startInput.id = 'artFilterStartDate'; startInput.className = 'input p-1.5 w-auto';
    startInput.onchange = () => { articleCurrentPage = 1; renderArticlesList(); };
    const span = document.createElement('span'); span.textContent = '至'; span.className = 'text-xs';
    const endInput = document.createElement('input');
    endInput.type = 'date'; endInput.id = 'artFilterEndDate'; endInput.className = 'input p-1.5 w-auto';
    endInput.onchange = () => { articleCurrentPage = 1; renderArticlesList(); };
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置';
    resetBtn.className = 'bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold';
    resetBtn.onclick = () => { 
        document.getElementById('artFilterStartDate').value = ''; 
        document.getElementById('artFilterEndDate').value = ''; 
        articleCurrentPage = 1; 
        renderArticlesList(); 
    };
    artBtnGroup.prepend(resetBtn);
    artBtnGroup.prepend(endInput);
    artBtnGroup.prepend(span);
    artBtnGroup.prepend(startInput);
}

function injectPaginationContainers() {
    ['articleList', 'crawledArticleList'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !document.getElementById(id + 'Pagination')) {
            const div = document.createElement('div');
            div.id = id + 'Pagination';
            div.className = 'flex justify-between items-center mt-4 text-sm';
            el.after(div);
        }
    });
}

async function doLogin() {
    adminPwd = document.getElementById('adminPwd').value;
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return alert('密码错误');
    sessionStorage.setItem('wad_admin_pwd', adminPwd);
    document.getElementById('loginOverlay').style.display = 'none';
    fetchData();
}
function logout() { sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }
function toggleTheme() { const html = document.documentElement; html.classList.toggle('dark'); html.classList.toggle('light'); localStorage.setItem('wad_theme', html.classList.contains('dark') ? 'dark' : 'light'); }
function toggleAdminLang() { /* 略 */ }

function switchTab(tabId, el) {
    document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    el.classList.add('active'); document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('pageTitle').innerText = el.innerText.trim().substring(2);
    if (tabId === 'translogs') { loadTranslationLogs(); }
    if (tabId === 'crawl') renderCrawledArticles();
    if (tabId === 'settings') { loadDeepLUsage('sys'); }
}

function initLangCodeTable() {
    const tbody = document.getElementById('langCodeTableBody');
    if (!tbody) return;
    tbody.innerHTML = COMMON_LANGUAGES.map(l => `
        <tr onclick="fillLangInputs('${l.code}', '${l.name}', '${l.flag}')">
            <td class="p-3 font-bold">${l.name}</td>
            <td class="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">${l.code}</td>
            <td class="p-3 text-lg">${l.flag}</td>
            <td class="p-3 text-gray-500 text-xs">${l.desc}</td>
        </tr>
    `).join('');
}

function showLangCodeTable() { document.getElementById('langCodeModal').classList.add('active'); }

function fillLangInputs(code, name, flag) {
    document.getElementById('newLangCode').value = code;
    document.getElementById('newLangName').value = name;
    document.getElementById('newLangFlag').value = flag;
    document.getElementById('langCodeModal').classList.remove('active');
}

async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles || []; 
    allLangs = data.languages || []; 
    allCategories = data.categories || [];
    globalTrackingConfig = data.tracking || { interval: 0, maxLogs: 100, sources: [], logs: [] };
    globalSettings = data.settings || {}; 
    globalVisits = data.visits || [];
    const crawl = data.crawl || {};

    if(document.getElementById('artType')) document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name_zh}</option>`).join('');
    if(document.getElementById('categoryList')) {
        document.getElementById('categoryList').innerHTML = allCategories.map(c => `<tr><td>${c.id}</td><td>${c.name_zh}</td><td>${c.name_en}</td><td><button onclick="openEditCategory('${c.id}')" class="text-blue-500 mr-2">编辑</button><button onclick="deleteCategory('${c.id}')" class="text-red-500">删除</button></td></tr>`).join('');
    }

    renderLangCheckboxes(); // 渲染翻译语言状态

    // 系统基础配置回显
    if(document.getElementById('toolDescZh')) {
        document.getElementById('toolDescZh').value = (globalSettings.toolDesc && globalSettings.toolDesc.zh) ? globalSettings.toolDesc.zh : '';
        document.getElementById('checkWaitTime').value = globalSettings.checkWaitTime || 5;
        document.getElementById('deeplKey1').value = globalSettings.deeplKey1 || '';
        document.getElementById('deeplKey2').value = globalSettings.deeplKey2 || '';
        document.getElementById('autoLangSwitch').checked = globalSettings.autoLang !== false;
        if(document.getElementById('tab-settings').classList.contains('active')) loadDeepLUsage('sys');
    }

    // 回显网站基础信息
    if(document.getElementById('siteTitleZh')) {
        document.getElementById('siteTitleZh').value = (globalSettings.siteTitle && globalSettings.siteTitle.zh) ? globalSettings.siteTitle.zh : '';
        document.getElementById('siteDescZh').value = (globalSettings.siteDesc && globalSettings.siteDesc.zh) ? globalSettings.siteDesc.zh : '';
        document.getElementById('siteLogoUrl').value = globalSettings.siteLogo || '';
        document.getElementById('enableAddressCheck').checked = globalSettings.enableAddressCheck !== false;
    }

    renderLanguages();

    if(document.getElementById('crawlEnabled')) {
        document.getElementById('crawlEnabled').checked = crawl.enabled || false;
        document.getElementById('crawlInterval').value = crawl.interval || 30;
        globalCrawlConfigs = crawl.configs || []; 
        renderCrawlSourcesList(globalCrawlConfigs);
    }

    if(document.getElementById('trackingInterval')) {
        document.getElementById('trackingInterval').value = globalTrackingConfig.interval || 0;
        document.getElementById('trackingMaxLogs').value = globalTrackingConfig.maxLogs || 100;
    }
    renderSources();
    renderTrackingLogs();
    renderArticlesList();
    renderCrawledArticles();

    populateFilterOptions();
    calculateStats();
    applyFilters();
}

// 渲染语言勾选，区分已翻译和未翻译
function renderLangCheckboxes() {
    const activeLangs = allLangs.filter(l => l.active);
    
    // 1. 文章发布语言（全量多选）
    const artLangsDiv = document.getElementById('articleLangCheckboxes');
    if (artLangsDiv) artLangsDiv.innerHTML = activeLangs.map(l => `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 transition"><input type="checkbox" value="${l.code}" class="accent-blue-600"> ${l.flag} ${l.name}</label>`).join('');

    // 2. 工具描述语言
    const toolLangsDiv = document.getElementById('toolDescLangCheckboxes');
    if (toolLangsDiv) toolLangsDiv.innerHTML = generateGroupedLangCheckboxes(globalSettings.toolDesc, 'tool-desc-lang-cb');

    // 3. 网站基础信息语言
    const siteLangsDiv = document.getElementById('siteInfoLangCheckboxes');
    if (siteLangsDiv) siteLangsDiv.innerHTML = generateGroupedLangCheckboxes(globalSettings.siteTitle, 'site-info-lang-cb');
}

function generateGroupedLangCheckboxes(translatedData, checkboxClass) {
    const activeLangs = allLangs.filter(l => l.active);
    const translated = [];
    const untranslated = [];
    
    activeLangs.forEach(l => {
        const isZh = l.code === 'zh';
        const isTranslated = translatedData && translatedData[l.code];
        
        const checked = isZh || isTranslated ? 'checked' : '';
        const disabled = isZh ? 'disabled' : '';
        
        const html = `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 transition"><input type="checkbox" value="${l.code}" class="${checkboxClass} accent-blue-600" ${checked} ${disabled}> ${l.flag} ${l.name}</label>`;
        
        if (isZh || isTranslated) translated.push(html);
        else untranslated.push(html);
    });

    let result = '';
    if (translated.length > 0) {
        result += `<div class="w-full mb-3"><div class="text-xs text-green-500 font-bold mb-2 border-b border-green-500/30 pb-1">✅ 已翻译 (勾选可重新翻译)</div><div class="flex flex-wrap gap-2">${translated.join('')}</div></div>`;
    }
    if (untranslated.length > 0) {
        result += `<div class="w-full"><div class="text-xs text-gray-400 font-bold mb-2 border-b border-gray-500/30 pb-1">⬜ 未翻译 (勾选生成翻译)</div><div class="flex flex-wrap gap-2">${untranslated.join('')}</div></div>`;
    }
    return result;
}

// 保存网站基础设置
async function saveSiteInfo() {
    const btn = document.querySelector('#tab-settings button[onclick="saveSiteInfo()"]');
    const siteTitleZh = document.getElementById('siteTitleZh').value;
    const siteDescZh = document.getElementById('siteDescZh').value;
    const siteLogo = document.getElementById('siteLogoUrl').value;
    const checkedLangs = Array.from(document.querySelectorAll('.site-info-lang-cb:checked')).map(cb => cb.value);

    if (!siteTitleZh) return alert('请输入网站标题');

    const old = btn.innerText; btn.innerText = '翻译并保存中...'; btn.disabled = true;
    try {
        const body = { siteTitleZh, siteDescZh, siteLogo, targetLangs: checkedLangs };
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify(body) });
        if (res.ok) {
            alert('基础设置已保存并更新多语言配置！');
            fetchData();
        } else {
            const data = await res.json();
            alert('保存失败: ' + (data.error || '未知错误'));
        }
    } catch(e) {
        alert('网络错误');
    } finally {
        btn.innerText = old; btn.disabled = false;
    }
}

async function saveToolDesc() {
    const btn = document.querySelector('#tab-settings button[onclick="saveToolDesc()"]');
    const toolDescZh = document.getElementById('toolDescZh').value;
    if (!toolDescZh) return alert('请输入中文描述文本');

    const checkedLangs = Array.from(document.querySelectorAll('.tool-desc-lang-cb:checked')).map(cb => cb.value);
    const old = btn.innerText; btn.innerText = '翻译并保存中...'; btn.disabled = true;
    try {
        const body = { toolDescZh, targetLangs: checkedLangs };
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify(body) });
        if (res.ok) { alert('描述已保存！'); fetchData(); } 
        else { const data = await res.json(); alert('保存失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function saveSettings() {
    const deeplKey1 = document.getElementById('deeplKey1').value; 
    const deeplKey2 = document.getElementById('deeplKey2').value; 
    const autoLang = document.getElementById('autoLangSwitch').checked; 
    const checkWaitTime = parseInt(document.getElementById('checkWaitTime').value) || 5;
    const enableAddressCheck = document.getElementById('enableAddressCheck').checked;

    const btn = document.querySelector('#tab-settings button[onclick="saveSettings()"]');
    const old = btn.innerText; btn.innerText = '保存中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ deeplKey1, deeplKey2, autoLang, checkWaitTime, enableAddressCheck }) });
        if (res.ok) { alert('系统配置已保存！'); fetchData(); loadDeepLUsage('sys'); } else { const data = await res.json(); alert('保存失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function toggleLangStatus(code, currentActive) {
    await fetch(`/api/admin/languages/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ active: !currentActive }) });
    fetchData(); 
}

async function deleteLanguage(code) {
    if (!confirm('确认删除该语言？删除后该语言的文章和字典将无法访问。')) return;
    await fetch(`/api/admin/languages/${code}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

async function autoTranslateDict(code, btn) {
    if(!confirm(`确定要使用 DeepL API 将基础字典翻译成 [${code}] 国家的语言吗？`)) return;
    const old = btn.innerText; btn.innerText = '翻译中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/languages/translate-dict', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ targetLang: code }) });
        const data = await res.json(); 
        if (res.ok && data.success) { alert('字典已通过 DeepL 翻译成功！'); fetchData(); } 
        else { alert('翻译失败: \n' + (data.error || '未知错误')); }
    } catch(e) { alert('网络请求失败: ' + e.message); } finally { btn.innerText = old; btn.disabled = false; }
}

async function loadDeepLUsage(type = 'sys') {
    let keyToCheck = '';
    if (type === 'sys') keyToCheck = (document.getElementById('deeplKey1')?.value || '').trim();
    else if (type === 'translog') keyToCheck = globalSettings.deeplKey1 || '';
    
    if (!keyToCheck) {
        const targetId = type === 'sys' ? 'deeplUsageSys' : 'translogUsageText';
        const el = document.getElementById(targetId);
        if(el) el.innerHTML = '<span class="text-red-500">未配置主 API Key</span>';
        return;
    }

    try {
        const res = await fetch(`/api/admin/deepl/usage?key=${encodeURIComponent(keyToCheck)}`, { headers: { 'x-admin-pwd': adminPwd } });
        const data = await res.json();
        
        if (data.success) {
            const used = data.character_count;
            const total = data.character_limit;
            const remain = Math.max(0, total - used);
            const percent = total > 0 ? ((used / total) * 100).toFixed(1) : 0;
            const barColor = percent > 80 ? 'bg-red-500' : (percent > 50 ? 'bg-yellow-500' : 'bg-green-500');

            if (type === 'sys') {
                const el = document.getElementById('deeplUsageSys');
                if(el) el.innerHTML = `
                    <div class="flex justify-between mb-1"><span>已用: ${used.toLocaleString()}</span><span>总量: ${total.toLocaleString()}</span></div>
                    <div class="w-full bg-gray-200 rounded-full h-2"><div class="${barColor} h-2 rounded-full" style="width: ${percent}%"></div></div>
                    <div class="text-right mt-1 text-gray-400">剩余 ${remain.toLocaleString()} (${(100 - percent).toFixed(1)}%)</div>
                `;
            } else {
                const txtEl = document.getElementById('translogUsageText');
                const barEl = document.getElementById('translogUsageBar');
                if(txtEl) txtEl.innerHTML = `当前主 Key 额度: 已用 ${used.toLocaleString()} / 总量 ${total.toLocaleString()} (剩余 ${(100 - percent).toFixed(1)}%)`;
                if(barEl) { barEl.style.width = `${percent}%`; barEl.className = `${barColor} h-2.5 rounded-full transition-all duration-500`; }
            }
        } else {
            const targetId = type === 'sys' ? 'deeplUsageSys' : 'translogUsageText';
            const el = document.getElementById(targetId);
            if(el) el.innerHTML = `<span class="text-red-500">${data.error}</span>`;
        }
    } catch (e) {
        const targetId = type === 'sys' ? 'deeplUsageSys' : 'translogUsageText';
        const el = document.getElementById(targetId);
        if(el) el.innerHTML = `<span class="text-red-500">网络请求失败</span>`;
    }
}

async function loadTranslationLogs() {
    const startDate = document.getElementById('translogStartDate').value;
    const endDate = document.getElementById('translogEndDate').value;
    const keyword = document.getElementById('translogSearch').value;
    let url = '/api/admin/translation-logs?';
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;

    const res = await fetch(url, { headers: { 'x-admin-pwd': adminPwd } }); 
    const data = await res.json();
    
    if(document.getElementById('logTotalCount')) {
        document.getElementById('logTotalCount').innerText = data.totalCount; 
        document.getElementById('logTotalChars').innerText = data.totalChars;
        document.getElementById('translationLogList').innerHTML = data.logs.map(l => `
            <tr class="border-b hover:bg-gray-50 dark:hover:bg-slate-800">
                <td class="p-3">${new Date(l.time).toLocaleString()}</td>
                <td class="p-3 font-mono text-xs">${l.keyName || '未知'}</td>
                <td class="p-3">${l.targetLang}</td>
                <td class="p-3 text-green-500 font-bold">${l.chars}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="text-center py-6 text-gray-500">暂无记录</td></tr>';
    }
    loadDeepLUsage('translog');
}

function resetTransLogFilters() {
    document.getElementById('translogStartDate').value = '';
    document.getElementById('translogEndDate').value = '';
    document.getElementById('translogSearch').value = '';
    loadTranslationLogs();
}

function populateFilterOptions() {
    const fields = [ { elId: 'filterDevice', prop: 'device' }, { elId: 'filterCountry', prop: 'country' }, { elId: 'filterOS', prop: 'os' }, { elId: 'filterBrowser', prop: 'browser' }, { elId: 'filterLang', prop: 'lang' } ];
    fields.forEach(f => {
        const el = document.getElementById(f.elId); if (!el) return;
        const defaultOption = el.options[0].outerHTML;
        const uniqueValues = [...new Set(globalVisits.map(v => v[f.prop]).filter(v => v))];
        let html = defaultOption; uniqueValues.forEach(val => { html += `<option value="${val}">${val}</option>`; });
        el.innerHTML = html;
    });
}

function renderCrawlSourcesList(configs) {
    const list = document.getElementById('crawlSourceList'); if (!list) return;
    if (configs.length === 0) { list.innerHTML = '<div class="text-center py-6 text-gray-500 border rounded border-dashed" style="border-color: var(--cms-border);">暂无采集源</div>'; return; }
    list.innerHTML = configs.map((c, idx) => {
        const activeLangIcons = (c.targetLangs || []).map(code => { const lang = allLangs.find(l => l.code === code); return lang ? lang.flag : code; }).join(' ');
        return `
        <div class="border p-4 rounded-lg mb-3 flex flex-col gap-3" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);">
            <div class="flex justify-between items-start">
                <div class="flex gap-3">
                    ${c.image ? `<img src="${c.image}" class="w-10 h-10 rounded object-cover border" style="border-color: var(--cms-border);" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjZGRkIi8+PC9zdmc+'">` : `<div class="w-10 h-10 rounded bg-gray-200 border flex items-center justify-center text-gray-400" style="border-color: var(--cms-border);"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`}
                    <div>
                        <div class="font-bold text-sm flex items-center gap-2">${c.name} <span class="text-xs text-red-500 font-bold bg-red-50 px-1.5 rounded">独立条数: ${c.limit || 10}</span></div>
                        <div class="text-xs text-gray-500 font-mono mt-1 truncate" style="max-width: 250px;">${c.url}</div>
                        <div class="text-xs text-blue-500 font-bold mt-1">翻译目标: ${activeLangIcons || '未配置'}</div>
                        <label class="flex items-center gap-1 mt-2 cursor-pointer"><input type="checkbox" onchange="toggleSourceAuto('${c.id}', this.checked)" ${c.autoEnabled ? 'checked' : ''} class="w-4 h-4 accent-blue-600 cursor-pointer"><span class="text-xs text-gray-600 dark:text-gray-400">独立自动采集</span></label>
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-2 border-t pt-2 mt-1" style="border-color: var(--cms-border);">
                <button onclick="crawlSingleSource('${c.id}', this)" class="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded text-xs font-bold transition">▶ 立刻采集此源</button>
                <button onclick="editCrawlSource(${idx})" class="text-blue-500 hover:bg-blue-50 px-3 py-1 rounded text-xs transition">编辑配置</button>
                <button onclick="deleteCrawlSource(${idx})" class="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-xs transition">删除</button>
            </div>
        </div>`;
    }).join('');
}

async function crawlSingleSource(configId, btnEl) {
    const oldText = btnEl.innerText; btnEl.innerText = '采集中...'; btnEl.disabled = true;
    try {
        const res = await fetch('/api/admin/crawl/now', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ configId }) });
        const data = await res.json();
        if (data.success) { alert(`该源采集成功！新增 ${data.count} 篇 ${data.failCount > 0 ? `(其中 ${data.failCount} 篇翻译失败)` : ''}`); fetchData(); } 
        else { alert('采集失败: ' + (data.error || '未知错误')); }
    } catch (e) { alert('网络错误: ' + e.message); } finally { btnEl.innerText = oldText; btnEl.disabled = false; }
}

async function toggleSourceAuto(id, isChecked) {
    await fetch(`/api/admin/crawl/source/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ autoEnabled: isChecked }) });
    const target = globalCrawlConfigs.find(c => c.id === id); if (target) target.autoEnabled = isChecked;
}

function ensureCrawlImageUploader() {
    const input = document.getElementById('crawlSourceImage');
    if (!input || document.getElementById('crawlSourceImageFile')) return;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'crawlSourceImageFile';
    fileInput.accept = 'image/*';
    fileInput.className = 'input text-sm mt-1';
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData(); fd.append('image', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: fd });
            const data = await res.json();
            if (data.url) { input.value = data.url; alert('图片上传成功'); }
        } catch(err) { alert('上传失败'); }
    });
    input.after(fileInput);
}

function openCrawlSourceModal() {
    ensureCrawlImageUploader();
    document.getElementById('crawlSourceId').value = ''; 
    document.getElementById('crawlSourceName').value = ''; 
    document.getElementById('crawlSourceUrl').value = ''; 
    document.getElementById('crawlSourceImage').value = ''; 
    document.getElementById('crawlSourceLimit').value = '10'; 
    document.getElementById('crawlModalTitle').innerText = '添加采集源';
    
    document.getElementById('crawlTargetLangCheckboxes').innerHTML = allLangs.filter(l=>l.active).map(l => `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 transition"><input type="checkbox" value="${l.code}" class="crawl-target-lang-cb accent-blue-600"> ${l.flag} ${l.name}</label>`).join('');
    
    document.getElementById('crawlSourceMapping').value = JSON.stringify({ 
        "title": "title", 
        "summary": "description", 
        "content": "content:encoded", 
        "author": "author", 
        "time": "pubDate", 
        "type": "hack",
        "coverUrl": "enclosure.url" 
    }, null, 2);
    
    document.getElementById('crawlSourceModal').classList.add('active');
}

function editCrawlSource(index) {
    ensureCrawlImageUploader();
    const c = globalCrawlConfigs[index]; if (!c) return;
    document.getElementById('crawlSourceId').value = c.id; document.getElementById('crawlSourceName').value = c.name; document.getElementById('crawlSourceUrl').value = c.url; document.getElementById('crawlSourceImage').value = c.image || ''; document.getElementById('crawlSourceLimit').value = c.limit || 10; document.getElementById('crawlModalTitle').innerText = '编辑采集源';
    document.getElementById('crawlTargetLangCheckboxes').innerHTML = allLangs.filter(l=>l.active).map(l => { const isChecked = (c.targetLangs || []).includes(l.code) ? 'checked' : ''; return `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 transition"><input type="checkbox" value="${l.code}" class="crawl-target-lang-cb accent-blue-600" ${isChecked}> ${l.flag} ${l.name}</label>`; }).join('');
    document.getElementById('crawlSourceMapping').value = JSON.stringify(c.mapping || {}, null, 2);
    document.getElementById('crawlSourceModal').classList.add('active');
}

async function saveCrawlSource() {
    const id = document.getElementById('crawlSourceId').value; const name = document.getElementById('crawlSourceName').value.trim(); const url = document.getElementById('crawlSourceUrl').value.trim(); const image = document.getElementById('crawlSourceImage').value.trim(); const limit = parseInt(document.getElementById('crawlSourceLimit').value) || 10;
    const targetLangs = Array.from(document.querySelectorAll('.crawl-target-lang-cb:checked')).map(cb => cb.value); const mappingStr = document.getElementById('crawlSourceMapping').value;
    if (!name || !url) return alert('请填写名称和URL');
    let mapping; try { mapping = JSON.parse(mappingStr); } catch(e) { return alert('JSON 格式错误，请检查语法'); }
    const payload = { name, url, image, limit, targetLangs, mapping };
    const method = id ? 'PUT' : 'POST'; const apiUrl = id ? `/api/admin/crawl/source/${id}` : '/api/admin/crawl/source';
    try {
        const res = await fetch(apiUrl, { method, headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify(payload) });
        if (res.ok) { document.getElementById('crawlSourceModal').classList.remove('active'); fetchData(); } else { alert('保存失败！'); }
    } catch (e) { alert('网络或服务器错误: ' + e.message); }
}

async function deleteCrawlSource(index) {
    const c = globalCrawlConfigs[index]; if (!c || !confirm(`确定删除采集源【${c.name}】吗？`)) return;
    await fetch(`/api/admin/crawl/source/${c.id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData();
}

async function saveCrawlConfig() {
    const enabled = document.getElementById('crawlEnabled').checked; const interval = document.getElementById('crawlInterval').value;
    await fetch('/api/admin/crawl', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ enabled, interval }) });
    alert('自动采集设置已保存'); fetchData();
}

function renderArticlesList() {
    const listEl = document.getElementById('articleList');
    if (!listEl) return;
    const sizeSelect = document.getElementById('artPageSize');
    articlePageSize = sizeSelect ? (parseInt(sizeSelect.value) || 50) : 50;

    const start = document.getElementById('artFilterStartDate')?.value || '';
    const end = document.getElementById('artFilterEndDate')?.value || '';

    let filtered = allArticles;
    if (start || end) {
        const startTs = start ? new Date(start).getTime() : 0;
        const endTs = end ? new Date(end).getTime() + 86400000 - 1 : Infinity;
        filtered = allArticles.filter(a => {
            const t = new Date(a.time).getTime();
            return t >= startTs && t <= endTs;
        });
    }

    const groups = {};
    filtered.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    const groupList = Object.values(groups);

    groupList.sort((g1, g2) => {
        const m1 = g1.find(a => a.lang === 'zh') || g1.find(a => a.lang === 'en') || g1[0];
        const m2 = g2.find(a => a.lang === 'zh') || g2.find(a => a.lang === 'en') || g2[0];
        return new Date(m2.time) - new Date(m1.time);
    });

    const totalPages = Math.ceil(groupList.length / articlePageSize) || 1;
    if (articleCurrentPage > totalPages) articleCurrentPage = totalPages;
    if (articleCurrentPage < 1) articleCurrentPage = 1;

    const pageGroups = groupList.slice((articleCurrentPage - 1) * articlePageSize, articleCurrentPage * articlePageSize);

    let html = '';
    pageGroups.forEach(group => {
        const main = group.find(a => a.lang === 'zh') || group.find(a => a.lang === 'en') || group[0];
        const otherLangs = group.filter(a => a.lang !== main.lang);
        html += `
        <div class="border p-3 rounded flex flex-col mb-2" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);">
            <div class="flex justify-between items-center w-full">
                <div class="flex-1 min-w-0 pr-2">
                    <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mr-2 shrink-0">${allCategories.find(c=>c.id === main.type)?.name_zh || '未分类'}</span>
                    <b class="text-sm">${main.title}</b>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="editArticleGroup('${main.groupId || main.id}')" class="text-blue-500 text-xs hover:underline bg-blue-50 px-2 py-1 rounded">编辑</button>
                    <button onclick="deleteArticleGroup('${main.groupId || main.id}')" class="text-red-500 text-xs hover:underline bg-red-50 px-2 py-1 rounded">删除</button>
                </div>
            </div>
            ${otherLangs.length > 0 ? `
            <details class="mt-2 w-full">
                <summary class="text-xs text-blue-500 font-bold outline-none"><span class="arrow">▶</span> 包含 ${otherLangs.length} 个其他语言版本</summary>
                <div class="mt-2 pl-4 space-y-1">
                    ${otherLangs.map(o => `<div class="text-xs text-gray-500 flex items-center gap-2"><span class="uppercase text-[10px] bg-gray-200 px-1 rounded">${o.lang}</span> ${o.title}</div>`).join('')}
                </div>
            </details>` : ''}
        </div>`;
    });

    listEl.innerHTML = html || '<div class="text-center py-4 text-gray-500">暂无文章</div>';

    let container = document.getElementById('articleListPagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'articleListPagination';
        container.className = 'flex justify-between items-center mt-4 text-sm';
        listEl.after(container);
    }
    container.innerHTML = `
        <div class="text-gray-500">共 ${groupList.length} 组</div>
        <div class="flex items-center gap-2">
            <button onclick="changeArticlePage(-1)" ${articleCurrentPage <= 1 ? 'disabled' : ''} class="px-3 py-1 rounded border disabled:opacity-50" style="background-color: var(--cms-card); border-color: var(--cms-border); color: var(--cms-text-main);">上一页</button>
            <span class="text-gray-500 px-2">第 ${articleCurrentPage} / ${totalPages} 页</span>
            <button onclick="changeArticlePage(1)" ${articleCurrentPage >= totalPages ? 'disabled' : ''} class="px-3 py-1 rounded border disabled:opacity-50" style="background-color: var(--cms-card); border-color: var(--cms-border); color: var(--cms-text-main);">下一页</button>
        </div>
    `;
}

function changeArticlePage(delta) {
    articleCurrentPage += delta;
    renderArticlesList();
}

async function batchTranslateArticles() {
    const start = document.getElementById('artFilterStartDate')?.value || '';
    const end = document.getElementById('artFilterEndDate')?.value || '';
    const scope = (start || end) ? `日期范围 ${start || '不限'} 至 ${end || '不限'}` : '全部数据';
    if (!confirm(`将为【${scope}】内所有文章补全缺失的语言翻译（已有版本不会重复翻译），是否继续？`)) return;

    const btn = document.querySelector('button[onclick="batchTranslateArticles()"]');
    const old = btn?.innerText;
    if (btn) { btn.innerText = '翻译中...'; btn.disabled = true; }
    try {
        const body = {};
        if (start) body.startDate = start;
        if (end) body.endDate = end;
        const res = await fetch('/api/admin/articles/batch-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`批量翻译完成！处理 ${data.translatedGroups} 组，新增 ${data.addedLangs} 个语言版本。`);
            fetchData();
        } else {
            alert('翻译失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络错误: ' + e.message);
    } finally {
        if (btn) { btn.innerText = old; btn.disabled = false; }
    }
}

async function batchDeleteArticles() {
    const start = document.getElementById('artFilterStartDate')?.value || '';
    const end = document.getElementById('artFilterEndDate')?.value || '';
    const scope = (start || end) ? `日期范围 ${start || '不限'} 至 ${end || '不限'}` : '全部数据';
    const confirmText = prompt(`此操作将删除【${scope}】内所有文章组（含所有语言版本），不可恢复！\n请输入"确认删除"以继续：`);
    if (confirmText !== '确认删除') { alert('已取消'); return; }

    const btn = document.querySelector('button[onclick="batchDeleteArticles()"]');
    const old = btn?.innerText;
    if (btn) { btn.innerText = '删除中...'; btn.disabled = true; }
    try {
        const body = {};
        if (start) body.startDate = start;
        if (end) body.endDate = end;
        const res = await fetch('/api/admin/articles/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`批量删除完成！共删除 ${data.deletedCount} 篇文章。`);
            fetchData();
        } else {
            alert('删除失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络错误: ' + e.message);
    } finally {
        if (btn) { btn.innerText = old; btn.disabled = false; }
    }
}

function renderCrawledArticles() {
    const list = document.getElementById('crawledArticleList'); if (!list) return;
    const sizeSelect = document.getElementById('crawlPageSize');
    crawledPageSize = sizeSelect ? (parseInt(sizeSelect.value) || 50) : 50;
    const filterDate = document.getElementById('crawlFilterDate')?.value || '';

    let articles = allArticles.filter(a => a.lang === 'en' || a.lang === 'zh' || a.lang === 'original'); 
    if (filterDate) articles = articles.filter(a => a.time.startsWith(filterDate));
    articles.sort((a, b) => new Date(b.time) - new Date(a.time));

    const groups = {}; articles.forEach(a => { if (!groups[a.groupId]) groups[a.groupId] = []; groups[a.groupId].push(a); });
    const groupList = Object.values(groups);

    const totalPages = Math.ceil(groupList.length / crawledPageSize) || 1;
    if (crawledCurrentPage > totalPages) crawledCurrentPage = totalPages;
    if (crawledCurrentPage < 1) crawledCurrentPage = 1;

    const pageGroups = groupList.slice((crawledCurrentPage - 1) * crawledPageSize, crawledCurrentPage * crawledPageSize);

    let html = '';
    pageGroups.forEach(group => {
        const main = group.find(a => a.lang === 'original') || group.find(a => a.lang === 'en') || group[0];
        const allGroupLangs = allArticles.filter(a => a.groupId === main.groupId);
        const otherLangs = allGroupLangs.filter(a => a.lang !== main.lang);
        html += `
        <div class="border p-3 rounded flex flex-col mb-2" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);">
            <div class="flex justify-between items-center w-full">
                <div class="flex-1 min-w-0 pr-2"><span class="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded mr-2 shrink-0">已采集</span><b class="text-sm">${main.title}</b></div>
                <div class="flex gap-2 shrink-0"><button onclick="editArticleGroup('${main.groupId}')" class="text-blue-500 text-xs hover:underline bg-blue-50 px-2 py-1 rounded">编辑</button><button onclick="deleteArticleGroup('${main.groupId}')" class="text-red-500 text-xs hover:underline bg-red-50 px-2 py-1 rounded">删除</button></div>
            </div>
            ${otherLangs.length > 0 ? `<details class="mt-2 w-full"><summary class="text-xs text-blue-500 font-bold outline-none"><span class="arrow">▶</span> 包含 ${otherLangs.length} 个其他语言版本</summary><div class="mt-2 pl-4 space-y-1">${otherLangs.map(o => `<div class="text-xs text-gray-500 flex items-center gap-2"><span class="uppercase text-[10px] bg-gray-200 px-1 rounded">${o.lang}</span> ${o.title}</div>`).join('')}</div></details>` : ''}
        </div>`;
    });
    list.innerHTML = html || '<div class="text-center py-4 text-gray-500">暂无采集数据</div>';

    let container = document.getElementById('crawledArticleListPagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'crawledArticleListPagination';
        container.className = 'flex justify-between items-center mt-4 text-sm';
        list.after(container);
    }
    container.innerHTML = `
        <div class="text-gray-500">共 ${groupList.length} 组</div>
        <div class="flex items-center gap-2">
            <button onclick="changeCrawledPage(-1)" ${crawledCurrentPage <= 1 ? 'disabled' : ''} class="px-3 py-1 rounded border disabled:opacity-50" style="background-color: var(--cms-card); border-color: var(--cms-border); color: var(--cms-text-main);">上一页</button>
            <span class="text-gray-500 px-2">第 ${crawledCurrentPage} / ${totalPages} 页</span>
            <button onclick="changeCrawledPage(1)" ${crawledCurrentPage >= totalPages ? 'disabled' : ''} class="px-3 py-1 rounded border disabled:opacity-50" style="background-color: var(--cms-card); border-color: var(--cms-border); color: var(--cms-text-main);">下一页</button>
        </div>
    `;
}

function changeCrawledPage(delta) {
    crawledCurrentPage += delta;
    renderCrawledArticles();
}

async function batchTranslateCrawled() {
    const date = document.getElementById('crawlFilterDate')?.value || '';
    const scope = date ? `日期 ${date}` : '全部采集数据';
    if (!confirm(`将为【${scope}】内所有采集文章补全缺失的语言翻译（已有版本不会重复翻译），是否继续？`)) return;

    const btn = document.querySelector('button[onclick="batchTranslateCrawled()"]');
    const old = btn?.innerText;
    if (btn) { btn.innerText = '翻译中...'; btn.disabled = true; }
    try {
        const body = date ? { startDate: date, endDate: date } : {};
        const res = await fetch('/api/admin/articles/batch-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`批量翻译完成！处理 ${data.translatedGroups} 组，新增 ${data.addedLangs} 个语言版本。`);
            fetchData();
        } else {
            alert('翻译失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络错误: ' + e.message);
    } finally {
        if (btn) { btn.innerText = old; btn.disabled = false; }
    }
}

async function batchDeleteCrawled() {
    const date = document.getElementById('crawlFilterDate')?.value || '';
    const scope = date ? `日期 ${date}` : '全部采集数据';
    const confirmText = prompt(`此操作将删除【${scope}】内所有文章组（含所有语言版本），不可恢复！\n请输入"确认删除"以继续：`);
    if (confirmText !== '确认删除') { alert('已取消'); return; }

    const btn = document.querySelector('button[onclick="batchDeleteCrawled()"]');
    const old = btn?.innerText;
    if (btn) { btn.innerText = '删除中...'; btn.disabled = true; }
    try {
        const body = date ? { startDate: date, endDate: date } : {};
        const res = await fetch('/api/admin/articles/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`批量删除完成！共删除 ${data.deletedCount} 篇文章。`);
            fetchData();
        } else {
            alert('删除失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络错误: ' + e.message);
    } finally {
        if (btn) { btn.innerText = old; btn.disabled = false; }
    }
}

function calculateStats() {
    const total = globalVisits.length; const submitted = globalVisits.filter(v => v.address && v.address.trim() !== '').length; const unsubmitted = total - submitted; const android = globalVisits.filter(v => v.os === 'Android').length; const ios = globalVisits.filter(v => v.os === 'iOS').length; const desktop = globalVisits.filter(v => v.device === '桌面').length;
    if(document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total; if(document.getElementById('statSubmitted')) document.getElementById('statSubmitted').innerText = submitted; if(document.getElementById('statUnsubmitted')) document.getElementById('statUnsubmitted').innerText = unsubmitted; if(document.getElementById('statAndroid')) document.getElementById('statAndroid').innerText = android; if(document.getElementById('statIos')) document.getElementById('statIos').innerText = ios; if(document.getElementById('statDesktop')) document.getElementById('statDesktop').innerText = desktop;
}

function toggleDateInputs() {
    const type = document.getElementById('filterDateType').value; const customInputs = document.getElementById('customDateInputs');
    if (type === 'custom') { customInputs.classList.remove('hidden'); customInputs.classList.add('flex'); } else { customInputs.classList.add('hidden'); customInputs.classList.remove('flex'); }
    applyFilters();
}

function applyFilters() {
    if (!document.getElementById('filterDevice')) return;
    const dateType = document.getElementById('filterDateType').value; const startDateStr = document.getElementById('filterStartDate').value; const endDateStr = document.getElementById('filterEndDate').value; const device = document.getElementById('filterDevice').value; const country = document.getElementById('filterCountry').value; const os = document.getElementById('filterOS').value; const browser = document.getElementById('filterBrowser').value; const lang = document.getElementById('filterLang').value; const keyword = document.getElementById('searchInput').value.toLowerCase();
    const now = new Date(); let filterStart = null, filterEnd = null;
    if (dateType === 'today') filterStart = new Date(now.setHours(0,0,0,0)); else if (dateType === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); filterStart = new Date(y.setHours(0,0,0,0)); filterEnd = new Date(y.setHours(23,59,59,999)); } else if (dateType === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); filterStart = new Date(w.setHours(0,0,0,0)); } else if (dateType === 'month') { const m = new Date(now); m.setDate(m.getDate() - 30); filterStart = new Date(m.setHours(0,0,0,0)); } else if (dateType === 'custom' && startDateStr && endDateStr) { filterStart = new Date(startDateStr); filterEnd = new Date(endDateStr); filterEnd.setHours(23,59,59,999); }

    filteredVisits = globalVisits.filter(v => {
        if (device !== 'all' && v.device !== device) return false; if (country !== 'all' && v.country !== country) return false; if (os !== 'all' && v.os !== os) return false; if (browser !== 'all' && !v.browser.includes(browser)) return false; if (lang !== 'all' && v.lang !== lang) return false;
        if (keyword) { const str = `${v.ip} ${v.address} ${v.country} ${v.os} ${v.browser} ${v.lang}`.toLowerCase(); if (!str.includes(keyword)) return false; }
        if (filterStart || filterEnd) { const vTime = new Date(v.visitTime).getTime(); if (filterStart && vTime < filterStart.getTime()) return false; if (filterEnd && vTime > filterEnd.getTime()) return false; }
        return true;
    });
    document.getElementById('filteredCount').innerText = filteredVisits.length; currentPage = 1; renderPagination();
}

function resetFilters() {
    document.getElementById('filterDateType').value = 'all'; document.getElementById('filterStartDate').value = ''; document.getElementById('filterEndDate').value = ''; toggleDateInputs(); document.getElementById('filterDevice').value = 'all'; document.getElementById('filterCountry').value = 'all'; document.getElementById('filterOS').value = 'all'; document.getElementById('filterBrowser').value = 'all'; document.getElementById('filterLang').value = 'all'; document.getElementById('searchInput').value = ''; applyFilters();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1; if (currentPage > totalPages) currentPage = totalPages;
    document.getElementById('pageInfo').innerText = `第 ${currentPage} / ${totalPages} 页`; document.getElementById('prevPageBtn').disabled = currentPage === 1; document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    const start = (currentPage - 1) * pageSize; const currentList = filteredVisits.slice(start, start + pageSize); renderVisitsList(currentList);
}

function changePage(delta) { const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1; const newPage = currentPage + delta; if (newPage >= 1 && newPage <= totalPages) { currentPage = newPage; renderPagination(); } }
function changePageSize(newSize) { pageSize = parseInt(newSize) || 50; currentPage = 1; renderPagination(); }

function renderVisitsList(visits) {
    const list = document.getElementById('visitsList'); if (!list) return;
    list.innerHTML = visits.map(v => {
        const visitTime = v.visitTime ? new Date(v.visitTime).toLocaleString() : '-'; const submitTime = v.submitTime ? new Date(v.submitTime).toLocaleString() : '-'; const leaveTime = v.leaveTime ? new Date(v.leaveTime).toLocaleString() : '-'; const duration = v.duration ? `${v.duration}s` : '-'; const addressDisplay = v.address ? v.address : '<span class="text-gray-400">未提交</span>';
        return `
        <div class="card p-4 flex flex-col justify-between items-start gap-4 text-sm">
            <div class="flex-1 min-w-0 w-full">
                <div class="flex items-center gap-3 mb-2 flex-wrap"><input type="checkbox" class="visit-cb accent-blue-600 w-4 h-4 cursor-pointer" value="${v.id}"><span class="font-mono text-gray-700 font-bold truncate">${addressDisplay}</span><span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded cursor-pointer" onclick="quickSearch('fingerprint', '${v.fingerprint}')">完整指纹</span></div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2"><span>进入时间: <b>${visitTime}</b></span><span>提交时间: <b>${submitTime}</b></span><span>退出时间: <b>${leaveTime}</b></span><span>停留: <b class="text-orange-500">${duration}</b></span></div>
                <div class="flex flex-wrap gap-2 mt-2"><span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('ip', '${v.ip}')">📍 IP: ${v.ip}</span><span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('country', '${v.country}')">🌐 国家: ${v.country}</span><span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('device', '${v.device}')">💻 设备: ${v.device}</span><span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('os', '${v.os}')">🖥️ 系统: ${v.os}</span><span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('browser', '${v.browser}')">🌍 浏览器: ${v.browser}</span><span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('lang', '${v.lang}')">🗣️ 语言: ${v.lang}</span></div>
            </div>
        </div>`;
    }).join('') || '<div class="text-center py-10 text-gray-500">暂无记录</div>';
}
function quickSearch(category, value) { document.getElementById('searchInput').value = value; applyFilters(); }

async function deleteVisits() {
    const cbs = document.querySelectorAll('.visit-cb:checked'); if (cbs.length === 0) return alert('请先勾选');
    if (!confirm(`确定删除选中的 ${cbs.length} 条数据吗？`)) return;
    const ids = Array.from(cbs).map(cb => cb.value);
    await fetch('/api/admin/visits/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ ids }) });
    fetchData();
}

function exportCSV() {
    const rows = [['地址', 'IP', '国家', '设备', '系统', '浏览器', '语言', '进入时间', '提交时间', '退出时间', '停留(秒)', '指纹']]; const cbs = document.querySelectorAll('.visit-cb:checked'); const toExport = cbs.length > 0 ? globalVisits.filter(v => Array.from(cbs).map(c=>c.value).includes(v.id)) : globalVisits;
    toExport.forEach(v => { rows.push([v.address || '未提交', v.ip, v.country, v.device, v.os, v.browser, v.lang, v.visitTime || '', v.submitTime || '', v.leaveTime || '', v.duration || 0, v.fingerprint]); });
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `visits_export_${new Date().getTime()}.csv`); document.body.appendChild(link); link.click();
}
function loadVisits() { fetchData(); }

function renderSources() {
    const tbody = document.getElementById('sourceList'); if (!tbody) return;
    tbody.innerHTML = (globalTrackingConfig.sources || []).map((s, idx) => `<tr><td>${s.name}</td><td class="text-blue-500">${s.url}</td><td><button onclick="deleteSource(${idx})" class="text-red-500 hover:underline">删除</button></td></tr>`).join('');
}

function renderTrackingLogs() {
    const list = document.getElementById('trackingLogsList'); if (!list) return;
    let logs = globalTrackingConfig.logs || []; logs.sort((a, b) => new Date(b.time) - new Date(a.time));
    list.innerHTML = logs.map(l => `<tr class="border-b hover:bg-gray-50 dark:hover:bg-slate-800"><td class="p-3 text-center"><input type="checkbox" class="tracking-log-cb w-4 h-4 cursor-pointer" value="${l.id}"></td><td class="p-3 whitespace-nowrap text-gray-500 text-xs">${new Date(l.time).toLocaleString()}</td><td class="p-3"><div class="font-bold text-gray-700">${l.title.en || '无英文'}</div><div class="text-xs text-gray-400 mt-1">${l.title.zh ? 'ZH: ' + l.title.zh : ''}</div></td><td class="p-3 font-mono text-xs text-blue-500">${l.address}</td></tr>`).join('') || `<tr><td colspan="4" class="text-center py-6 text-gray-500">暂无数据</td></tr>`;
    document.getElementById('selectAllTracking').checked = false;
}

function toggleAllTracking(el) { document.querySelectorAll('.tracking-log-cb').forEach(cb => cb.checked = el.checked); }
async function deleteTrackingLogs() {
    const cbs = document.querySelectorAll('.tracking-log-cb:checked'); if (cbs.length === 0) return alert('请先勾选要删除的数据');
    const ids = Array.from(cbs).map(cb => cb.value);
    await fetch('/api/admin/tracking/logs/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ ids }) }); fetchData();
}
async function saveTrackingConfig() {
    const interval = parseInt(document.getElementById('trackingInterval').value) || 0; const maxLogs = parseInt(document.getElementById('trackingMaxLogs').value) || 100;
    await fetch('/api/admin/tracking/config', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ interval, maxLogs }) }); alert('追踪配置已保存'); fetchData();
}
async function mockTrackingData() { const btn = event.target; btn.disabled = true; await fetch('/api/admin/tracking/mock', { method: 'POST', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); btn.disabled = false; }
async function addSource() {
    const name = document.getElementById('newSourceName').value.trim(); const url = document.getElementById('newSourceUrl').value.trim(); if (!name || !url) return alert('请填写完整');
    await fetch('/api/admin/tracking/source', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ name, url }) });
    document.getElementById('newSourceName').value = ''; document.getElementById('newSourceUrl').value = ''; fetchData();
}
async function deleteSource(index) { if (!confirm('确定删除该数据源？')) return; await fetch(`/api/admin/tracking/source/${index}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); }

function editArticleGroup(groupId) {
    const group = allArticles.filter(a => a.groupId === groupId || a.id === groupId); if (!group || group.length === 0) return;
    const main = group.find(a => a.lang === 'zh') || group.find(a => a.lang === 'en') || group[0]; const existingLangs = group.map(a => a.lang); 
    document.getElementById('editArticleGroupId').value = groupId; document.getElementById('editArtType').value = main.type; document.getElementById('editArtTitle').value = main.title; document.getElementById('editArtSummary').value = main.summary; document.getElementById('editArtCoverUrl').value = main.coverUrl || ''; editQuill.root.innerHTML = main.content || '';
    updateCoverPreview('editArtCoverUrl', 'editArtCoverPreview');
    document.getElementById('editArticleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => {
        const isTranslated = existingLangs.includes(l.code); const disabled = l.code === 'zh' ? 'disabled' : ''; const checked = (l.code === 'zh' || isTranslated) ? 'checked' : '';
        const badge = isTranslated ? `<span class="text-green-500 text-[10px] bg-green-100 px-1.5 py-0.5 rounded">已翻译</span>` : `<span class="text-red-500 text-[10px] bg-red-100 px-1.5 py-0.5 rounded">未翻译</span>`;
        return `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 transition"><input type="checkbox" value="${l.code}" class="edit-article-lang-cb accent-blue-600" ${checked} ${disabled}> ${l.flag} ${l.name} ${badge}</label>`;
    }).join('');
    document.getElementById('editArticleModal').classList.add('active');
}
function closeEditModal() { document.getElementById('editArticleModal').classList.remove('active'); document.getElementById('editArticleGroupId').value = ''; }

async function submitEditArticle() {
    const groupId = document.getElementById('editArticleGroupId').value; if (!groupId) return;
    const type = document.getElementById('editArtType').value; const title = document.getElementById('editArtTitle').value; const summary = document.getElementById('editArtSummary').value; const coverUrl = document.getElementById('editArtCoverUrl').value; const content = editQuill.root.innerHTML;
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('.edit-article-lang-cb:checked')).map(cb => cb.value);
    const btn = document.getElementById('editArticleSubmitBtn'); const old = btn.innerText; btn.innerText = '翻译并保存中...'; btn.disabled = true;
    try {
        const res = await fetch(`/api/admin/article-group/${groupId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) });
        const data = await res.json(); if (data.success) { alert('修改并同步翻译成功！'); closeEditModal(); fetchData(); } else { alert('失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function submitArticle() {
    const type = document.getElementById('artType').value; const title = document.getElementById('artTitle').value; const summary = document.getElementById('artSummary').value; const coverUrl = document.getElementById('artCoverUrl').value; const content = quill.root.innerHTML;
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value); if(checkedLangs.length === 0) return alert('请至少勾选一种发布语言！');
    const btn = document.getElementById('articleSubmitBtn'); const old = btn.innerText; btn.innerText = '翻译并发布中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/article/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) });
        const data = await res.json(); if (data.success) { alert('发布成功！'); document.getElementById('artTitle').value = ''; document.getElementById('artSummary').value = ''; document.getElementById('artCoverUrl').value = ''; updateCoverPreview('artCoverUrl', 'artCoverPreview'); quill.setContents([]); fetchData(); } else { alert('失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function deleteArticleGroup(groupId) { if(confirm('确认删除该组文章的所有语言版本？')) { await fetch(`/api/admin/article-group/${groupId}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); } }
async function addCategory() {
    const id = document.getElementById('newCatId').value.trim(); const zh = document.getElementById('newCatZh').value.trim(); const en = document.getElementById('newCatEn').value.trim(); if(!id || !zh) return alert('请填写完整');
    await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ id, name_zh: zh, name_en: en }) });
    document.getElementById('newCatId').value = ''; document.getElementById('newCatZh').value = ''; document.getElementById('newCatEn').value = ''; fetchData();
}
function openEditCategory(id) { const cat = allCategories.find(c => c.id === id); if(!cat) return; document.getElementById('editCatId').value = cat.id; document.getElementById('editCatZh').value = cat.name_zh; document.getElementById('editCatEn').value = cat.name_en; document.getElementById('editCategoryModal').classList.add('active'); }
async function saveEditCategory() { const id = document.getElementById('editCatId').value; const zh = document.getElementById('editCatZh').value; const en = document.getElementById('editCatEn').value; await fetch(`/api/admin/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ name_zh: zh, name_en: en }) }); document.getElementById('editCategoryModal').classList.remove('active'); fetchData(); }
async function deleteCategory(id) { if(confirm('确定删除该板块？')) { await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); } }

async function addLanguage() {
    const code = document.getElementById('newLangCode').value.trim(); const name = document.getElementById('newLangName').value.trim(); const flag = document.getElementById('newLangFlag').value.trim(); if(!code || !name) return alert('请填写完整');
    await fetch('/api/admin/languages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ code, name, flag }) }); 
    document.getElementById('newLangCode').value = ''; document.getElementById('newLangName').value = ''; document.getElementById('newLangFlag').value = ''; fetchData();
}
function openEditLang(code) { const l = allLangs.find(x => x.code === code); if(l) { document.getElementById('editLangCode').value = code; document.getElementById('editLangDict').value = JSON.stringify(l.dict || {}, null, 2); document.getElementById('editLangModal').classList.add('active'); } }
async function saveLangDict() {
    const code = document.getElementById('editLangCode').value;
    try { const dict = JSON.parse(document.getElementById('editLangDict').value); await fetch(`/api/admin/languages/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ dict }) }); document.getElementById('editLangModal').classList.remove('active'); fetchData(); } catch (e) { alert('JSON 格式错误'); }
}

function openChangePwd() { document.getElementById('newPwdInput').value = ''; document.getElementById('changePwdModal').classList.add('active'); }
async function savePassword() {
    const newPwd = document.getElementById('newPwdInput').value; if(!newPwd) return alert('密码不能为空');
    const res = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ newPassword: newPwd }) });
    if(res.ok) { alert('密码修改成功，请重新登录'); sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }
}
