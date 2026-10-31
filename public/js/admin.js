// ================= 全局变量 =================
let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let editQuill = null;
let allArticles = []; 
let allLangs = []; 
let allCategories = [];
let globalTrackingConfig = { interval: 0, maxLogs: 100, sources: [], logs: [] };
let globalSettings = {};
let globalVisits = [];
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
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData });
            const data = await res.json();
            if (data.url) document.getElementById('artCoverUrl').value = data.url;
        } catch (err) { alert('图片上传失败'); }
    });

    document.getElementById('editArtCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData });
            const data = await res.json();
            if (data.url) document.getElementById('editArtCoverUrl').value = data.url;
        } catch (err) { alert('图片上传失败'); }
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
function toggleAdminLang() { /* 省略 */ }

function switchTab(tabId, el) {
    document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    el.classList.add('active'); document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('pageTitle').innerText = el.innerText.trim().substring(2);
    if (tabId === 'translogs') loadTranslationLogs();
}

// ================= 数据拉取与渲染 =================
async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles || []; allLangs = data.languages || []; allCategories = data.categories || [];
    globalTrackingConfig = data.tracking || { interval: 0, maxLogs: 100, sources: [], logs: [] };
    globalSettings = data.settings || {}; globalVisits = data.visits || [];
    const crawl = data.crawl || {};

    // 1. 渲染下拉与列表
    if(document.getElementById('artType')) document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name_zh}</option>`).join('');
    if(document.getElementById('categoryList')) {
        document.getElementById('categoryList').innerHTML = allCategories.map(c => `
            <tr>
                <td class="font-mono">${c.id}</td><td>${c.name_zh}</td><td>${c.name_en}</td>
                <td>
                    <button onclick="openEditCategory('${c.id}')" class="text-blue-500 mr-2 hover:underline">编辑</button>
                    <button onclick="deleteCategory('${c.id}')" class="text-red-500 hover:underline">删除</button>
                </td>
            </tr>
        `).join('');
    }

    // 2. 渲染文章采集设置
    if(document.getElementById('crawlConfigCode')) {
        document.getElementById('crawlEnabled').checked = crawl.enabled || false;
        document.getElementById('crawlInterval').value = crawl.interval || 30;
        document.getElementById('crawlLimit').value = crawl.limit || 10;
        document.getElementById('crawlConfigCode').value = crawl.codeConfig || '';
    }

    // 3. 渲染追踪设置
    if(document.getElementById('trackingInterval')) {
        document.getElementById('trackingInterval').value = globalTrackingConfig.interval || 0;
        document.getElementById('trackingMaxLogs').value = globalTrackingConfig.maxLogs || 100;
    }
    renderSources();
    renderTrackingLogs();

    // 4. 渲染数据汇总
    calculateStats();
    applyFilters();
}

// ================= 板块编辑 =================
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

// ================= 数据汇总渲染 =================
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
    if (type === 'custom') {
        customInputs.classList.remove('hidden'); customInputs.classList.add('flex');
    } else {
        customInputs.classList.add('hidden'); customInputs.classList.remove('flex');
    }
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
function exportCSV() { /* 保持原样 */ }
function loadVisits() { fetchData(); }

// ================= 采集管理 =================
async function saveCrawlConfig() {
    const enabled = document.getElementById('crawlEnabled').checked;
    const interval = document.getElementById('crawlInterval').value;
    const limit = document.getElementById('crawlLimit').value;
    const codeConfig = document.getElementById('crawlConfigCode').value;

    try { JSON.parse(codeConfig); } catch (e) { return alert('JSON 格式错误，请检查语法'); }

    await fetch('/api/admin/crawl', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ enabled, interval, limit, codeConfig })
    });
    alert('采集配置已保存');
    fetchData();
}

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
                <div class="font-bold text-gray-700">${l.title.zh || '无中文'}</div>
                <div class="text-xs text-gray-400 mt-1">
                    ${l.title.en ? 'EN: ' + l.title.en : ''}
                    ${l.title.ja ? ' | JA: ' + l.title.ja : ''}
                </div>
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

// 省略文章管理、多语言、设置等代码，这些可以保持原样
