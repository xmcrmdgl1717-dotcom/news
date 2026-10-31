let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let allArticles = [];
let allLangs = [];
let allCategories = [];

// ================= 中英双语字典 =================
const adminI18n = {
    zh: {
        navDashboard: '📊 数据汇总', navArticles: '📝 文章管理', navCategories: '📁 板块管理',
        navLanguages: '🌐 多语言管理', navTranslogs: '📈 翻译汇总', navSettings: '⚙️ 系统设置',
        changePwd: '修改密码', logout: '退出登录',
        pageDashboard: '数据汇总', pageArticles: '文章管理', pageCategories: '板块管理',
        pageLanguages: '多语言管理', pageTranslogs: '翻译汇总', pageSettings: '系统设置',
        statTotal: '总文章记录数 (全语言)', publishArticle: '发布新文章', labelCategory: '所属板块',
        labelLangs: '发布语言（勾选后自动机翻）：', phTitle: '源标题', phSummary: '源摘要',
        btnPublish: '智能翻译并发布', publishedArticles: '已发布文章', addCategoryTitle: '添加新板块',
        btnAdd: '添加', thId: 'ID', thZhName: '中文名', thEnName: '英文名', thAction: '操作',
        addLangTitle: '添加新语言', thCode: '代码', thName: '名称', thStatus: '状态',
        transCount: '总翻译次数', transChars: '总消耗字符', thTime: '时间', thTargetLang: '目标语言', thChars: '消耗字符',
        settingsTitle: '语言与翻译配置', autoLang: '自动 IP 识别语言', autoLangDesc: '开启后，用户首次访问将根据 IP 自动选择对应语言',
        btnSaveConfig: '保存配置', editDictTitle: '编辑语言字典 JSON', btnSave: '保存', btnCancel: '取消',
        changePwdTitle: '修改后台密码', phNewPwd: '输入新密码'
    },
    en: {
        navDashboard: '📊 Dashboard', navArticles: '📝 Articles', navCategories: '📁 Categories',
        navLanguages: '🌐 Languages', navTranslogs: '📈 Trans Logs', navSettings: '⚙️ Settings',
        changePwd: 'Change Password', logout: 'Logout',
        pageDashboard: 'Dashboard', pageArticles: 'Article Management', pageCategories: 'Category Management',
        pageLanguages: 'Language Management', pageTranslogs: 'Translation Logs', pageSettings: 'Settings',
        statTotal: 'Total Articles (All Langs)', publishArticle: 'Publish New Article', labelCategory: 'Category',
        labelLangs: 'Publish Languages (Auto Translate):', phTitle: 'Source Title', phSummary: 'Source Summary',
        btnPublish: 'Translate & Publish', publishedArticles: 'Published Articles', addCategoryTitle: 'Add New Category',
        btnAdd: 'Add', thId: 'ID', thZhName: 'ZH Name', thEnName: 'EN Name', thAction: 'Action',
        addLangTitle: 'Add New Language', thCode: 'Code', thName: 'Name', thStatus: 'Status',
        transCount: 'Total Translations', transChars: 'Total Characters', thTime: 'Time', thTargetLang: 'Target Lang', thChars: 'Chars',
        settingsTitle: 'Language & Translation Settings', autoLang: 'Auto IP Language Detection', autoLangDesc: 'Automatically select language based on user IP on first visit.',
        btnSaveConfig: 'Save Config', editDictTitle: 'Edit Language Dictionary JSON', btnSave: 'Save', btnCancel: 'Cancel',
        changePwdTitle: 'Change Admin Password', phNewPwd: 'Enter new password'
    }
};
let currentAdminLang = localStorage.getItem('wad_admin_lang') || 'zh';

// ================= 初始化与验证 =================
async function doLogin() {
    adminPwd = document.getElementById('adminPwd').value;
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return alert('密码错误 / Wrong password');
    sessionStorage.setItem('wad_admin_pwd', adminPwd);
    document.getElementById('loginOverlay').style.display = 'none';
    fetchData();
}

function logout() { sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }

document.addEventListener('DOMContentLoaded', () => {
    // 恢复主题
    const t = localStorage.getItem('wad_theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(t);

    // 应用语言
    applyAdminLang();

    if (sessionStorage.getItem('wad_admin_pwd')) {
        document.getElementById('loginOverlay').style.display = 'none';
        fetchData();
    }

    // 初始化编辑器
    quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] }
    });
});

// ================= 主题与语言切换 =================
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
        localStorage.setItem('wad_theme', 'light');
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        localStorage.setItem('wad_theme', 'dark');
    }
}

function toggleAdminLang() {
    currentAdminLang = currentAdminLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('wad_admin_lang', currentAdminLang);
    applyAdminLang();
}

function applyAdminLang() {
    const dict = adminI18n[currentAdminLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerText = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });

    document.getElementById('adminLangLabel').innerText = currentAdminLang === 'zh' ? 'EN' : '中';

    // 更新当前页面标题
    const activeMenu = document.querySelector('.menu-item.active');
    if (activeMenu) {
        const navKey = activeMenu.getAttribute('data-i18n');
        const pageKey = navKey ? navKey.replace('nav', 'page') : 'pageDashboard';
        if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
    }
}

// ================= Tab 切换 =================
function switchTab(tabId, el) {
    document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const dict = adminI18n[currentAdminLang];
    const navKey = el.getAttribute('data-i18n');
    const pageKey = navKey ? navKey.replace('nav', 'page') : '';
    if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
    
    if (tabId === 'translogs') loadTranslationLogs();
    if (tabId === 'dashboard') loadStats();
}

// ================= 数据加载 =================
async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles;
    allLangs = data.languages;
    allCategories = data.categories;

    // 文章板块下拉
    document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${currentAdminLang === 'zh' ? c.name_zh : c.name_en}</option>`).join('');

    // 发布语言勾选
    document.getElementById('articleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => 
        `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-blue-600 dark:accent-[#f0b90b]" ${l.code === 'zh' ? 'checked disabled' : ''}> ${l.flag} ${l.name}</label>`
    ).join('');

    // 文章列表
    const groups = {};
    allArticles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    document.getElementById('articleList').innerHTML = Object.values(groups).map(group => {
        const main = group.find(a => a.lang === 'zh') || group[0];
        return `
            <div class="border border-gray-200 dark:border-slate-700 p-3 rounded bg-gray-50 dark:bg-[#0f172a] flex justify-between items-center transition">
                <div class="truncate pr-4">
                    <span class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded mr-2">${allCategories.find(c=>c.id === main.type)?.name_zh || '未分类'}</span>
                    <b>${main.title}</b>
                </div>
                <button onclick="deleteArticleGroup('${main.groupId}')" class="text-red-500 text-xs hover:underline flex-shrink-0">删除</button>
            </div>
        `;
    }).join('') || '暂无文章';

    // 多语言列表
    document.getElementById('languageList').innerHTML = allLangs.map(l => `
        <tr class="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <td class="p-4">${l.code}</td>
            <td class="p-4">${l.flag} ${l.name}</td>
            <td class="p-4"><span class="px-2 py-1 rounded text-xs ${l.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700'}">${l.active ? '启用' : '禁用'}</span></td>
            <td class="p-4 flex gap-2">
                <button onclick="openEditLang('${l.code}')" class="text-blue-500 hover:underline">编辑字典</button>
                ${l.code !== 'zh' ? `<button onclick="autoTranslateDict('${l.code}')" class="text-[#f0b90b] hover:underline ml-2">一键机翻字典</button>` : ''}
            </td>
        </tr>
    `).join('');

    // 板块列表
    document.getElementById('categoryList').innerHTML = allCategories.map(c => `
        <tr class="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <td class="p-4 font-mono">${c.id}</td>
            <td class="p-4">${c.name_zh}</td>
            <td class="p-4">${c.name_en}</td>
            <td class="p-4"><button onclick="deleteCategory('${c.id}')" class="text-red-500 hover:underline">删除</button></td>
        </tr>
    `).join('');

    // 设置项
    document.getElementById('autoLangSwitch').checked = data.settings.autoLang || false;
    document.getElementById('deeplKey1').value = data.settings.deeplKey1 || '';
    document.getElementById('deeplKey2').value = data.settings.deeplKey2 || '';

    loadStats();
}

async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats', { headers: { 'x-admin-pwd': adminPwd } });
        const stats = await res.json();
        document.getElementById('statTotal').innerText = stats.total;
        
        let catHtml = '';
        allCategories.forEach(c => {
            catHtml += `
                <div class="card p-4">
                    <div class="text-sm text-gray-500 dark:text-gray-400">${currentAdminLang === 'zh' ? c.name_zh : c.name_en}</div>
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">${stats.byCategory[c.id] || 0}</div>
                </div>
            `;
        });
        document.getElementById('categoryStats').innerHTML = catHtml;
    } catch (e) { console.error(e); }
}

// ================= 业务操作 =================
async function submitArticle() {
    const type = document.getElementById('artType').value;
    const title = document.getElementById('artTitle').value;
    const summary = document.getElementById('artSummary').value;
    const content = quill.root.innerHTML;
    if (!title) return alert('请输入标题');
    
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value);
    if (checkedLangs.length === 0) return alert('请至少勾选一个语言');

    const btn = document.getElementById('articleSubmitBtn');
    const originalText = btn.innerText;
    btn.innerText = '翻译中...'; btn.disabled = true;

    try {
        const res = await fetch('/api/admin/article/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type })
        });
        const data = await res.json();
        if (data.success) {
            alert('发布成功！'); 
            document.getElementById('artTitle').value = '';
            document.getElementById('artSummary').value = '';
            quill.setContents([]);
            fetchData();
        } else {
            alert('失败: ' + (data.error || '未知错误'));
        }
    } catch(e) { alert('网络错误'); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
}

async function deleteArticleGroup(groupId) {
    if(!confirm('确认删除该文章的所有语言版本？')) return;
    await fetch(`/api/admin/article-group/${groupId}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

async function addCategory() {
    const id = document.getElementById('newCatId').value.trim();
    const zh = document.getElementById('newCatZh').value.trim();
    const en = document.getElementById('newCatEn').value.trim();
    if(!id || !zh) return alert('请填写ID和中文名');
    
    await fetch('/api/admin/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ id, name_zh: zh, name_en: en })
    });
    document.getElementById('newCatId').value = '';
    document.getElementById('newCatZh').value = '';
    document.getElementById('newCatEn').value = '';
    fetchData();
}

async function deleteCategory(id) {
    if(!confirm('确认删除该板块？')) return;
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

async function addLanguage() {
    const code = document.getElementById('newLangCode').value.trim();
    const name = document.getElementById('newLangName').value.trim();
    const flag = document.getElementById('newLangFlag').value.trim();
    if(!code || !name) return alert('请填写完整');
    await fetch('/api/admin/languages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ code, name, flag })
    });
    fetchData();
}

function openEditLang(code) {
    const lang = allLangs.find(l => l.code === code);
    if(!lang) return;
    document.getElementById('editLangCode').value = code;
    document.getElementById('editLangDict').value = JSON.stringify(lang.dict || {}, null, 2);
    document.getElementById('editLangModal').classList.add('active');
}

async function saveLangDict() {
    const code = document.getElementById('editLangCode').value;
    try {
        const dict = JSON.parse(document.getElementById('editLangDict').value);
        await fetch(`/api/admin/languages/${code}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify({ dict })
        });
        document.getElementById('editLangModal').classList.remove('active');
        fetchData();
    } catch (e) { alert('JSON 格式错误'); }
}

async function autoTranslateDict(code) {
    if(!confirm(`确定要使用 DeepL 自动覆盖翻译 [${code}] 的整个菜单字典吗？`)) return;
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = '翻译中...'; btn.disabled = true;

    try {
        const res = await fetch('/api/admin/languages/translate-dict', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify({ targetLang: code })
        });
        const data = await res.json();
        if (data.success) {
            alert('字典一键翻译成功！');
            fetchData();
        } else {
            alert('失败: ' + (data.error || data.reason || '未知错误'));
        }
    } catch(e) { alert('网络错误'); }
    finally { btn.innerText = originalText; btn.disabled = false; }
}

async function saveSettings() {
    const deeplKey1 = document.getElementById('deeplKey1').value;
    const deeplKey2 = document.getElementById('deeplKey2').value;
    const autoLang = document.getElementById('autoLangSwitch').checked;
    
    const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ deeplKey1, deeplKey2, autoLang })
    });
    if (res.ok) alert('配置已保存');
}

async function loadTranslationLogs() {
    const res = await fetch('/api/admin/translation-logs', { headers: { 'x-admin-pwd': adminPwd } });
    const data = await res.json();
    document.getElementById('logTotalCount').innerText = data.totalCount;
    document.getElementById('logTotalChars').innerText = data.totalChars;
    document.getElementById('translationLogList').innerHTML = data.logs.map(l => `
        <tr class="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <td class="p-4 text-gray-500">${new Date(l.time).toLocaleString()}</td>
            <td class="p-4 font-bold">${l.targetLang}</td>
            <td class="p-4 text-green-600 dark:text-green-500 font-bold">${l.chars}</td>
        </tr>
    `).join('');
}

// ================= 密码修改 =================
function openChangePwd() {
    document.getElementById('newPwdInput').value = '';
    document.getElementById('changePwdModal').classList.add('active');
}

async function savePassword() {
    const newPwd = document.getElementById('newPwdInput').value;
    if(!newPwd) return alert('密码不能为空');
    
    const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ newPassword: newPwd })
    });
    
    if(res.ok) {
        alert('密码修改成功，请重新登录');
        sessionStorage.removeItem('wad_admin_pwd');
        location.reload();
    } else {
        alert('修改失败');
    }
}
