let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let allArticles = [];
let allLangs = [];
let allCategories = [];

async function doLogin() {
    adminPwd = document.getElementById('adminPwd').value;
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return alert('密码错误');
    sessionStorage.setItem('wad_admin_pwd', adminPwd);
    document.getElementById('loginOverlay').style.display = 'none';
    fetchData();
}

function logout() { sessionStorage.removeItem('wad_admin_pwd'); location.reload(); }

function switchTab(tabId, el) {
    document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
    const titles = { dashboard: '数据汇总', articles: '文章管理', categories: '板块管理', languages: '多语言管理', translogs: '翻译汇总', settings: '系统设置' };
    document.getElementById('pageTitle').innerText = titles[tabId];
    
    if (tabId === 'translogs') loadTranslationLogs();
    if (tabId === 'dashboard') loadStats();
}

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('wad_admin_pwd')) {
        document.getElementById('loginOverlay').style.display = 'none';
        fetchData();
    }
    quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] }
    });
});

// 获取基础数据
async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles;
    allLangs = data.languages;
    allCategories = data.categories;

    // 渲染语言勾选框
    document.getElementById('articleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => 
        `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-[#f0b90b]" ${l.code === 'zh' ? 'checked disabled' : ''}> ${l.flag} ${l.name}</label>`
    ).join('');

    // 渲染文章板块下拉框
    document.getElementById('artType').innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name_zh}</option>`).join('');

    // 渲染文章列表
    const groups = {};
    allArticles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    document.getElementById('articleList').innerHTML = Object.values(groups).map(group => {
        const main = group.find(a => a.lang === 'zh') || group[0];
        return `
            <div class="border border-slate-700 p-3 rounded bg-[#0f172a]">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded mr-2">${allCategories.find(c=>c.id === main.type)?.name_zh || '未分类'}</span>
                        <b>${main.title}</b>
                    </div>
                    <button onclick="deleteArticleGroup('${main.groupId}')" class="text-red-500 text-xs hover:underline">删除</button>
                </div>
            </div>
        `;
    }).join('') || '暂无文章';

    // 渲染多语言列表
    document.getElementById('languageList').innerHTML = allLangs.map(l => `
        <tr>
            <td class="p-4">${l.code}</td>
            <td class="p-4">${l.flag} ${l.name}</td>
            <td class="p-4"><span class="px-2 py-1 rounded text-xs ${l.active ? 'bg-green-900 text-green-400' : 'bg-gray-700'}">${l.active ? '启用' : '禁用'}</span></td>
            <td class="p-4 flex gap-2">
                <button onclick="openEditLang('${l.code}')" class="text-blue-400 hover:underline">编辑字典</button>
                ${l.code !== 'zh' ? `<button onclick="autoTranslateDict('${l.code}')" class="text-[#f0b90b] hover:underline ml-2">一键机翻字典</button>` : ''}
            </td>
        </tr>
    `).join('');

    // 渲染板块列表
    document.getElementById('categoryList').innerHTML = allCategories.map(c => `
        <tr>
            <td class="p-4 font-mono">${c.id}</td>
            <td class="p-4">${c.name_zh}</td>
            <td class="p-4">${c.name_en}</td>
            <td class="p-4"><button onclick="deleteCategory('${c.id}')" class="text-red-500 hover:underline">删除</button></td>
        </tr>
    `).join('');

    // 渲染设置
    document.getElementById('autoLangSwitch').checked = data.settings.autoLang || false;
    document.getElementById('deeplKey1').value = data.settings.deeplKey1 || '';
    document.getElementById('deeplKey2').value = data.settings.deeplKey2 || '';

    loadStats();
}

// 加载数据汇总
async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats', { headers: { 'x-admin-pwd': adminPwd } });
        const stats = await res.json();
        document.getElementById('statTotal').innerText = stats.total;
        
        let catHtml = '';
        allCategories.forEach(c => {
            catHtml += `
                <div class="card p-4">
                    <div class="text-sm text-gray-400">${c.name_zh}</div>
                    <div class="text-2xl font-bold text-blue-500 mt-1">${stats.byCategory[c.id] || 0}</div>
                </div>
            `;
        });
        document.getElementById('categoryStats').innerHTML = catHtml;
    } catch (e) { console.error(e); }
}

// 发布文章
async function submitArticle() {
    const type = document.getElementById('artType').value;
    const title = document.getElementById('artTitle').value;
    const summary = document.getElementById('artSummary').value;
    const content = quill.root.innerHTML;
    if (!title) return alert('请输入标题');
    
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value);
    if (checkedLangs.length === 0) return alert('请至少勾选一个语言');

    const btn = document.getElementById('articleSubmitBtn');
    btn.innerText = '翻译中，请稍候...'; btn.disabled = true;

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
    finally { btn.innerText = '智能翻译并发布'; btn.disabled = false; }
}

async function deleteArticleGroup(groupId) {
    if(!confirm('确认删除该文章的所有语言版本？')) return;
    await fetch(`/api/admin/article-group/${groupId}`, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

// 板块管理
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

// 多语言管理
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

// 字典编辑弹窗
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

// 一键 DeepL 翻译字典
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

// 系统设置
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

// 翻译日志
async function loadTranslationLogs() {
    const res = await fetch('/api/admin/translation-logs', { headers: { 'x-admin-pwd': adminPwd } });
    const data = await res.json();
    document.getElementById('logTotalCount').innerText = data.totalCount;
    document.getElementById('logTotalChars').innerText = data.totalChars;
    document.getElementById('translationLogList').innerHTML = data.logs.map(l => `
        <tr class="border-b border-slate-700">
            <td class="p-4">${new Date(l.time).toLocaleString()}</td>
            <td class="p-4">${l.targetLang}</td>
            <td class="p-4 text-green-500">${l.chars}</td>
        </tr>
    `).join('');
}
