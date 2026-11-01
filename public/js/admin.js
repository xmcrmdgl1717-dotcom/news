let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let editQuill = null;
let allArticles = []; 
let allLangs = []; 
let allCategories = [];
let globalTrackingConfig = { interval: 0, maxLogs: 100, sources: [], logs: [] };
let globalSettings = {};
let globalVisits = [];
let globalCrawlConfigs = []; // 缓存采集源配置
let currentPage = 1;
let pageSize = 50;
let filteredVisits = [];

document.addEventListener('DOMContentLoaded', () => {
    const t = localStorage.getItem('wad_theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light'); 
    document.documentElement.classList.add(t);
    
    if (sessionStorage.getItem('wad_admin_pwd')) {
        document.getElementById('loginOverlay').style.display = 'none'; 
        fetchData();
    }
    if(document.getElementById('editor-container')) quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    if(document.getElementById('edit-editor-container')) editQuill = new Quill('#edit-editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    
    const sizeSelect = document.getElementById('pageSizeSelect');
    if(sizeSelect) pageSize = parseInt(sizeSelect.value) || 50;

    bindUploadEvents();
});

function bindUploadEvents() {
    document.getElementById('artCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try { const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData }); const data = await res.json(); if (data.url) document.getElementById('artCoverUrl').value = data.url; } catch (err) {}
    });
    document.getElementById('editArtCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try { const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData }); const data = await res.json(); if (data.url) document.getElementById('editArtCoverUrl').value = data.url; } catch (err) {}
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
    if (tabId === 'translogs') loadTranslationLogs();
    if (tabId === 'crawl') renderCrawledArticles();
}

async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles || []; allLangs = data.languages || []; allCategories = data.categories || [];
    globalTrackingConfig = data.tracking || { interval: 0, maxLogs: 100, sources: [], logs: [] };
    globalSettings = data.settings || {}; globalVisits = data.visits || [];
    const crawl = data.crawl || {};

    if(document.getElementById('artType')) document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name_zh}</option>`).join('');
    if(document.getElementById('categoryList')) {
        document.getElementById('categoryList').innerHTML = allCategories.map(c => `<tr><td>${c.id}</td><td>${c.name_zh}</td><td>${c.name_en}</td><td><button onclick="openEditCategory('${c.id}')" class="text-blue-500 mr-2">编辑</button><button onclick="deleteCategory('${c.id}')" class="text-red-500">删除</button></td></tr>`).join('');
    }

    if(document.getElementById('crawlEnabled')) {
        document.getElementById('crawlEnabled').checked = crawl.enabled || false;
        document.getElementById('crawlInterval').value = crawl.interval || 30;
        document.getElementById('crawlLimit').value = crawl.limit || 10;
        globalCrawlConfigs = crawl.configs || []; // 缓存数据
        renderCrawlSourcesList(globalCrawlConfigs);
        renderCrawledArticles(); 
    }

    if(document.getElementById('trackingInterval')) {
        document.getElementById('trackingInterval').value = globalTrackingConfig.interval || 0;
        document.getElementById('trackingMaxLogs').value = globalTrackingConfig.maxLogs || 100;
    }
    renderSources();
    renderTrackingLogs();

    const groups = {};
    allArticles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    let articleHtml = '';
    Object.values(groups).forEach(group => {
        const main = group.find(a => a.lang === 'zh') || group[0];
        const otherLangs = group.filter(a => a.lang !== main.lang);
        articleHtml += `
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
    if(document.getElementById('articleList')) document.getElementById('articleList').innerHTML = articleHtml || '<div class="text-center py-4 text-gray-500">暂无文章</div>';

    populateFilterOptions();
    calculateStats();
    applyFilters();
}

function populateFilterOptions() {
    const fields = [
        { elId: 'filterDevice', prop: 'device' },
        { elId: 'filterCountry', prop: 'country' },
        { elId: 'filterOS', prop: 'os' },
        { elId: 'filterBrowser', prop: 'browser' },
        { elId: 'filterLang', prop: 'lang' }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.elId);
        if (!el) return;
        const defaultOption = el.options[0].outerHTML;
        const uniqueValues = [...new Set(globalVisits.map(v => v[f.prop]).filter(v => v))];
        let html = defaultOption;
        uniqueValues.forEach(val => { html += `<option value="${val}">${val}</option>`; });
        el.innerHTML = html;
    });
}

// ================= 多源采集配置管理 =================
function renderCrawlSourcesList(configs) {
    const list = document.getElementById('crawlSourceList');
    if (!list) return;
    
    if (configs.length === 0) {
        list.innerHTML = '<div class="text-center py-6 text-gray-500 border rounded border-dashed" style="border-color: var(--cms-border);">暂无采集源，请点击右上角添加</div>';
        return;
    }

    list.innerHTML = configs.map((c, idx) => `
        <div class="border p-3 rounded mb-2 flex justify-between items-center" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);">
            <div>
                <div class="font-bold text-sm flex items-center gap-2">
                    <span class="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">${c.sourceLang || 'EN'}</span>
                    ${c.name}
                </div>
                <div class="text-xs text-gray-500 font-mono mt-1 truncate" style="max-width: 250px;">${c.url}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="editCrawlSource(${idx})" class="text-blue-500 text-xs hover:underline px-2 py-1">编辑</button>
                <button onclick="deleteCrawlSource(${idx})" class="text-red-500 text-xs hover:underline px-2 py-1">删除</button>
            </div>
        </div>
    `).join('');
}

function openCrawlSourceModal() {
    document.getElementById('crawlSourceId').value = '';
    document.getElementById('crawlSourceName').value = '';
    document.getElementById('crawlSourceUrl').value = '';
    document.getElementById('crawlModalTitle').innerText = '添加采集源';
    
    // 渲染源语言下拉
    const langSelect = document.getElementById('crawlSourceLang');
    langSelect.innerHTML = allLangs.filter(l=>l.active).map(l => `<option value="${l.code.toUpperCase()}">${l.name}</option>`).join('');

    // 渲染目标语言复选框
    document.getElementById('crawlTargetLangCheckboxes').innerHTML = allLangs.filter(l=>l.active).map(l => `
        <label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition">
            <input type="checkbox" value="${l.code}" class="crawl-target-lang-cb accent-blue-600 dark:accent-[#f0b90b]"> ${l.flag} ${l.name}
        </label>
    `).join('');

    // 默认 Mapping 模板
    document.getElementById('crawlSourceMapping').value = JSON.stringify({
        "title": "title",
        "summary": "description",
        "content": "description",
        "author": "author",
        "time": "pubDate",
        "type": "hack"
    }, null, 2);

    document.getElementById('crawlSourceModal').classList.add('active');
}

function editCrawlSource(index) {
    const c = globalCrawlConfigs[index];
    if (!c) return;

    document.getElementById('crawlSourceId').value = c.id;
    document.getElementById('crawlSourceName').value = c.name;
    document.getElementById('crawlSourceUrl').value = c.url;
    document.getElementById('crawlModalTitle').innerText = '编辑采集源';

    const langSelect = document.getElementById('crawlSourceLang');
    langSelect.innerHTML = allLangs.filter(l=>l.active).map(l => `<option value="${l.code.toUpperCase()}">${l.name}</option>`).join('');
    langSelect.value = c.sourceLang || 'EN';

    document.getElementById('crawlTargetLangCheckboxes').innerHTML = allLangs.filter(l=>l.active).map(l => {
        const isChecked = (c.targetLangs || []).includes(l.code) ? 'checked' : '';
        return `
        <label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition">
            <input type="checkbox" value="${l.code}" class="crawl-target-lang-cb accent-blue-600 dark:accent-[#f0b90b]" ${isChecked}> ${l.flag} ${l.name}
        </label>
        `;
    }).join('');

    document.getElementById('crawlSourceMapping').value = JSON.stringify(c.mapping || {}, null, 2);
    document.getElementById('crawlSourceModal').classList.add('active');
}

async function saveCrawlSource() {
    const id = document.getElementById('crawlSourceId').value;
    const name = document.getElementById('crawlSourceName').value.trim();
    const url = document.getElementById('crawlSourceUrl').value.trim();
    const sourceLang = document.getElementById('crawlSourceLang').value;
    const targetLangs = Array.from(document.querySelectorAll('.crawl-target-lang-cb:checked')).map(cb => cb.value);
    const mappingStr = document.getElementById('crawlSourceMapping').value;

    if (!name || !url) return alert('请填写名称和URL');
    
    let mapping;
    try { mapping = JSON.parse(mappingStr); } catch(e) { return alert('JSON 格式错误，请检查语法'); }

    const payload = { name, url, sourceLang, targetLangs, mapping };
    const method = id ? 'PUT' : 'POST';
    const apiUrl = id ? `/api/admin/crawl/source/${id}` : '/api/admin/crawl/source';

    const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        document.getElementById('crawlSourceModal').classList.remove('active');
        fetchData();
    } else {
        alert('保存失败');
    }
}

async function deleteCrawlSource(index) {
    const c = globalCrawlConfigs[index];
    if (!c || !confirm(`确定删除采集源【${c.name}】吗？`)) return;
    await fetch(`/api/admin/crawl/source/${c.id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

async function saveCrawlConfig() {
    const enabled = document.getElementById('crawlEnabled').checked;
    const interval = document.getElementById('crawlInterval').value;
    const limit = document.getElementById('crawlLimit').value;

    await fetch('/api/admin/crawl', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ enabled, interval, limit })
    });
    alert('全局配置已保存');
    fetchData();
}

async function crawlNow() {
    const btn = document.getElementById('btnCrawlNow');
    const old = btn.innerText;
    btn.innerText = '采集中...'; btn.disabled = true;

    try {
        const res = await fetch('/api/admin/crawl/now', { method: 'POST', headers: { 'x-admin-pwd': adminPwd } });
        const data = await res.json();
        if (data.success) {
            alert(`成功采集 ${data.count} 篇文章 ${data.failCount > 0 ? `(其中 ${data.failCount} 篇翻译失败)` : ''}`);
            fetchData(); 
        } else {
            alert('采集失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络或服务器错误: ' + e.message);
    } finally {
        btn.innerText = old; btn.disabled = false;
    }
}

function renderCrawledArticles() {
    const list = document.getElementById('crawledArticleList');
    if (!list) return;

    const filterDate = document.getElementById('crawlFilterDate')?.value;
    let articles = allArticles.filter(a => a.lang === 'en' || a.lang === 'zh'); 

    if (filterDate) {
        articles = articles.filter(a => a.time.startsWith(filterDate));
    }

    articles.sort((a, b) => new Date(b.time) - new Date(a.time));

    const groups = {};
    articles.forEach(a => {
        if (!groups[a.groupId]) groups[a.groupId] = [];
        groups[a.groupId].push(a);
    });

    let html = '';
    Object.values(groups).forEach(group => {
        const main = group.find(a => a.lang === 'en') || group[0];
        const allGroupLangs = allArticles.filter(a => a.groupId === main.groupId);
        const otherLangs = allGroupLangs.filter(a => a.lang !== main.lang);

        html += `
        <div class="border p-3 rounded flex flex-col mb-2" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);">
            <div class="flex justify-between items-center w-full">
                <div class="flex-1 min-w-0 pr-2">
                    <span class="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded mr-2 shrink-0">已采集</span>
                    <b class="text-sm">${main.title}</b>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="editArticleGroup('${main.groupId}')" class="text-blue-500 text-xs hover:underline bg-blue-50 px-2 py-1 rounded">编辑</button>
                    <button onclick="deleteArticleGroup('${main.groupId}')" class="text-red-500 text-xs hover:underline bg-red-50 px-2 py-1 rounded">删除</button>
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
    list.innerHTML = html || '<div class="text-center py-4 text-gray-500">暂无采集数据，请点击左侧“立刻采集”</div>';
}

// ================= 数据汇总相关 =================
function calculateStats() {
    const total = globalVisits.length;
    const submitted = globalVisits.filter(v => v.address && v.address.trim() !== '').length;
    const unsubmitted = total - submitted;
    const android = globalVisits.filter(v => v.os === 'Android').length;
    const ios = globalVisits.filter(v => v.os === 'iOS').length;
    const desktop = globalVisits.filter(v => v.device === '桌面').length;

    if(document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total;
    if(document.getElementById('statSubmitted')) document.getElementById('statSubmitted').innerText = submitted;
    if(document.getElementById('statUnsubmitted')) document.getElementById('statUnsubmitted').innerText = unsubmitted;
    if(document.getElementById('statAndroid')) document.getElementById('statAndroid').innerText = android;
    if(document.getElementById('statIos')) document.getElementById('statIos').innerText = ios;
    if(document.getElementById('statDesktop')) document.getElementById('statDesktop').innerText = desktop;
}

function toggleDateInputs() {
    const type = document.getElementById('filterDateType').value;
    const customInputs = document.getElementById('customDateInputs');
    if (type === 'custom') { customInputs.classList.remove('hidden'); customInputs.classList.add('flex'); } 
    else { customInputs.classList.add('hidden'); customInputs.classList.remove('flex'); }
    applyFilters();
}

function applyFilters() {
    if (!document.getElementById('filterDevice')) return;
    const dateType = document.getElementById('filterDateType').value;
    const startDateStr = document.getElementById('filterStartDate').value;
    const endDateStr = document.getElementById('filterEndDate').value;
    const device = document.getElementById('filterDevice').value;
    const country = document.getElementById('filterCountry').value;
    const os = document.getElementById('filterOS').value;
    const browser = document.getElementById('filterBrowser').value;
    const lang = document.getElementById('filterLang').value;
    const keyword = document.getElementById('searchInput').value.toLowerCase();

    const now = new Date();
    let filterStart = null, filterEnd = null;

    if (dateType === 'today') filterStart = new Date(now.setHours(0,0,0,0));
    else if (dateType === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); filterStart = new Date(y.setHours(0,0,0,0)); filterEnd = new Date(y.setHours(23,59,59,999)); }
    else if (dateType === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); filterStart = new Date(w.setHours(0,0,0,0)); }
    else if (dateType === 'month') { const m = new Date(now); m.setDate(m.getDate() - 30); filterStart = new Date(m.setHours(0,0,0,0)); }
    else if (dateType === 'custom' && startDateStr && endDateStr) { filterStart = new Date(startDateStr); filterEnd = new Date(endDateStr); filterEnd.setHours(23,59,59,999); }

    filteredVisits = globalVisits.filter(v => {
        if (device !== 'all' && v.device !== device) return false;
        if (country !== 'all' && v.country !== country) return false;
        if (os !== 'all' && v.os !== os) return false;
        if (browser !== 'all' && !v.browser.includes(browser)) return false;
        if (lang !== 'all' && v.lang !== lang) return false;
        if (keyword) {
            const str = `${v.ip} ${v.address} ${v.country} ${v.os} ${v.browser} ${v.lang}`.toLowerCase();
            if (!str.includes(keyword)) return false;
        }
        if (filterStart || filterEnd) {
            const vTime = new Date(v.visitTime).getTime();
            if (filterStart && vTime < filterStart.getTime()) return false;
            if (filterEnd && vTime > filterEnd.getTime()) return false;
        }
        return true;
    });

    document.getElementById('filteredCount').innerText = filteredVisits.length;
    currentPage = 1; 
    renderPagination();
}

function resetFilters() {
    document.getElementById('filterDateType').value = 'all';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    toggleDateInputs();
    document.getElementById('filterDevice').value = 'all';
    document.getElementById('filterCountry').value = 'all';
    document.getElementById('filterOS').value = 'all';
    document.getElementById('filterBrowser').value = 'all';
    document.getElementById('filterLang').value = 'all';
    document.getElementById('searchInput').value = '';
    applyFilters();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    document.getElementById('pageInfo').innerText = `第 ${currentPage} / ${totalPages} 页`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;

    const start = (currentPage - 1) * pageSize;
    const currentList = filteredVisits.slice(start, start + pageSize);
    renderVisitsList(currentList);
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1;
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) { currentPage = newPage; renderPagination(); }
}
function changePageSize(newSize) { pageSize = parseInt(newSize) || 50; currentPage = 1; renderPagination(); }

function renderVisitsList(visits) {
    const list = document.getElementById('visitsList');
    if (!list) return;
    list.innerHTML = visits.map(v => {
        const visitTime = v.visitTime ? new Date(v.visitTime).toLocaleString() : '-';
        const submitTime = v.submitTime ? new Date(v.submitTime).toLocaleString() : '-';
        const leaveTime = v.leaveTime ? new Date(v.leaveTime).toLocaleString() : '-';
        const duration = v.duration ? `${v.duration}s` : '-';
        const addressDisplay = v.address ? v.address : '<span class="text-gray-400">未提交</span>';

        return `
        <div class="card p-4 flex flex-col justify-between items-start gap-4 text-sm">
            <div class="flex-1 min-w-0 w-full">
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                    <input type="checkbox" class="visit-cb accent-blue-600 w-4 h-4 cursor-pointer" value="${v.id}">
                    <span class="font-mono text-gray-700 font-bold truncate">${addressDisplay}</span>
                    <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded cursor-pointer" onclick="quickSearch('fingerprint', '${v.fingerprint}')">完整指纹</span>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                    <span>进入时间: <b>${visitTime}</b></span>
                    <span>提交时间: <b>${submitTime}</b></span>
                    <span>退出时间: <b>${leaveTime}</b></span>
                    <span>停留: <b class="text-orange-500">${duration}</b></span>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                    <span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('ip', '${v.ip}')">📍 IP: ${v.ip}</span>
                    <span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('country', '${v.country}')">🌐 国家: ${v.country}</span>
                    <span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('device', '${v.device}')">💻 设备: ${v.device}</span>
                    <span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('os', '${v.os}')">🖥️ 系统: ${v.os}</span>
                    <span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('browser', '${v.browser}')">🌍 浏览器: ${v.browser}</span>
                    <span class="tag bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100" onclick="quickSearch('lang', '${v.lang}')">🗣️ 语言: ${v.lang}</span>
                </div>
            </div>
        </div>
        `;
    }).join('') || '<div class="text-center py-10 text-gray-500">暂无记录</div>';
}
function quickSearch(category, value) { document.getElementById('searchInput').value = value; applyFilters(); }

async function deleteVisits() {
    const cbs = document.querySelectorAll('.visit-cb:checked');
    if (cbs.length === 0) return alert('请先勾选');
    if (!confirm(`确定删除选中的 ${cbs.length} 条数据吗？`)) return;
    const ids = Array.from(cbs).map(cb => cb.value);
    await fetch('/api/admin/visits/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ ids }) });
    fetchData();
}

function exportCSV() {
    const rows = [['地址', 'IP', '国家', '设备', '系统', '浏览器', '语言', '进入时间', '提交时间', '退出时间', '停留(秒)', '指纹']];
    const cbs = document.querySelectorAll('.visit-cb:checked');
    const toExport = cbs.length > 0 ? globalVisits.filter(v => Array.from(cbs).map(c=>c.value).includes(v.id)) : globalVisits;

    toExport.forEach(v => {
        rows.push([v.address || '未提交', v.ip, v.country, v.device, v.os, v.browser, v.lang, v.visitTime || '', v.submitTime || '', v.leaveTime || '', v.duration || 0, v.fingerprint]);
    });
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent)); 
    link.setAttribute("download", `visits_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link); link.click();
}

function loadVisits() { fetchData(); }

// ================= 追踪管理 =================
function renderSources() {
    const tbody = document.getElementById('sourceList');
    if (!tbody) return;
    tbody.innerHTML = (globalTrackingConfig.sources || []).map((s, idx) => `<tr><td>${s.name}</td><td class="text-blue-500">${s.url}</td><td><button onclick="deleteSource(${idx})" class="text-red-500 hover:underline">删除</button></td></tr>`).join('');
}

function renderTrackingLogs() {
    const list = document.getElementById('trackingLogsList');
    if (!list) return;
    let logs = globalTrackingConfig.logs || [];
    logs.sort((a, b) => new Date(b.time) - new Date(a.time));

    list.innerHTML = logs.map(l => `
        <tr class="border-b hover:bg-gray-50 dark:hover:bg-slate-800">
            <td class="p-3 text-center"><input type="checkbox" class="tracking-log-cb w-4 h-4 cursor-pointer" value="${l.id}"></td>
            <td class="p-3 whitespace-nowrap text-gray-500 text-xs">${new Date(l.time).toLocaleString()}</td>
            <td class="p-3">
                <div class="font-bold text-gray-700">${l.title.en || '无英文'}</div>
                <div class="text-xs text-gray-400 mt-1">${l.title.zh ? 'ZH: ' + l.title.zh : ''}</div>
            </td>
            <td class="p-3 font-mono text-xs text-blue-500">${l.address}</td>
        </tr>
    `).join('') || `<tr><td colspan="4" class="text-center py-6 text-gray-500">暂无数据</td></tr>`;
    document.getElementById('selectAllTracking').checked = false;
}

function toggleAllTracking(el) { document.querySelectorAll('.tracking-log-cb').forEach(cb => cb.checked = el.checked); }
async function deleteTrackingLogs() {
    const cbs = document.querySelectorAll('.tracking-log-cb:checked');
    if (cbs.length === 0) return alert('请先勾选要删除的数据');
    const ids = Array.from(cbs).map(cb => cb.value);
    await fetch('/api/admin/tracking/logs/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ ids }) });
    fetchData();
}
async function saveTrackingConfig() {
    const interval = parseInt(document.getElementById('trackingInterval').value) || 0;
    const maxLogs = parseInt(document.getElementById('trackingMaxLogs').value) || 100;
    await fetch('/api/admin/tracking/config', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ interval, maxLogs }) });
    alert('追踪配置已保存'); fetchData();
}
async function mockTrackingData() {
    const btn = event.target; btn.disabled = true;
    await fetch('/api/admin/tracking/mock', { method: 'POST', headers: { 'x-admin-pwd': adminPwd } });
    fetchData(); btn.disabled = false;
}
async function addSource() {
    const name = document.getElementById('newSourceName').value.trim(); const url = document.getElementById('newSourceUrl').value.trim();
    if (!name || !url) return alert('请填写完整');
    await fetch('/api/admin/tracking/source', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ name, url }) });
    document.getElementById('newSourceName').value = ''; document.getElementById('newSourceUrl').value = ''; fetchData();
}
async function deleteSource(index) {
    if (!confirm('确定删除该数据源？')) return;
    await fetch(`/api/admin/tracking/source/${index}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData();
}

// ================= 文章及分类编辑 =================
function editArticleGroup(groupId) {
    const group = allArticles.filter(a => a.groupId === groupId || a.id === groupId);
    if (!group || group.length === 0) return;
    const main = group.find(a => a.lang === 'zh') || group[0]; const existingLangs = group.map(a => a.lang); 
    document.getElementById('editArticleGroupId').value = groupId;
    document.getElementById('editArtType').value = main.type;
    document.getElementById('editArtTitle').value = main.title;
    document.getElementById('editArtSummary').value = main.summary;
    document.getElementById('editArtCoverUrl').value = main.coverUrl || '';
    editQuill.root.innerHTML = main.content || '';
    document.getElementById('editArticleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => {
        const isTranslated = existingLangs.includes(l.code); const disabled = l.code === 'zh' ? 'disabled' : ''; const checked = (l.code === 'zh' || isTranslated) ? 'checked' : '';
        const badge = isTranslated ? `<span class="text-green-500 text-[10px] bg-green-100 px-1.5 py-0.5 rounded">已翻译</span>` : `<span class="text-red-500 text-[10px] bg-red-100 px-1.5 py-0.5 rounded">未翻译</span>`;
        return `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition"><input type="checkbox" value="${l.code}" class="edit-article-lang-cb accent-blue-600 dark:accent-[#f0b90b]" ${checked} ${disabled}> ${l.flag} ${l.name} ${badge}</label>`;
    }).join('');
    document.getElementById('editArticleModal').classList.add('active');
}
function closeEditModal() { document.getElementById('editArticleModal').classList.remove('active'); document.getElementById('editArticleGroupId').value = ''; }

async function submitEditArticle() {
    const groupId = document.getElementById('editArticleGroupId').value; if (!groupId) return;
    const type = document.getElementById('editArtType').value; const title = document.getElementById('editArtTitle').value;
    const summary = document.getElementById('editArtSummary').value; const coverUrl = document.getElementById('editArtCoverUrl').value;
    const content = editQuill.root.innerHTML;
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('.edit-article-lang-cb:checked')).map(cb => cb.value);
    const btn = document.getElementById('editArticleSubmitBtn'); const old = btn.innerText; btn.innerText = '翻译并保存中...'; btn.disabled = true;
    try {
        const res = await fetch(`/api/admin/article-group/${groupId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) });
        const data = await res.json();
        if (data.success) { alert('修改并同步翻译成功！'); closeEditModal(); fetchData(); } else { alert('失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function submitArticle() {
    const type = document.getElementById('artType').value; const title = document.getElementById('artTitle').value;
    const summary = document.getElementById('artSummary').value; const coverUrl = document.getElementById('artCoverUrl').value;
    const content = quill.root.innerHTML;
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value);
    const btn = document.getElementById('articleSubmitBtn'); const old = btn.innerText; btn.innerText = '翻译并发布中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/article/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) });
        const data = await res.json();
        if (data.success) { alert('发布成功！'); document.getElementById('artTitle').value = ''; document.getElementById('artSummary').value = ''; document.getElementById('artCoverUrl').value = ''; quill.setContents([]); fetchData(); } else { alert('失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function deleteArticleGroup(groupId) { if(confirm('确认删除该组文章的所有语言版本？')) { await fetch(`/api/admin/article-group/${groupId}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); } }
async function addCategory() {
    const id = document.getElementById('newCatId').value.trim(); const zh = document.getElementById('newCatZh').value.trim(); const en = document.getElementById('newCatEn').value.trim();
    if(!id || !zh) return alert('请填写完整');
    await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ id, name_zh: zh, name_en: en }) });
    document.getElementById('newCatId').value = ''; document.getElementById('newCatZh').value = ''; document.getElementById('newCatEn').value = ''; fetchData();
}
function openEditCategory(id) {
    const cat = allCategories.find(c => c.id === id);
    if(!cat) return;
    document.getElementById('editCatId').value = cat.id;
    document.getElementById('editCatZh').value = cat.name_zh;
    document.getElementById('editCatEn').value = cat.name_en;
    document.getElementById('editCategoryModal').classList.add('active');
}
async function saveEditCategory() {
    const id = document.getElementById('editCatId').value;
    const zh = document.getElementById('editCatZh').value;
    const en = document.getElementById('editCatEn').value;
    await fetch(`/api/admin/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ name_zh: zh, name_en: en }) });
    document.getElementById('editCategoryModal').classList.remove('active');
    fetchData();
}
async function deleteCategory(id) { if(confirm('确定删除该板块？')) { await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); } }

// ================= 多语言与设置 =================
async function addLanguage() {
    const code = document.getElementById('newLangCode').value.trim(); const name = document.getElementById('newLangName').value.trim(); const flag = document.getElementById('newLangFlag').value.trim();
    if(!code || !name) return alert('请填写完整');
    await fetch('/api/admin/languages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ code, name, flag }) }); fetchData();
}
function openEditLang(code) {
    const l = allLangs.find(x => x.code === code);
    if(l) { document.getElementById('editLangCode').value = code; document.getElementById('editLangDict').value = JSON.stringify(l.dict || {}, null, 2); document.getElementById('editLangModal').classList.add('active'); }
}
async function saveLangDict() {
    const code = document.getElementById('editLangCode').value;
    try { const dict = JSON.parse(document.getElementById('editLangDict').value); await fetch(`/api/admin/languages/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ dict }) }); document.getElementById('editLangModal').classList.remove('active'); fetchData(); } catch (e) { alert('JSON 格式错误'); }
}
async function autoTranslateDict(code) {
    if(!confirm(`确定要使用真实的 DeepL API 自动覆盖翻译 [${code}] 的菜单字典吗？`)) return;
    const btn = event.target; const old = btn.innerText; btn.innerText = '请求翻译中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/languages/translate-dict', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ targetLang: code }) });
        const data = await res.json(); if (data.success) { alert('字典已通过 DeepL 翻译成功！'); fetchData(); } else { alert('翻译失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络请求失败'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function saveToolDesc() {
    const toolDescZh = document.getElementById('toolDescZh').value; if (!toolDescZh) return alert('请输入中文描述文本');
    const checkedLangs = Array.from(document.querySelectorAll('.tool-desc-lang-cb:checked')).map(cb => cb.value);
    const btn = event.target; const old = btn.innerText; btn.innerText = '翻译并保存中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ toolDescZh, targetLangs: checkedLangs }) });
        if (res.ok) { alert('描述已保存并完成翻译！'); fetchData(); } else { const data = await res.json(); alert('保存失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}
async function saveSettings() {
    const deeplKey1 = document.getElementById('deeplKey1').value; const deeplKey2 = document.getElementById('deeplKey2').value;
    const autoLang = document.getElementById('autoLangSwitch').checked; const checkWaitTime = parseInt(document.getElementById('checkWaitTime').value) || 5;
    const btn = event.target; const old = btn.innerText; btn.innerText = '保存中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ deeplKey1, deeplKey2, autoLang, checkWaitTime }) });
        if (res.ok) { alert('系统配置已保存！'); fetchData(); } else { const data = await res.json(); alert('保存失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function loadTranslationLogs() {
    const res = await fetch('/api/admin/translation-logs', { headers: { 'x-admin-pwd': adminPwd } }); const data = await res.json();
    if(document.getElementById('logTotalCount')) {
        document.getElementById('logTotalCount').innerText = data.totalCount; document.getElementById('logTotalChars').innerText = data.totalChars;
        document.getElementById('translationLogList').innerHTML = data.logs.map(l => `<tr><td>${new Date(l.time).toLocaleString()}</td><td>${l.targetLang}</td><td class="text-green-500">${l.chars}</td></tr>`).join('');
    }
}
function openChangePwd() { document.getElementById('newPwdInput').value = ''; document.getElementById('changePwdModal').classList.add('active'); }
async function savePassword() {
    const newPwd = document.getElementById('newPwdInput').value; if(!newPwd) return alert('密码不能为空');
    const res = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ newPassword: newPwd }) });
    if(res.ok) { alert('密码修改成功，请重新登录'); sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }
}
