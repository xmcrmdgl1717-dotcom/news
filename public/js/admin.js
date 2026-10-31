let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let allArticles = []; let allLangs = []; let allCategories = [];
let trackingConfig = { interval: 0, sources: [] };

// 省略字典，保持之前中英切换，仅展示核心
const adminI18n = {
    zh: { navDashboard: '📊 数据汇总', navArticles: '📝 文章管理', navCategories: '📁 板块管理', navTracking: '📡 追踪管理', navLanguages: '🌐 多语言', navTranslogs: '📈 翻译汇总', navSettings: '⚙️ 系统设置', changePwd: '修改密码', logout: '退出登录', pageDashboard: '数据汇总', pageArticles: '文章管理', pageCategories: '板块管理', pageTracking: '追踪管理', pageLanguages: '多语言管理', pageTranslogs: '翻译汇总', pageSettings: '系统设置', publishArticle: '发布新文章', statTotal: '总文章记录数' },
    en: { navDashboard: '📊 Dashboard', navArticles: '📝 Articles', navCategories: '📁 Categories', navTracking: '📡 Tracking', navLanguages: '🌐 Languages', navTranslogs: '📈 Logs', navSettings: '⚙️ Settings', changePwd: 'Change Pwd', logout: 'Logout', pageDashboard: 'Dashboard', pageArticles: 'Articles', pageCategories: 'Categories', pageTracking: 'Tracking', pageLanguages: 'Languages', pageTranslogs: 'Logs', pageSettings: 'Settings', publishArticle: 'Publish', statTotal: 'Total Articles' }
};
let currentAdminLang = localStorage.getItem('wad_admin_lang') || 'zh';

async function doLogin() {
    adminPwd = document.getElementById('adminPwd').value;
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return alert('密码错误');
    sessionStorage.setItem('wad_admin_pwd', adminPwd);
    document.getElementById('loginOverlay').style.display = 'none';
    fetchData();
}
function logout() { sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }

function toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark'); html.classList.toggle('light');
    localStorage.setItem('wad_theme', html.classList.contains('dark') ? 'dark' : 'light');
}
function toggleAdminLang() {
    currentAdminLang = currentAdminLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('wad_admin_lang', currentAdminLang);
    applyAdminLang();
}
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
    const dict = adminI18n[currentAdminLang];
    const navKey = el.getAttribute('data-i18n'); const pageKey = navKey ? navKey.replace('nav', 'page') : '';
    if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
    if (tabId === 'translogs') loadTranslationLogs();
}

// 图片上传
document.addEventListener('DOMContentLoaded', () => {
    const t = localStorage.getItem('wad_theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light'); document.documentElement.classList.add(t);
    applyAdminLang();
    if (sessionStorage.getItem('wad_admin_pwd')) {
        document.getElementById('loginOverlay').style.display = 'none'; fetchData();
    }
    quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    
    document.getElementById('artCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData });
            const data = await res.json();
            if (data.url) document.getElementById('artCoverUrl').value = data.url;
        } catch (err) { alert('图片上传失败'); }
    });
});

async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles; allLangs = data.languages; allCategories = data.categories;
    trackingConfig = data.tracking || { interval: 0, sources: [] };

    // 文章下拉框
    document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${currentAdminLang === 'zh' ? c.name_zh : c.name_en}</option>`).join('');
    document.getElementById('articleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-blue-600 dark:accent-[#f0b90b]" ${l.code === 'zh' ? 'checked disabled' : ''}> ${l.flag} ${l.name}</label>`).join('');

    // 列表渲染
    const groups = {};
    allArticles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    document.getElementById('articleList').innerHTML = Object.values(groups).map(group => {
        const main = group.find(a => a.lang === 'zh') || group[0];
        return `<div class="border p-3 rounded flex justify-between items-center" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);"><div><span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mr-2">${allCategories.find(c=>c.id === main.type)?.name_zh || '未分类'}</span><b>${main.title}</b></div><button onclick="deleteArticleGroup('${main.groupId}')" class="text-red-500 text-xs">删除</button></div>`;
    }).join('') || '暂无文章';

    document.getElementById('categoryList').innerHTML = allCategories.map(c => `<tr><td class="font-mono">${c.id}</td><td>${c.name_zh}</td><td>${c.name_en}</td><td><button onclick="deleteCategory('${c.id}')" class="text-red-500">删除</button></td></tr>`).join('');
    document.getElementById('languageList').innerHTML = allLangs.map(l => `<tr><td>${l.code}</td><td>${l.flag} ${l.name}</td><td><span class="px-2 py-1 rounded text-xs ${l.active ? 'bg-green-100 text-green-700' : 'bg-gray-200'}">${l.active ? '启用' : '禁用'}</span></td><td><button onclick="openEditLang('${l.code}')" class="text-blue-500 mr-2">编辑</button>${l.code !== 'zh' ? `<button onclick="autoTranslateDict('${l.code}')" class="text-yellow-500">一键机翻</button>` : ''}</td></tr>`).join('');

    document.getElementById('autoLangSwitch').checked = data.settings.autoLang || false;
    document.getElementById('deeplKey1').value = data.settings.deeplKey1 || '';
    document.getElementById('deeplKey2').value = data.settings.deeplKey2 || '';

    // 追踪配置渲染
    document.getElementById('trackingInterval').value = trackingConfig.interval;
    renderSources();
    loadStats();
}

function renderSources() {
    const tbody = document.getElementById('sourceList');
    if (!tbody) return;
    tbody.innerHTML = trackingConfig.sources.map((s, idx) => `
        <tr><td>${s.name}</td><td class="text-blue-500">${s.url}</td><td><button onclick="deleteSource(${idx})" class="text-red-500">删除</button></td></tr>
    `).join('');
}

async function saveTrackingConfig() {
    const interval = parseInt(document.getElementById('trackingInterval').value) || 0;
    await fetch('/api/admin/tracking/config', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ interval }) });
    alert('配置已保存');
}

async function addSource() {
    const name = document.getElementById('newSourceName').value.trim();
    const url = document.getElementById('newSourceUrl').value.trim();
    if (!name || !url) return alert('请填写完整');
    await fetch('/api/admin/tracking/source', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ name, url }) });
    document.getElementById('newSourceName').value = ''; document.getElementById('newSourceUrl').value = ''; fetchData();
}

async function deleteSource(index) {
    if (!confirm('确定删除该数据源？')) return;
    await fetch(`/api/admin/tracking/source/${index}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

async function submitArticle() {
    const type = document.getElementById('artType').value;
    const title = document.getElementById('artTitle').value;
    const summary = document.getElementById('artSummary').value;
    const coverUrl = document.getElementById('artCoverUrl').value;
    const content = quill.root.innerHTML;
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value);
    
    const btn = document.getElementById('articleSubmitBtn'); const old = btn.innerText;
    btn.innerText = '翻译中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/article/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) });
        const data = await res.json();
        if (data.success) {
            alert('发布成功！'); document.getElementById('artTitle').value = ''; document.getElementById('artSummary').value = ''; document.getElementById('artCoverUrl').value = ''; quill.setContents([]); fetchData();
        } else { alert('失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}

async function deleteArticleGroup(groupId) { if(confirm('确认删除？')) { await fetch(`/api/admin/article-group/${groupId}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); } }
async function addCategory() {
    const id = document.getElementById('newCatId').value.trim(); const zh = document.getElementById('newCatZh').value.trim(); const en = document.getElementById('newCatEn').value.trim();
    if(!id || !zh) return alert('请填写完整');
    await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ id, name_zh: zh, name_en: en }) });
    document.getElementById('newCatId').value = ''; document.getElementById('newCatZh').value = ''; document.getElementById('newCatEn').value = ''; fetchData();
}
async function deleteCategory(id) { if(confirm('确定删除该板块？')) { await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); } }
async function addLanguage() {
    const code = document.getElementById('newLangCode').value.trim(); const name = document.getElementById('newLangName').value.trim(); const flag = document.getElementById('newLangFlag').value.trim();
    if(!code || !name) return alert('请填写完整');
    await fetch('/api/admin/languages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ code, name, flag }) }); fetchData();
}
function openEditLang(code) { const l = allLangs.find(x => x.code === code); if(l) { document.getElementById('editLangCode').value = code; document.getElementById('editLangDict').value = JSON.stringify(l.dict || {}, null, 2); document.getElementById('editLangModal').classList.add('active'); } }
async function saveLangDict() {
    const code = document.getElementById('editLangCode').value;
    try { const dict = JSON.parse(document.getElementById('editLangDict').value); await fetch(`/api/admin/languages/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ dict }) }); document.getElementById('editLangModal').classList.remove('active'); fetchData(); } catch (e) { alert('JSON 格式错误'); }
}
async function autoTranslateDict(code) {
    if(!confirm(`自动翻译 [${code}] 字典？`)) return;
    const btn = event.target; const old = btn.innerText; btn.innerText = '翻译中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/languages/translate-dict', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ targetLang: code }) });
        const data = await res.json(); if (data.success) { alert('成功'); fetchData(); } else alert('失败');
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}
async function saveSettings() {
    const deeplKey1 = document.getElementById('deeplKey1').value; const deeplKey2 = document.getElementById('deeplKey2').value; const autoLang = document.getElementById('autoLangSwitch').checked;
    await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ deeplKey1, deeplKey2, autoLang }) }); alert('已保存');
}
async function loadStats() {
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-pwd': adminPwd } }); const stats = await res.json();
    document.getElementById('statTotal').innerText = stats.total;
    document.getElementById('categoryStats').innerHTML = allCategories.map(c => `<div class="card p-4"><div class="text-sm text-gray-500">${c.name_zh}</div><div class="text-2xl font-bold text-blue-500 mt-1">${stats.byCategory[c.id] || 0}</div></div>`).join('');
}
async function loadTranslationLogs() {
    const res = await fetch('/api/admin/translation-logs', { headers: { 'x-admin-pwd': adminPwd } }); const data = await res.json();
    document.getElementById('logTotalCount').innerText = data.totalCount; document.getElementById('logTotalChars').innerText = data.totalChars;
    document.getElementById('translationLogList').innerHTML = data.logs.map(l => `<tr><td>${new Date(l.time).toLocaleString()}</td><td>${l.targetLang}</td><td class="text-green-500">${l.chars}</td></tr>`).join('');
}
function openChangePwd() { document.getElementById('newPwdInput').value = ''; document.getElementById('changePwdModal').classList.add('active'); }
async function savePassword() {
    const newPwd = document.getElementById('newPwdInput').value; if(!newPwd) return alert('密码不能为空');
    const res = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ newPassword: newPwd }) });
    if(res.ok) { alert('密码修改成功，请重新登录'); sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }
}
