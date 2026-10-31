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

// 分页相关状态
let currentPage = 1;
let pageSize = 50;
let filteredVisits = []; // 存放当前筛选后的结果

const adminI18n = {
    zh: { navDashboard: '📊 数据汇总', navArticles: '📝 文章管理', navCategories: '📁 板块管理', navTracking: '📡 追踪管理', navLanguages: '🌐 多语言', navTranslogs: '📈 翻译汇总', navSettings: '⚙️ 系统设置', changePwd: '修改密码', logout: '退出登录', pageDashboard: '数据汇总', pageArticles: '文章管理', pageCategories: '板块管理', pageTracking: '追踪管理', pageLanguages: '多语言管理', pageTranslogs: '翻译汇总', pageSettings: '系统设置', publishArticle: '发布新文章', statTotal: '总文章记录数' },
    en: { navDashboard: '📊 Dashboard', navArticles: '📝 Articles', navCategories: '📁 Categories', navTracking: '📡 Tracking', navLanguages: '🌐 Languages', navTranslogs: '📈 Logs', navSettings: '⚙️ Settings', changePwd: 'Change Pwd', logout: 'Logout', pageDashboard: 'Dashboard', pageArticles: 'Articles', pageCategories: 'Categories', pageTracking: 'Tracking', pageLanguages: 'Languages', pageTranslogs: 'Logs', pageSettings: 'Settings', publishArticle: 'Publish', statTotal: 'Total Articles' }
};
let currentAdminLang = localStorage.getItem('wad_admin_lang') || 'zh';

document.addEventListener('DOMContentLoaded', () => {
    const t = localStorage.getItem('wad_theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light'); document.documentElement.classList.add(t);
    
    applyAdminLang();
    
    if (sessionStorage.getItem('wad_admin_pwd')) {
        document.getElementById('loginOverlay').style.display = 'none'; 
        fetchData();
    }
    
    if(document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    }
    if(document.getElementById('edit-editor-container')) {
        editQuill = new Quill('#edit-editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    }
    
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

    // 初始化时设置默认分页条数
    const sizeSelect = document.getElementById('pageSizeSelect');
    if(sizeSelect) pageSize = parseInt(sizeSelect.value) || 50;
});

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
function toggleAdminLang() { currentAdminLang = currentAdminLang === 'zh' ? 'en' : 'zh'; localStorage.setItem('wad_admin_lang', currentAdminLang); applyAdminLang(); }
function applyAdminLang() {
    const dict = adminI18n[currentAdminLang];
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (dict[key]) el.innerText = dict[key]; });
    document.getElementById('adminLangLabel').innerText = currentAdminLang === 'zh' ? 'EN' : '中';
    const activeMenu = document.querySelector('.menu-item.active');
    if (activeMenu) {
        const navKey = activeMenu.getAttribute('data-i18n');
        const pageKey = navKey ? navKey.replace('nav', 'page') : 'pageDashboard';
        if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
    }
}
function switchTab(tabId, el) {
    document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    el.classList.add('active'); document.getElementById('tab-' + tabId).classList.add('active');
    const dict = adminI18n[currentAdminLang]; const navKey = el.getAttribute('data-i18n'); const pageKey = navKey ? navKey.replace('nav', 'page') : '';
    if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
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

    // ... 文章渲染、分类、语言设置等代码保持不变，只展示数据汇总部分 ...
    
    if(document.getElementById('artType')) document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${currentAdminLang === 'zh' ? c.name_zh : c.name_en}</option>`).join('');
    if(document.getElementById('editArtType')) document.getElementById('editArtType').innerHTML = allCategories.map(c => `<option value="${c.id}">${currentAdminLang === 'zh' ? c.name_zh : c.name_en}</option>`).join('');
    // ... (省略部分重复代码)

    calculateStats(); 
    applyFilters(); // 重新筛选并渲染
}

// ======================= 数据汇总相关逻辑 =======================
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

// 控制自定义日期输入框的显示/隐藏
function toggleDateInputs() {
    const type = document.getElementById('filterDateType').value;
    const customInputs = document.getElementById('customDateInputs');
    if (type === 'custom') {
        customInputs.classList.remove('hidden');
        customInputs.classList.add('flex');
    } else {
        customInputs.classList.add('hidden');
        customInputs.classList.remove('flex');
    }
    applyFilters();
}

function applyFilters() {
    if (!document.getElementById('filterDevice')) return;
    
    // 1. 获取所有筛选条件
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
    let filterStart = null;
    let filterEnd = null;

    // 处理日期范围
    if (dateType === 'today') {
        filterStart = new Date(now.setHours(0,0,0,0));
    } else if (dateType === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        filterStart = new Date(yesterday.setHours(0,0,0,0));
        filterEnd = new Date(yesterday.setHours(23,59,59,999));
    } else if (dateType === 'week') {
        const week = new Date(now);
        week.setDate(week.getDate() - 7);
        filterStart = new Date(week.setHours(0,0,0,0));
    } else if (dateType === 'month') {
        const month = new Date(now);
        month.setDate(month.getDate() - 30);
        filterStart = new Date(month.setHours(0,0,0,0));
    } else if (dateType === 'custom' && startDateStr && endDateStr) {
        filterStart = new Date(startDateStr);
        filterEnd = new Date(endDateStr);
        filterEnd.setHours(23,59,59,999); // 包含结束当天
    }

    // 2. 执行过滤
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

    // 3. 更新统计与分页
    if(document.getElementById('filteredCount')) document.getElementById('filteredCount').innerText = filteredVisits.length;
    
    // 重置到第一页
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

// ======================= 分页渲染 =======================
function renderPagination() {
    const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    document.getElementById('pageInfo').innerText = `第 ${currentPage} / ${totalPages} 页`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;

    // 切片当前页数据
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const currentList = filteredVisits.slice(start, end);
    
    renderVisitsList(currentList);
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1;
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPagination();
    }
}

function changePageSize(newSize) {
    pageSize = parseInt(newSize) || 50;
    currentPage = 1; // 改变条数默认回到第一页
    renderPagination();
}

// ======================= 列表渲染 =======================
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

function quickSearch(category, value) { 
    document.getElementById('searchInput').value = value; 
    // 搜索会自动触发 applyFilters，这里不重复调用了
    applyFilters(); 
}

async function deleteVisits() {
    const cbs = document.querySelectorAll('.visit-cb:checked');
    if (cbs.length === 0) return alert('请先勾选要删除的数据');
    if (!confirm(`确定要删除选中的 ${cbs.length} 条数据吗？`)) return;
    const ids = Array.from(cbs).map(cb => cb.value);
    try {
        await fetch('/api/admin/visits/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ ids }) });
        fetchData();
    } catch (e) { alert('网络错误'); }
}

function exportCSV() {
    const rows = [['地址', 'IP', '国家', '设备', '系统', '浏览器', '语言', '进入时间', '提交时间', '退出时间', '停留(秒)', '指纹']];
    // 导出当前筛选出的所有数据（不仅仅是当前页）
    const toExport = filteredVisits;

    if (toExport.length === 0) return alert('当前筛选结果为空，无法导出');

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

// ================= 后续逻辑（追踪、文章、语言、设置保持不变） =================
// 省略这些部分的代码以免影响阅读，你可以直接将之前的代码复制粘贴到这里
// 确保 renderSources, renderTrackingLogs, editArticleGroup, submitArticle 等函数完整存在

// ... 将之前的 admin.js 剩余部分贴在这里 ...
