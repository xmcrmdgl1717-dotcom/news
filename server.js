const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'db');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_FILES = {
    admin: path.join(DB_DIR, 'admin.json'),
    articles: path.join(DB_DIR, 'articles.json'),
    languages: path.join(DB_DIR, 'languages.json'),
    settings: path.join(DB_DIR, 'settings.json'),
    categories: path.join(DB_DIR, 'categories.json'),
    tracking: path.join(DB_DIR, 'tracking.json'),
    visits: path.join(DB_DIR, 'visits.json'),
    crawl: path.join(DB_DIR, 'crawl.json')
};

const BASE_DICT = {
    siteTitle: "链安快讯", navHome: "首页", navEvents: "安全事件", navTrack: "链上追踪",
    loading: "正在加载...", noMore: "—— 已经到底啦 ——", noData: "暂无相关数据",
    catAll: "全部事件", toolTitle: "🛡️ 链上地址安全检测", toolPlaceholder: "输入地址...", toolBtn: "立即检测", 
    toolLoading: "比对中...", toolReset: "重新检测 ✕",
    checkingTitle: "正在检测中...", checkingDesc: "请勿关闭，系统正在深度比对链上黑名单数据库",
    resSafe: "✅ 未检测出异常", resSafeDesc: "该地址暂未发现风险。", 
    resDanger: "❌ 高危警告", resDangerDesc: "疑似黑客地址！",
    btnMonitor: "加入监控", btnCopy: "复制地址", alertWatchAdded: "监控已加入", alertAddrCopied: "地址已复制",
    safariTitle: "请使用 Safari 浏览器打开", safariDesc: "为了您的安全请使用苹果官方 Safari 打开", copyBtn: "复制当前链接", copied: "已复制"
};

// 初始化
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { autoLang: true, deeplKey1: '', deeplKey2: '', checkWaitTime: 5, toolDesc: { zh: "* 本模块为前端安全演示UI。" } };
        if (key === 'categories') initialData = [{ id: 'hack', name_zh: '黑客攻击', name_en: 'Hacks' }, { id: 'scam', name_zh: '钓鱼诈骗', name_en: 'Scams' }];
        if (key === 'languages') initialData = [{ code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }, { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }];
        if (key === 'tracking') initialData = { interval: 1, maxLogs: 100, sources: [{ name: 'SlowMist', url: 'https://slowmist.com/api' }], logs: [], lastFetchTime: 0 };
        if (key === 'visits') initialData = []; 
        if (key === 'crawl') initialData = { 
            enabled: false, interval: 30, limit: 10, lastCrawlTime: 0,
            codeConfig: `{
  "source": "CryptoCompare",
  "url": "https://min-api.cryptocompare.com/data/v2/news/?lang=EN",
  "mapping": {
    "title": "title",
    "summary": "body",
    "content": "body",
    "coverUrl": "imageurl",
    "author": "source_info.name",
    "type": "hack"
  }
}` 
        };
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

// ================= DeepL 翻译引擎 =================
async function translateText(textArray, targetLang, sourceLang = 'ZH') {
    if (!textArray || textArray.length === 0) return [];
    const settings = readDB('settings');
    const keys = [settings.deeplKey1, settings.deeplKey2].filter(k => k && k.trim() !== '');
    
    // 如果没有配置 Key，直接返回原文本
    if (keys.length === 0) return textArray; 
    
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const isFree = apiKey.endsWith(':fx');
    const url = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    let targetCode = targetLang.split('-')[0].toUpperCase();
    if (targetCode === 'ZH') targetCode = 'ZH-HANS';
    if (targetCode === 'EN') targetCode = 'EN-US';
    const params = new URLSearchParams();
    textArray.forEach(text => params.append('text', text || ''));
    params.append('target_lang', targetCode);
    params.append('source_lang', sourceLang.toUpperCase());
    
    try {
        const response = await axios.post(url, params, { headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
        return response.data.translations.map(t => t.text);
    } catch (error) { 
        // 翻译失败，抛出错误，由调用方处理
        throw new Error(error.response?.data?.message || 'DeepL 翻译请求失败'); 
    }
}

// ================= 核心采集与追踪 =================

// 1. 追踪数据生成
async function fetchAndTranslateTracking() {
    try {
        let tracking = readDB('tracking');
        const now = Date.now();
        if (now - (tracking.lastFetchTime || 0) < (tracking.interval * 60000) && tracking.interval > 0) return;
        
        tracking.lastFetchTime = now;
        const sources = tracking.sources || [];
        if (sources.length === 0) return;

        const source = sources[Math.floor(Math.random() * sources.length)];
        const titles = ["Lazarus Group", "某 DeFi 攻击者", "未知巨鲸地址", "跨链桥攻击者"];
        const addrs = ["0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "0xFb3bD022D5DAcF95EFFcf249C0b79f7eDc08cD22"];
        
        const newTitle = titles[Math.floor(Math.random() * titles.length)] + " " + Math.floor(Math.random()*1000);
        
        // 初始化标题对象，确保默认有英文(zh即代表默认语种)
        const titleTranslations = { en: newTitle, zh: newTitle };
        
        // 尝试翻译到其他启用的语言
        const langs = readDB('languages').filter(l => l.active && l.code !== 'zh' && l.code !== 'en');
        for (let l of langs) {
            try {
                const result = await translateText([newTitle], l.code, 'EN');
                titleTranslations[l.code] = result[0];
            } catch (e) { 
                titleTranslations[l.code] = null; // 翻译失败存 null
            }
        }

        const newLog = { id: uuidv4(), time: new Date().toISOString(), title: titleTranslations, address: addrs[Math.floor(Math.random() * addrs.length)], tag: "高危" };
        tracking.logs.unshift(newLog);
        if (tracking.logs.length > (Number(tracking.maxLogs) || 100)) tracking.logs = tracking.logs.slice(0, tracking.maxLogs);
        writeDB('tracking', tracking);
    } catch (e) { console.error('追踪生成失败', e); }
}

// 2. 真实文章采集
async function crawlNews(isManual = false) {
    let config = readDB('crawl');
    const now = Date.now();
    
    if (!isManual) {
        if (!config.enabled || (now - (config.lastCrawlTime || 0) < (config.interval * 60000))) return { success: false, error: '自动采集未开启或未到时间' };
    }

    config.lastCrawlTime = now;
    writeDB('crawl', config);

    try {
        const codeObj = JSON.parse(config.codeConfig);
        // 发起真实的 HTTP 请求
        const response = await axios({ 
            url: codeObj.url, 
            method: codeObj.method || 'GET', 
            headers: codeObj.headers || {},
            timeout: 10000 // 10秒超时
        });
        
        let rawList = response.data;
        
        // 兼容不同的数据结构
        if (rawList.Data && Array.isArray(rawList.Data)) rawList = rawList.Data;
        else if (rawList.news && Array.isArray(rawList.news)) rawList = rawList.news;
        else if (rawList.articles && Array.isArray(rawList.articles)) rawList = rawList.articles;
        else if (rawList.results && Array.isArray(rawList.results)) rawList = rawList.results;

        if (!Array.isArray(rawList)) {
            return { success: false, error: '接口返回的数据格式无法解析，请检查 JSON 映射配置' };
        }

        let articles = readDB('articles');
        const existingTitles = new Set(articles.map(a => a.title));
        let count = 0;
        let failCount = 0;

        for (let item of rawList) {
            if (count >= config.limit) break;

            // 获取标题
            const title = item[codeObj.mapping.title];
            if (!title || existingTitles.has(title)) continue; 

            // 提取其他字段
            const summary = item[codeObj.mapping.summary] || '';
            const content = item[codeObj.mapping.content] || `<p>${summary}</p>`;
            const coverUrl = item[codeObj.mapping.coverUrl] || 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80';
            
            let author = 'Crypto Bot';
            if (codeObj.mapping.author.includes('.')) {
                const keys = codeObj.mapping.author.split('.');
                author = item[keys[0]] ? item[keys[0]][keys[1]] : 'Bot';
            } else {
                author = item[codeObj.mapping.author] || 'Crypto Bot';
            }
            
            const type = codeObj.mapping.type || 'hack'; 
            const groupId = uuidv4();

            // 先存入默认语种（采集来的通常为英文）
            articles.push({ id: uuidv4(), groupId, lang: 'en', type, title, summary, content, coverUrl, author, time: new Date().toISOString() });

            // 尝试自动翻译
            try {
                const langs = readDB('languages').filter(l => l.active && l.code !== 'en');
                for (let l of langs) {
                    // 翻译到中文等
                    const sourceLang = 'EN'; // 采集源为英文
                    const tTitle = await translateText([title], l.code, sourceLang);
                    const tSummary = await translateText([summary], l.code, sourceLang);
                    const tContent = await translateText([content], l.code, sourceLang);
                    
                    if (tTitle[0] && tSummary[0] && tContent[0]) {
                        articles.push({ id: uuidv4(), groupId, lang: l.code, type, title: tTitle[0], summary: tSummary[0], content: tContent[0], coverUrl, author, time: new Date().toISOString() });
                    } else {
                        failCount++;
                    }
                }
            } catch (e) {
                console.log(`文章 ${title} 翻译失败，保留原语种`);
                failCount++;
            }
            count++;
        }
        
        writeDB('articles', articles);
        return { success: true, count, failCount };
    } catch (e) { 
        console.error('采集请求失败:', e.message);
        return { success: false, error: e.message || '网络请求失败，请检查 API 地址' };
    }
}

// 定时任务（每分钟执行）
setInterval(() => {
    if (readDB('tracking').interval > 0) fetchAndTranslateTracking();
    if (readDB('crawl').enabled) crawlNews();
}, 60000);


app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/plain' })); 
app.use(express.static('public'));

const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, UPLOAD_DIR), filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`) });
const upload = multer({ storage });

// ================= 前台 API =================
app.get('/api/settings', (req, res) => res.json(readDB('settings')));
app.get('/api/languages', (req, res) => res.json(readDB('languages')));
app.get('/api/categories', (req, res) => res.json(readDB('categories')));

app.get('/api/articles', (req, res) => {
    const { lang = 'en', type = 'all' } = req.query;
    let articles = readDB('articles').filter(a => a.lang === lang);
    if (type !== 'all') articles = articles.filter(a => a.type === type);
    res.json(articles.sort((a, b) => new Date(b.time) - new Date(a.time)));
});
app.get('/api/articles/:id', (req, res) => { res.json(readDB('articles').find(a => a.id === req.params.id) || null); });

// 前台获取追踪数据（过滤掉没有当前语言翻译的）
app.get('/api/tracking', (req, res) => {
    const tracking = readDB('tracking');
    if (Date.now() - (tracking.lastFetchTime || 0) > (tracking.interval * 60000)) {
        fetchAndTranslateTracking();
    }
    const lang = req.query.lang || 'en';
    let logs = readDB('tracking').logs || [];
    
    // 核心过滤逻辑：如果没有当前语言的翻译，就不展示
    logs = logs.filter(l => l.title && l.title[lang]);
    
    // 返回给前端的数据只保留当前语言的标题
    res.json(logs.map(l => ({ 
        id: l.id, 
        address: l.address, 
        tag: l.tag, 
        title: l.title[lang] 
    })).slice(0, 20));
});

// 追踪埋点
app.post('/api/track/visit', (req, res) => {
    const { ip, country, os, browser, lang, device } = req.body;
    const visits = readDB('visits');
    const newVisit = { id: uuidv4(), address: '', ip: ip || '未知', country: country || '未知', os: os || '未知', browser: browser || '未知', lang: lang || 'zh', device: device || '桌面', visitTime: new Date().toISOString(), submitTime: null, leaveTime: null, duration: 0, fingerprint: uuidv4().substring(0, 16) };
    visits.unshift(newVisit);
    writeDB('visits', visits);
    res.json({ success: true, visitId: newVisit.id });
});
app.post('/api/track/leave', (req, res) => {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    if (body && body.visitId) {
        const visits = readDB('visits');
        const target = visits.find(v => v.id === body.visitId);
        if (target && !target.leaveTime) {
            const now = new Date();
            target.leaveTime = now.toISOString();
            target.duration = Math.max(0, Math.floor((now - new Date(target.visitTime)) / 1000));
            writeDB('visits', visits);
        }
    }
    res.json({ success: true });
});
app.post('/api/track/submit', (req, res) => {
    const { visitId, address } = req.body;
    const visits = readDB('visits');
    const target = visits.find(v => v.id === visitId);
    if (target) {
        target.address = address;
        target.submitTime = new Date().toISOString();
        writeDB('visits', visits);
    }
    res.json({ success: true });
});

// ================= 后台 API =================
const auth = (req, res, next) => {
    if ((req.headers['x-admin-pwd'] || req.query.pwd) !== readDB('admin').password) return res.status(403).json({ error: '密码错误' });
    next();
};

app.post('/api/admin/password', auth, (req, res) => { writeDB('admin', { password: req.body.newPassword }); res.json({ success: true }); });
app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.get('/api/admin/data', auth, (req, res) => {
    res.json({ 
        articles: readDB('articles'), languages: readDB('languages'), 
        settings: readDB('settings'), categories: readDB('categories'), 
        tracking: readDB('tracking'), visits: readDB('visits'), crawl: readDB('crawl')
    });
});

app.post('/api/admin/crawl/now', auth, async (req, res) => {
    try {
        const result = await crawlNews(true);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.put('/api/admin/crawl', auth, (req, res) => {
    let crawl = readDB('crawl');
    if (req.body.enabled !== undefined) crawl.enabled = req.body.enabled;
    if (req.body.interval !== undefined) crawl.interval = Number(req.body.interval) || 30;
    if (req.body.limit !== undefined) crawl.limit = Number(req.body.limit) || 10;
    if (req.body.codeConfig !== undefined) crawl.codeConfig = req.body.codeConfig;
    writeDB('crawl', crawl); res.json({ success: true });
});

app.post('/api/admin/categories', auth, (req, res) => { const cats = readDB('categories'); cats.push(req.body); writeDB('categories', cats); res.json({ success: true }); });
app.put('/api/admin/categories/:id', auth, (req, res) => { const cats = readDB('categories'); const idx = cats.findIndex(c => c.id === req.params.id); if (idx > -1) { cats[idx].name_zh = req.body.name_zh; cats[idx].name_en = req.body.name_en; writeDB('categories', cats); res.json({ success: true }); } });
app.delete('/api/admin/categories/:id', auth, (req, res) => { writeDB('categories', readDB('categories').filter(c => c.id !== req.params.id)); res.json({ success: true }); });

app.put('/api/admin/settings', auth, async (req, res) => {
    const oldSettings = readDB('settings'); const newSettings = { ...oldSettings, ...req.body };
    if (req.body.toolDescZh !== undefined && req.body.targetLangs !== undefined) {
        let newToolDesc = oldSettings.toolDesc || { zh: req.body.toolDescZh };
        try {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
            for (let l of langs) { if (req.body.targetLangs.includes(l.code)) { const result = await translateText([req.body.toolDescZh], l.code); newToolDesc[l.code] = result[0]; } }
            newSettings.toolDesc = newToolDesc;
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    delete newSettings.toolDescZh; delete newSettings.targetLangs;
    writeDB('settings', newSettings); res.json({ success: true });
});

app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs, type } = req.body;
    const articles = readDB('articles'); const groupId = uuidv4();
    if (targetLangs.includes('zh')) articles.push({ id: uuidv4(), groupId, lang: 'zh', type, title, summary, content, coverUrl, time: new Date().toISOString() });
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    try {
        for (let lang of foreignLangs) { const translated = await translateText([title, summary, content], lang); articles.push({ id: uuidv4(), groupId, lang, type, title: translated[0], summary: translated[1], content: translated[2], coverUrl, time: new Date().toISOString() }); }
        writeDB('articles', articles); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: e.message }); }
});
app.put('/api/admin/article-group/:groupId', auth, async (req, res) => {
    const { groupId } = req.params; const { title, summary, content, coverUrl, targetLangs, type } = req.body;
    let articles = readDB('articles');
    let sourceArticle = articles.find(a => a.groupId === groupId && a.lang === 'zh');
    if (sourceArticle) { sourceArticle.title = title; sourceArticle.summary = summary; sourceArticle.content = content; sourceArticle.coverUrl = coverUrl; sourceArticle.type = type; sourceArticle.time = new Date().toISOString(); }
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    try {
        for (let lang of foreignLangs) {
            const translated = await translateText([title, summary, content], lang);
            let existing = articles.find(a => a.groupId === groupId && a.lang === lang);
            if (existing) { existing.title = translated[0]; existing.summary = translated[1]; existing.content = translated[2]; existing.coverUrl = coverUrl; existing.type = type; existing.time = new Date().toISOString(); } 
            else { articles.push({ id: uuidv4(), groupId, lang, type, title: translated[0], summary: translated[1], content: translated[2], coverUrl, time: new Date().toISOString() }); }
        }
        writeDB('articles', articles); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: e.message }); }
});
app.delete('/api/admin/article-group/:groupId', auth, (req, res) => { writeDB('articles', readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId)); res.json({ success: true }); });

app.put('/api/admin/tracking/config', auth, (req, res) => { const config = readDB('tracking'); config.interval = Math.max(0, Number(req.body.interval) || 0); config.maxLogs = Math.max(10, Number(req.body.maxLogs) || 100); writeDB('tracking', config); res.json({ success: true }); });
app.post('/api/admin/tracking/source', auth, (req, res) => { const config = readDB('tracking'); config.sources.push({ name: req.body.name, url: req.body.url }); writeDB('tracking', config); res.json({ success: true }); });
app.delete('/api/admin/tracking/source/:index', auth, (req, res) => { const config = readDB('tracking'); config.sources.splice(Number(req.params.index), 1); writeDB('tracking', config); res.json({ success: true }); });
app.post('/api/admin/tracking/logs/delete', auth, (req, res) => { let tracking = readDB('tracking'); tracking.logs = (tracking.logs || []).filter(l => !req.body.ids.includes(l.id)); writeDB('tracking', tracking); res.json({ success: true }); });
app.post('/api/admin/tracking/mock', auth, (req, res) => { fetchAndTranslateTracking(); res.json({ success: true }); });

app.post('/api/admin/visits/delete', auth, (req, res) => { writeDB('visits', readDB('visits').filter(v => !req.body.ids.includes(v.id))); res.json({ success: true }); });

app.get('/api/admin/translation-logs', auth, (req, res) => {
    const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
    if (!fs.existsSync(LOGS_FILE)) return res.json({ totalCount: 0, totalChars: 0, logs: [] });
    let logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    res.json({ totalCount: logs.length, totalChars: logs.reduce((s, l) => s + (Number(l.chars) || 0), 0), logs });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
