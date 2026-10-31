// ================= 全局变量 =================
let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let editQuill = null;
let allArticles = []; 
let allLangs = []; 
let allCategories = [];
let trackingConfig = { interval: 0, sources: [] };
let globalSettings = {};

// ================= 后台界面多语言字典 =================
const adminI18n = {
    zh: { 
        navDashboard: '📊 数据汇总', navArticles: '📝 文章管理', navCategories: '📁 板块管理', 
        navTracking: '📡 追踪管理', navLanguages: '🌐 多语言', navTranslogs: '📈 翻译汇总', navSettings: '⚙️ 系统设置', 
        changePwd: '修改密码', logout: '退出登录', 
        pageDashboard: '数据汇总', pageArticles: '文章管理', pageCategories: '板块管理', 
        pageTracking: '追踪管理', pageLanguages: '多语言管理', pageTranslogs: '翻译汇总', pageSettings: '系统设置', 
        publishArticle: '发布新文章', statTotal: '总文章记录数' 
    },
    en: { 
        navDashboard: '📊 Dashboard', navArticles: '📝 Articles', navCategories: '📁 Categories', 
        navTracking: '📡 Tracking', navLanguages: '🌐 Languages', navTranslogs: '📈 Logs', navSettings: '⚙️ Settings', 
        changePwd: 'Change Pwd', logout: 'Logout', 
        pageDashboard: 'Dashboard', pageArticles: 'Articles', pageCategories: 'Categories', 
        pageTracking: 'Tracking', pageLanguages: 'Languages', pageTranslogs: 'Logs', pageSettings: 'Settings', 
        publishArticle: 'Publish', statTotal: 'Total Articles' 
    }
};
let currentAdminLang = localStorage.getItem('wad_admin_lang') || 'zh';

// ================= 初始化与验证 =================
document.addEventListener('DOMContentLoaded', () => {
    const t = localStorage.getItem('wad_theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light'); 
    document.documentElement.classList.add(t);
    
    applyAdminLang();
    
    if (sessionStorage.getItem('wad_admin_pwd')) {
        document.getElementById('loginOverlay').style.display = 'none'; 
        fetchData();
    }
    
    if(document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', { 
            theme: 'snow', 
            modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } 
        });
    }
    if(document.getElementById('edit-editor-container')) {
        editQuill = new Quill('#edit-editor-container', { 
            theme: 'snow', 
            modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } 
        });
    }
    
    // 绑定主表单封面图上传
    document.getElementById('artCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; 
        if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData });
            const data = await res.json();
            if (data.url) document.getElementById('artCoverUrl').value = data.url;
        } catch (err) { alert('图片上传失败，请重试'); }
    });

    // 绑定弹窗表单封面图上传
    document.getElementById('editArtCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; 
        if (!file) return;
        const formData = new FormData(); formData.append('image', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData });
            const data = await res.json();
            if (data.url) document.getElementById('editArtCoverUrl').value = data.url;
        } catch (err) { alert('图片上传失败，请重试'); }
    });
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
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        const key = el.getAttribute('data-i18n'); 
        if (dict[key]) el.innerText = dict[key]; 
    });
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
    el.classList.add('active'); 
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const dict = adminI18n[currentAdminLang];
    const navKey = el.getAttribute('data-i18n'); 
    const pageKey = navKey ? navKey.replace('nav', 'page') : '';
    if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
    
    if (tabId === 'translogs') loadTranslationLogs();
}

// ================= 数据拉取与渲染 =================
async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles; 
    allLangs = data.languages; 
    allCategories = data.categories;
    trackingConfig = data.tracking || { interval: 0, sources: [] };
    globalSettings = data.settings;

    // 主表单的板块下拉和语言勾选
    const catOptions = allCategories.map(c => `<option value="${c.id}">${currentAdminLang === 'zh' ? c.name_zh : c.name_en}</option>`).join('');
    document.getElementById('artType').innerHTML = catOptions;
    document.getElementById('editArtType').innerHTML = catOptions; // 弹窗的下拉
    
    document.getElementById('articleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => 
        `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-blue-600 dark:accent-[#f0b90b]" ${l.code === 'zh' ? 'checked disabled' : ''}> ${l.flag} ${l.name}</label>`
    ).join('');

    // 渲染右侧文章列表
    const groups = {};
    allArticles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    
    let articleHtml = '';
    Object.values(groups).forEach(group => {
        const main = group.find(a => a.lang === 'zh') || group[0];
        const otherLangs = group.filter(a => a.lang !== main.lang);
        
        articleHtml += `
        <div class="border p-3 rounded flex flex-col" style="border-color: var(--cms-border); background: rgba(128,128,128,0.05);">
            <div class="flex justify-between items-center w-full">
                <div class="flex-1 min-w-0 pr-2">
                    <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mr-2 shrink-0">${allCategories.find(c=>c.id === main.type)?.name_zh || '未分类'}</span>
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
    document.getElementById('articleList').innerHTML = articleHtml || '<div class="text-gray-500 text-center py-4">暂无文章</div>';

    // 其他渲染（分类、语言、设置等保持不变）
    document.getElementById('categoryList').innerHTML = allCategories.map(c => 
        `<tr><td class="font-mono">${c.id}</td><td>${c.name_zh}</td><td>${c.name_en}</td><td><button onclick="deleteCategory('${c.id}')" class="text-red-500">删除</button></td></tr>`
    ).join('');
    
    document.getElementById('languageList').innerHTML = allLangs.map(l => 
        `<tr>
            <td>${l.code}</td>
            <td>${l.flag} ${l.name}</td>
            <td><span class="px-2 py-1 rounded text-xs ${l.active ? 'bg-green-100 text-green-700' : 'bg-gray-200'}">${l.active ? '启用' : '禁用'}</span></td>
            <td>
                <button onclick="openEditLang('${l.code}')" class="text-blue-500 mr-2">编辑字典</button>
                ${l.code !== 'zh' ? `<button onclick="autoTranslateDict('${l.code}')" class="text-yellow-500">一键机翻</button>` : ''}
            </td>
        </tr>`
    ).join('');

    document.getElementById('autoLangSwitch').checked = globalSettings.autoLang || false;
    document.getElementById('deeplKey1').value = globalSettings.deeplKey1 || '';
    document.getElementById('deeplKey2').value = globalSettings.deeplKey2 || '';
    document.getElementById('checkWaitTime').value = globalSettings.checkWaitTime || 5;

    const toolDesc = globalSettings.toolDesc || {};
    document.getElementById('toolDescZh').value = toolDesc.zh || '';
    document.getElementById('toolDescLangCheckboxes').innerHTML = allLangs.filter(l => l.active && l.code !== 'zh').map(l => {
        const isTranslated = toolDesc[l.code] && toolDesc[l.code].trim() !== '';
        return `<label class="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" value="${l.code}" class="accent-blue-600 dark:accent-[#f0b90b] tool-desc-lang-cb" ${isTranslated ? 'checked' : ''}>
            ${l.flag} ${l.name}
        </label>`;
    }).join('');

    document.getElementById('trackingInterval').value = trackingConfig.interval;
    renderSources();
    loadStats();
}

function renderSources() {
    const tbody = document.getElementById('sourceList');
    if (!tbody) return;
    tbody.innerHTML = trackingConfig.sources.map((s, idx) => `
        <tr><td>${s.name}</td><td class="text-blue-500">${s.url}</td><td><button onclick="deleteSource(${idx})" class="text-red-500 hover:underline">删除</button></td></tr>
    `).join('');
}

// ================= 业务操作：文章模块 =================

// 打开弹窗，回填编辑数据
function editArticleGroup(groupId) {
    const group = allArticles.filter(a => a.groupId === groupId);
    if (!group || group.length === 0) return;
    
    const main = group.find(a => a.lang === 'zh') || group[0];
    const existingLangs = group.map(a => a.lang); // 获取该组已经存在的语言
    
    document.getElementById('editArticleGroupId').value = groupId;
    document.getElementById('editArtType').value = main.type;
    document.getElementById('editArtTitle').value = main.title;
    document.getElementById('editArtSummary').value = main.summary;
    document.getElementById('editArtCoverUrl').value = main.coverUrl || '';
    editQuill.root.innerHTML = main.content || '';
    
    // 渲染弹窗内的语言勾选框，带“已翻译/未翻译”标识
    document.getElementById('editArticleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => {
        const isTranslated = existingLangs.includes(l.code);
        const disabled = l.code === 'zh' ? 'disabled' : '';
        
        // 如果已经翻译，默认勾选；如果没翻译，默认不勾选。中文始终勾选
        const checked = (l.code === 'zh' || isTranslated) ? 'checked' : '';
        
        // 区分已翻译/未翻译的 UI
        const badge = isTranslated ? 
            `<span class="text-green-500 text-[10px] bg-green-100 px-1.5 py-0.5 rounded">已翻译</span>` : 
            `<span class="text-red-500 text-[10px] bg-red-100 px-1.5 py-0.5 rounded">未翻译</span>`;
            
        return `<label class="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition">
            <input type="checkbox" value="${l.code}" class="edit-article-lang-cb accent-blue-600 dark:accent-[#f0b90b]" ${checked} ${disabled}>
            ${l.flag} ${l.name} ${badge}
        </label>`;
    }).join('');
    
    document.getElementById('editArticleModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editArticleModal').classList.remove('active');
    document.getElementById('editArticleGroupId').value = '';
}

// 提交弹窗的修改
async function submitEditArticle() {
    const groupId = document.getElementById('editArticleGroupId').value;
    if (!groupId) return;

    const type = document.getElementById('editArtType').value;
    const title = document.getElementById('editArtTitle').value;
    const summary = document.getElementById('editArtSummary').value;
    const coverUrl = document.getElementById('editArtCoverUrl').value;
    const content = editQuill.root.innerHTML;
    
    if (!title) return alert('请输入标题');
    
    // 收集勾选的语言
    const checkedLangs = Array.from(document.querySelectorAll('.edit-article-lang-cb:checked')).map(cb => cb.value);
    
    const btn = document.getElementById('editArticleSubmitBtn'); 
    const old = btn.innerText;
    btn.innerText = '翻译并保存中...'; btn.disabled = true;
    
    try {
        // 调用整组更新接口
        const res = await fetch(`/api/admin/article-group/${groupId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, 
            body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) 
        });
        const data = await res.json();
        
        if (data.success) {
            alert('修改并同步翻译成功！'); 
            closeEditModal(); 
            fetchData();
        } else { 
            alert('失败: ' + (data.error || '未知错误')); 
        }
    } catch(e) { 
        alert('网络错误'); 
    } finally { 
        btn.innerText = old; btn.disabled = false; 
    }
}

// 发布新文章
async function submitArticle() {
    const type = document.getElementById('artType').value;
    const title = document.getElementById('artTitle').value;
    const summary = document.getElementById('artSummary').value;
    const coverUrl = document.getElementById('artCoverUrl').value;
    const content = quill.root.innerHTML;
    
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value);
    
    const btn = document.getElementById('articleSubmitBtn'); 
    const old = btn.innerText;
    btn.innerText = '翻译并发布中...'; btn.disabled = true;
    
    try {
        const res = await fetch('/api/admin/article/translate', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, 
            body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs, type, coverUrl }) 
        });
        const data = await res.json();
        
        if (data.success) {
            alert('发布成功！'); 
            document.getElementById('artTitle').value = ''; 
            document.getElementById('artSummary').value = ''; 
            document.getElementById('artCoverUrl').value = ''; 
            quill.setContents([]); 
            fetchData();
        } else { 
            alert('失败: ' + (data.error || '未知错误')); 
        }
    } catch(e) { 
        alert('网络错误'); 
    } finally { 
        btn.innerText = old; btn.disabled = false; 
    }
}

async function deleteArticleGroup(groupId) { 
    if(confirm('确认删除该组文章的所有语言版本？')) { 
        await fetch(`/api/admin/article-group/${groupId}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); 
        fetchData(); 
    } 
}

// ... 剩余的 板块、追踪、多语言、设置相关的代码保持之前的版本即可 ...
async function addCategory() {
    const id = document.getElementById('newCatId').value.trim(); 
    const zh = document.getElementById('newCatZh').value.trim(); 
    const en = document.getElementById('newCatEn').value.trim();
    if(!id || !zh) return alert('请填写完整');
    
    await fetch('/api/admin/categories', { 
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, 
        body: JSON.stringify({ id, name_zh: zh, name_en: en }) 
    });
    document.getElementById('newCatId').value = ''; document.getElementById('newCatZh').value = ''; document.getElementById('newCatEn').value = ''; 
    fetchData();
}

async function deleteCategory(id) { 
    if(confirm('确定删除该板块？')) { 
        await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); 
        fetchData(); 
    } 
}

async function saveTrackingConfig() {
    const interval = parseInt(document.getElementById('trackingInterval').value) || 0;
    await fetch('/api/admin/tracking/config', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ interval }) });
    alert('配置已保存');
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
    const deeplKey1 = document.getElementById('deeplKey1').value; const deeplKey2 = document.getElementById('deeplKey2').value; const autoLang = document.getElementById('autoLangSwitch').checked; const checkWaitTime = parseInt(document.getElementById('checkWaitTime').value) || 5;
    const btn = event.target; const old = btn.innerText; btn.innerText = '保存中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ deeplKey1, deeplKey2, autoLang, checkWaitTime }) });
        if (res.ok) { alert('系统配置已保存！'); fetchData(); } else { const data = await res.json(); alert('保存失败: ' + (data.error || '未知错误')); }
    } catch(e) { alert('网络错误'); } finally { btn.innerText = old; btn.disabled = false; }
}
async function loadStats() {
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-pwd': adminPwd } }); const stats = await res.json();
    if(document.getElementById('statTotal')) {
        document.getElementById('statTotal').innerText = stats.total;
        document.getElementById('categoryStats').innerHTML = allCategories.map(c => `<div class="card p-4"><div class="text-sm text-gray-500">${c.name_zh}</div><div class="text-2xl font-bold text-blue-500 mt-1">${stats.byCategory[c.id] || 0}</div></div>`).join('');
    }
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
