let adminPwd = sessionStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let allArticles = [];
let allLangs = [];

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
    const titles = { articles: '文章管理', languages: '多语言管理', translogs: '翻译汇总', settings: '系统设置' };
    document.getElementById('pageTitle').innerText = titles[tabId];
    
    if (tabId === 'translogs') loadTranslationLogs();
}

// 初始化 Quill
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

// 获取后台数据
async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return logout();
    const data = await res.json();
    
    allArticles = data.articles;
    allLangs = data.languages;

    // 渲染语言勾选框
    document.getElementById('articleLangCheckboxes').innerHTML = allLangs.filter(l => l.active).map(l => 
        `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-[#f0b90b]" ${l.code === 'zh' ? 'checked disabled' : ''}> ${l.flag} ${l.name}</label>`
    ).join('');

    // 渲染文章列表
    const groups = {};
    allArticles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    document.getElementById('articleList').innerHTML = Object.values(groups).map(group => {
        const main = group.find(a => a.lang === 'zh') || group[0];
        return `
            <div class="border border-slate-700 p-3 rounded bg-[#0f172a]">
                <div class="flex justify-between items-center">
                    <div><span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">${main.lang}</span> <b>${main.title}</b></div>
                    <button onclick="deleteArticleGroup('${main.groupId}')" class="text-red-500 text-xs">删除</button>
                </div>
            </div>
        `;
    }).join('') || '暂无文章';

    // 渲染多语言列表
    document.getElementById('languageList').innerHTML = allLangs.map(l => `
        <tr><td class="p-4">${l.code}</td><td class="p-4">${l.flag} ${l.name}</td>
        <td class="p-4"><button class="px-2 py-1 rounded text-xs ${l.active ? 'bg-green-900 text-green-400' : 'bg-gray-700'}">${l.active ? '启用' : '禁用'}</button></td></tr>
    `).join('');

    // 渲染设置
    document.getElementById('autoLangSwitch').checked = data.settings.autoLang || false;
    document.getElementById('deeplKey1').value = data.settings.deeplKey1 || '';
}

// 提交文章 (带 DeepL 机翻)
async function submitArticle() {
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
            body: JSON.stringify({ title, summary, content, targetLangs: checkedLangs })
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

// 保存系统设置
async function saveSettings() {
    const deeplKey1 = document.getElementById('deeplKey1').value;
    const autoLang = document.getElementById('autoLangSwitch').checked;
    
    const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
        body: JSON.stringify({ deeplKey1, autoLang })
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
