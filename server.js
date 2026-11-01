const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

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
    catAll: "全部事件", toolTitle: "免费检测地址是否安全", toolPlaceholder: "输入任何链上地址...", toolBtn: "立即检测", 
    toolLoading: "比对中...", toolReset: "重新检测 ✕",
    checkingTitle: "正在检测中...", checkingDesc: "请勿关闭，系统正在深度比对链上黑名单数据库",
    resSafe: "✅ 未检测出异常", resSafeDesc: "该地址暂未发现风险。", 
    resDanger: "❌ 高危警告", resDangerDesc: "疑似黑客地址！",
    btnMonitor: "加入监控", btnCopy: "复制地址", alertWatchAdded: "监控已加入", alertAddrCopied: "地址已复制",
    safariTitle: "请使用 Safari 浏览器打开", 
    safariDesc: "系统检测到您正在使用非苹果官方 Safari 访问，为了您的安全请您使用苹果官方 Safari 打开访问。", 
    copyBtn: "复制当前链接", copied: "已复制"
};

// 初始化数据文件
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { 
            autoLang: true, deeplKey1: '', deeplKey2: '', checkWaitTime: 5, 
            enableAddressCheck: true, 
            siteLogo: '', 
            siteTitle: { zh: '链安快讯' }, 
            siteDesc: { zh: 'Web3安全资讯' },
            toolTitle: { zh: '免费检测地址是否安全' },
            toolPlaceholder: { zh: '输入任何链上地址...' },
            toolDesc: { zh: "* 本模块为前端安全演示UI，检测结果由随机算法生成。" } 
        };
        if (key === 'categories') initialData = [{ id: 'hack', name_zh: '黑客攻击', name_en: 'Hacks' }, { id: 'scam', name_zh: '钓鱼诈骗', name_en: 'Scams' }];
        if (key === 'languages') initialData = [
            { code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }, 
            { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }
        ];
        if (key === 'tracking') initialData = { interval: 1, maxLogs: 100, sources: [{ name: 'SlowMist', url: 'https://slowmist.com/api' }], logs: [], lastFetchTime: 0, autoTranslate: true };
        if (key === 'visits') initialData = []; 
        if (key === 'crawl') initialData = { enabled: false, interval: 30, lastCrawlTime: 0, configs: [] };
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

// 强制修复多语言配置
try {
    let langs = JSON.parse(fs.readFileSync(DB_FILES.languages, 'utf8'));
    let updated = false;
    if (!Array.isArray(langs)) { langs = []; updated = true; }
    if (!langs.find(l => l.code === 'zh')) { langs.push({ code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }); updated = true; }
    if (!langs.find(l => l.code === 'en')) { langs.push({ code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }); updated = true; }
    langs.forEach(l => { if (l.active === undefined) { l.active = true; updated = true; } });
    if (updated) fs.writeFileSync(DB_FILES.languages, JSON.stringify(langs, null, 2));
} catch (e) {
    const defaultLangs = [{ code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }, { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }];
    fs.writeFileSync(DB_FILES.languages, JSON.stringify(defaultLangs, null, 2));
}

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

// ================= DeepL 翻译引擎 =================
async function translateText(textArray, targetLang, sourceLang = null) {
    if (!textArray || textArray.length === 0) return [];
    const settings = readDB('settings');
    const keys = [settings.deeplKey1, settings.deeplKey2].filter(k => k && k.trim() !== '');
    
    if (keys.length === 0) throw new Error('未配置 DeepL API Key');
    
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const isFree = apiKey.endsWith(':fx');
    const url = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    
    let targetCode = targetLang.split('-')[0].toLowerCase();
    const langMap = {
        'jp': 'ja', 'kr': 'ko', 'cn': 'zh', 'zh': 'zh', 'us': 'en', 'en': 'en',
        'vn': 'vi', 'tw': 'zh', 'hk': 'zh', 'ru': 'ru', 'fr': 'fr', 'de': 'de',
        'es': 'es', 'it': 'it', 'pt': 'pt', 'br': 'pt', 'tr': 'tr', 'id': 'id', 'th': 'th'
    };
    if (langMap[targetCode]) targetCode = langMap[targetCode];
    
    targetCode = targetCode.toUpperCase();
    if (targetCode === 'ZH') targetCode = 'ZH-HANS';
    if (targetCode === 'EN') targetCode = 'EN-US';

    const params = new URLSearchParams();
    let totalChars = 0;
    textArray.forEach(text => {
        let cleanText = (text || '').toString().replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
        params.append('text', cleanText || ' ');
        totalChars += cleanText.length;
    });
    params.append('target_lang', targetCode);
    if (sourceLang) params.append('source_lang', langMap[sourceLang.toLowerCase()] || sourceLang.toUpperCase());
    
    try {
        const response = await axios.post(url, params, { headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
        
        if (totalChars > 0) {
            const logsFile = path.join(DB_DIR, 'translation_logs.json');
            let logs = [];
            if (fs.existsSync(logsFile)) { try { logs = JSON.parse(fs.readFileSync(logsFile, 'utf8')); } catch(e){} }
            const keyName = apiKey.substring(0, 6) + '***' + apiKey.slice(-4);
            logs.push({ time: new Date().toISOString(), targetLang: targetCode, chars: totalChars, keyName });
            if (logs.length > 1000) logs = logs.slice(-1000);
            fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
        }
        
        return response.data.translations.map(t => t.text);
    } catch (error) { 
        throw new Error(error.response?.data?.message || 'DeepL 翻译请求失败'); 
    }
}

// ================= 真实采集与追踪逻辑 =================
const xmlParser = new XMLParser({ ignoreAttributes: false, textNodeName: "_text" });

async function fetchAndTranslateTracking() {
    try {
        let tracking = readDB('tracking');
        const now = Date.now();
        if (now - (tracking.lastFetchTime || 0) < (tracking.interval * 60000) && tracking.interval > 0) return;
        tracking.lastFetchTime = now;
        const sources = tracking.sources || [];
        if (sources.length === 0) return;

        const titles = ["Lazarus Group", "某 DeFi 攻击者", "未知巨鲸地址", "跨链桥攻击者"];
        const addrs = ["0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "0xFb3bD022D5DAcF95EFFcf249C0b79f7eDc08cD22"];
        const newTitleZh = titles[Math.floor(Math.random() * titles.length)] + " " + Math.floor(Math.random()*1000);
        
        let titleTranslations = { zh: newTitleZh, en: "Suspicious Activity " + Math.floor(Math.random()*1000) };
        
        if (tracking.autoTranslate !== false) {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh' && l.code !== 'en');
            for (let l of langs) {
                try { const result = await translateText([newTitleZh], l.code, 'ZH'); titleTranslations[l.code] = result[0]; } catch (e) { titleTranslations[l.code] = newTitleZh; }
            }
        }

        const newLog = { id: uuidv4(), time: new Date().toISOString(), title: titleTranslations, address: addrs[Math.floor(Math.random() * addrs.length)], tag: "高危" };
        tracking.logs.unshift(newLog);
        if (tracking.logs.length > (Number(tracking.maxLogs) || 100)) tracking.logs = tracking.logs.slice(0, tracking.maxLogs);
        writeDB('tracking', tracking);
    } catch (e) { console.error('追踪生成失败', e); }
}

async function crawlNews(isManual = false, configId = null, isAutoGlobal = false) {
    let config = readDB('crawl');
    const now = Date.now();
    
    if (!isManual) {
        if (isAutoGlobal) {
            if (now - (config.lastCrawlTime || 0) < (config.interval * 60000)) return { success: false, error: '全局采集未到时间' };
            config.lastCrawlTime = now; writeDB('crawl', config);
        } else {
            if (configId) {
                const idx = config.configs.findIndex(c => c.id === configId);
                if (idx > -1) { config.configs[idx].lastCrawlTime = now; writeDB('crawl', config); }
            }
        }
    }

    let totalCount = 0; let totalFailCount = 0;
    const configs = (config.configs || []).filter(c => !configId || c.id === configId);
    if (configs.length === 0) return { success: false, error: '未配置任何采集源' };

    let articles = readDB('articles');
    const existingTitles = new Set(articles.map(a => a.title));

    for (let cfg of configs) {
        try {
            const response = await axios({ url: cfg.url, method: 'GET', timeout: 15000 });
            let rawList = [];
            const contentType = response.headers['content-type'] || '';
            
            if (contentType.includes('xml') || (typeof response.data === 'string' && response.data.trim().startsWith('<'))) {
                const xmlObj = xmlParser.parse(response.data);
                if (xmlObj.rss && xmlObj.rss.channel && xmlObj.rss.channel.item) rawList = xmlObj.rss.channel.item;
                else if (xmlObj.feed && xmlObj.feed.entry) rawList = xmlObj.feed.entry;
            } else {
                rawList = response.data;
                if (rawList.Data && Array.isArray(rawList.Data)) rawList = rawList.Data;
                else if (rawList.news && Array.isArray(rawList.news)) rawList = rawList.news;
                else if (rawList.articles && Array.isArray(rawList.articles)) rawList = rawList.articles;
                else if (rawList.results && Array.isArray(rawList.results)) rawList = rawList.results;
            }

            if (!Array.isArray(rawList)) continue;
            let count = 0;
            const currentLimit = cfg.limit ? Number(cfg.limit) : 10;

            for (let item of rawList) {
                if (count >= currentLimit) break;
                
                const getField = (obj, pathStr) => {
                    if (!pathStr) return null;
                    const keys = pathStr.split('.'); let val = obj;
                    for (let k of keys) { 
                        if (val === undefined || val === null) return null; 
                        if (val['@_' + k] !== undefined) {
                            val = val['@_' + k];
                        } else {
                            val = val[k]; 
                        }
                    }
                    if (val && typeof val === 'object') {
                        if (val._text) return val._text;
                        if (val['#text']) return val['#text'];
                        if (val['@_url']) return val['@_url'];
                        if (Array.isArray(val) && val.length > 0) {
                             const first = val[0];
                             if (typeof first === 'string') return first;
                             if (first['@_url']) return first['@_url'];
                             if (first['_text']) return first['_text'];
                             if (first.url) return first.url;
                        }
                    }
                    return val;
                };

                let title = getField(item, cfg.mapping.title);
                if (!title || existingTitles.has(title)) continue; 
                let summary = getField(item, cfg.mapping.summary) || ''; summary = summary.replace(/<[^>]*>?/gm, ''); 
                let content = getField(item, cfg.mapping.content) || `<p>${summary}</p>`;
                let coverUrl = getField(item, cfg.mapping.coverUrl) || cfg.image || 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80';
                let author = getField(item, cfg.mapping.author) || cfg.name || 'Crypto News';
                let type = getField(item, cfg.mapping.type) || 'hack'; 
                let pubDate = getField(item, cfg.mapping.time) || new Date().toISOString();
                
                const groupId = uuidv4(); const isoTime = new Date(pubDate).toISOString();
                articles.push({ id: uuidv4(), groupId, lang: 'original', type, title, summary, content, coverUrl, author, time: isoTime });
                existingTitles.add(title); 

                const targetLangs = cfg.targetLangs || [];
                for (let l of targetLangs) {
                    try {
                        const tTitle = await translateText([title], l);
                        const tSummary = await translateText([summary], l);
                        const tContent = await translateText([content], l);
                        if (tTitle[0] && tSummary[0] && tContent[0]) {
                            articles.push({ id: uuidv4(), groupId, lang: l, type, title: tTitle[0], summary: tSummary[0], content: tContent[0], coverUrl, author, time: isoTime });
                        } else { totalFailCount++; }
                    } catch (e) { totalFailCount++; }
                }
                count++;
            }
            totalCount += count;
        } catch (e) { console.error(`采集源 [${cfg.name}] 失败:`, e.message); }
    }
    writeDB('articles', articles);
    return { success: true, count: totalCount, failCount: totalFailCount };
}

setInterval(() => {
    if (readDB('tracking').interval > 0) fetchAndTranslateTracking();
    const crawl = readDB('crawl'); const now = Date.now();
    if (crawl.enabled) { if (now - (crawl.lastCrawlTime || 0) >= (crawl.interval * 60000)) crawlNews(false, null, true); } 
    else { (crawl.configs || []).forEach(cfg => { if (cfg.autoEnabled && now - (cfg.lastCrawlTime || 0) >= (crawl.interval * 60000)) crawlNews(false, cfg.id, false); }); }
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

app.get('/api/tracking', (req, res) => {
    const tracking = readDB('tracking');
    if (Date.now() - (tracking.lastFetchTime || 0) > (tracking.interval * 60000) && tracking.interval > 0) fetchAndTranslateTracking();
    const lang = req.query.lang || 'en';
    let logs = readDB('tracking').logs || [];
    
    const formattedLogs = logs.map(l => {
        let finalTitle = l.title[lang] || l.title['zh'] || l.title['en'] || 'Untitled';
        return { id: l.id, address: l.address, tag: l.tag, title: finalTitle };
    });
    res.json(formattedLogs.slice(0, 20));
});

app.post('/api/track/visit', (req, res) => {
    const { ip, country, os, browser, lang, device } = req.body;
    const visits = readDB('visits');
    const newVisit = { id: uuidv4(), address: '', ip: ip || '未知', country: country || '未知', os: os || '未知', browser: browser || '未知', lang: lang || 'zh', device: device || '桌面', visitTime: new Date().toISOString(), submitTime: null, leaveTime: null, duration: 0, fingerprint: uuidv4().substring(0, 16) };
    visits.unshift(newVisit); writeDB('visits', visits);
    res.json({ success: true, visitId: newVisit.id });
});
app.post('/api/track/leave', (req, res) => {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    if (body && body.visitId) {
        const visits = readDB('visits'); const target = visits.find(v => v.id === body.visitId);
        if (target && !target.leaveTime) {
            const now = new Date(); target.leaveTime = now.toISOString(); target.duration = Math.max(0, Math.floor((now - new Date(target.visitTime)) / 1000)); writeDB('visits', visits);
        }
    }
    res.json({ success: true });
});
app.post('/api/track/submit', (req, res) => {
    const { visitId, address } = req.body; const visits = readDB('visits'); const target = visits.find(v => v.id === visitId);
    if (target) { target.address = address; target.submitTime = new Date().toISOString(); writeDB('visits', visits); }
    res.json({ success: true });
});

// ================= 后台 API =================
const auth = (req, res, next) => { if ((req.headers['x-admin-pwd'] || req.query.pwd) !== readDB('admin').password) return res.status(403).json({ error: '密码错误' }); next(); };

app.post('/api/admin/password', auth, (req, res) => { writeDB('admin', { password: req.body.newPassword }); res.json({ success: true }); });
app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.get('/api/admin/data', auth, (req, res) => {
    res.json({ articles: readDB('articles'), languages: readDB('languages'), settings: readDB('settings'), categories: readDB('categories'), tracking: readDB('tracking'), visits: readDB('visits'), crawl: readDB('crawl') });
});

// 批量翻译（补齐缺失语言）
app.post('/api/admin/articles/batch-translate', auth, async (req, res) => {
    const { startDate, endDate } = req.body;
    let articles = readDB('articles');
    const activeLangs = readDB('languages').filter(l => l.active).map(l => l.code);
    
    let targetArticles = articles;
    if (startDate || endDate) {
        targetArticles = articles.filter(a => {
            const t = new Date(a.time).getTime();
            if (startDate && t < new Date(startDate).getTime()) return false;
            if (endDate && t > new Date(endDate).getTime() + 86400000) return false;
            return true;
        });
    }

    const groups = {};
    targetArticles.forEach(a => { if (!groups[a.groupId]) groups[a.groupId] = []; groups[a.groupId].push(a); });

    let successCount = 0; let newCount = 0;

    for (const groupId in groups) {
        const group = groups[groupId];
        const main = group.find(a => a.lang === 'original' || a.lang === 'zh' || a.lang === 'en') || group[0];
        if (!main) continue;

        const existingLangs = group.map(a => a.lang);
        let missingLangs = activeLangs.filter(l => !existingLangs.includes(l));

        if (missingLangs.length > 0) {
            try {
                for (let l of missingLangs) {
                    const tTitle = await translateText([main.title], l);
                    const tSummary = await translateText([main.summary], l);
                    const tContent = await translateText([main.content], l);
                    if (tTitle[0] && tSummary[0] && tContent[0]) {
                        articles.push({ id: uuidv4(), groupId: main.groupId, lang: l, type: main.type, title: tTitle[0], summary: tSummary[0], content: tContent[0], coverUrl: main.coverUrl, author: main.author, time: main.time });
                        newCount++;
                    }
                }
                successCount++;
            } catch (e) { console.error('批量翻译出错:', e.message); }
        }
    }
    writeDB('articles', articles);
    res.json({ success: true, translatedGroups: successCount, addedLangs: newCount });
});

// 批量删除
app.post('/api/admin/articles/batch-delete', auth, (req, res) => {
    const { startDate, endDate } = req.body;
    let articles = readDB('articles');
    
    let targetIds = new Set();
    articles.forEach(a => {
        let match = true;
        if (startDate || endDate) {
            const t = new Date(a.time).getTime();
            if (startDate && t < new Date(startDate).getTime()) match = false;
            if (endDate && t > new Date(endDate).getTime() + 86400000) match = false;
        }
        if (match) targetIds.add(a.groupId);
    });

    const originalLength = articles.length;
    articles = articles.filter(a => !targetIds.has(a.groupId));
    writeDB('articles', articles);

    res.json({ success: true, deletedCount: originalLength - articles.length });
});

// DeepL 额度查询
app.get('/api/admin/deepl/usage', auth, async (req, res) => {
    const settings = readDB('settings');
    let apiKey = req.query.key || settings.deeplKey1;
    if (!apiKey || apiKey.trim() === '') return res.json({ success: false, error: '未配置 API Key' });
    
    const isFree = apiKey.endsWith(':fx');
    const url = isFree ? 'https://api-free.deepl.com/v2/usage' : 'https://api.deepl.com/v2/usage';
    try {
        const response = await axios.get(url, { headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` } });
        res.json({ success: true, character_count: response.data.character_count, character_limit: response.data.character_limit });
    } catch (error) {
        res.json({ success: false, error: error.response?.data?.message || '查询失败，请检查 Key' });
    }
});

// 翻译日志查询
app.get('/api/admin/translation-logs', auth, (req, res) => {
    const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
    if (!fs.existsSync(LOGS_FILE)) return res.json({ totalCount: 0, totalChars: 0, logs: [] });
    let logs = []; try { logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')); } catch(e){}
    
    const { startDate, endDate, keyword } = req.query;
    if (startDate) logs = logs.filter(l => l.time >= startDate);
    if (endDate) logs = logs.filter(l => l.time <= endDate + 'T23:59:59.999Z');
    if (keyword) {
        const kw = keyword.toLowerCase();
        logs = logs.filter(l => (l.keyName && l.keyName.toLowerCase().includes(kw)) || l.targetLang.toLowerCase().includes(kw));
    }
    logs.sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json({ totalCount: logs.length, totalChars: logs.reduce((s, l) => s + (Number(l.chars) || 0), 0), logs: logs.slice(0, 500) });
});

// 多语言字典一键翻译
app.post('/api/admin/languages/translate-dict', auth, async (req, res) => {
    const { targetLang } = req.body;
    const langs = readDB('languages'); const langIdx = langs.findIndex(l => l.code === targetLang);
    if (langIdx === -1) return res.status(404).json({ error: '语言不存在' });

    try {
        const keys = Object.keys(BASE_DICT); const values = Object.values(BASE_DICT);
        const translatedValues = await translateText(values, targetLang);
        const newDict = {};
        keys.forEach((k, i) => { newDict[k] = translatedValues[i] ? translatedValues[i] : values[i]; });
        langs[langIdx].dict = { ...(langs[langIdx].dict || {}), ...newDict };
        writeDB('languages', langs); res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/crawl/now', auth, async (req, res) => {
    try { res.json(await crawlNews(true, req.body.configId || null, false)); } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.put('/api/admin/crawl', auth, (req, res) => {
    let crawl = readDB('crawl');
    if (req.body.enabled !== undefined) crawl.enabled = req.body.enabled;
    if (req.body.interval !== undefined) crawl.interval = Number(req.body.interval) || 30;
    writeDB('crawl', crawl); res.json({ success: true });
});

app.post('/api/admin/crawl/source', auth, (req, res) => {
    let crawl = readDB('crawl'); if (!crawl.configs) crawl.configs = [];
    crawl.configs.push({ id: uuidv4(), autoEnabled: false, lastCrawlTime: 0, ...req.body });
    writeDB('crawl', crawl); res.json({ success: true });
});
app.put('/api/admin/crawl/source/:id', auth, (req, res) => {
    let crawl = readDB('crawl'); const idx = crawl.configs.findIndex(c => c.id === req.params.id);
    if (idx > -1) { crawl.configs[idx] = { ...crawl.configs[idx], ...req.body }; writeDB('crawl', crawl); res.json({ success: true }); } else { res.status(404).json({ error: '未找到配置' }); }
});
app.delete('/api/admin/crawl/source/:id', auth, (req, res) => {
    let crawl = readDB('crawl'); crawl.configs = (crawl.configs || []).filter(c => c.id !== req.params.id); writeDB('crawl', crawl); res.json({ success: true });
});

app.post('/api/admin/languages', auth, (req, res) => { const langs = readDB('languages'); langs.push({ ...req.body, active: true, dict: {} }); writeDB('languages', langs); res.json({ success: true }); });
app.put('/api/admin/languages/:code', auth, (req, res) => {
    const langs = readDB('languages'); const idx = langs.findIndex(l => l.code === req.params.code);
    if (idx > -1) { langs[idx] = { ...langs[idx], ...req.body }; writeDB('languages', langs); res.json({ success: true }); } else { res.status(404).json({ error: 'Not found' }); }
});
app.delete('/api/admin/languages/:code', auth, (req, res) => { writeDB('languages', readDB('languages').filter(l => l.code !== req.params.code)); res.json({ success: true }); });

app.post('/api/admin/categories', auth, (req, res) => { const cats = readDB('categories'); cats.push(req.body); writeDB('categories', cats); res.json({ success: true }); });
app.put('/api/admin/categories/:id', auth, (req, res) => { const cats = readDB('categories'); const idx = cats.findIndex(c => c.id === req.params.id); if (idx > -1) { cats[idx].name_zh = req.body.name_zh; cats[idx].name_en = req.body.name_en; writeDB('categories', cats); res.json({ success: true }); } });
app.delete('/api/admin/categories/:id', auth, (req, res) => { writeDB('categories', readDB('categories').filter(c => c.id !== req.params.id)); res.json({ success: true }); });

// ================== 核心：更新系统设置 ==================
app.put('/api/admin/settings', auth, async (req, res) => {
    const oldSettings = readDB('settings'); 
    const newSettings = { ...oldSettings, ...req.body };
    delete newSettings.targetLangs;
    delete newSettings.toolTitleTargetLangs;
    delete newSettings.toolPlaceholderTargetLangs;

    if (req.body.siteLogo !== undefined) {
        newSettings.siteLogo = req.body.siteLogo;
    }

    // 1. 处理工具标题翻译
    if (req.body.toolTitleZh !== undefined && req.body.toolTitleTargetLangs !== undefined) {
        let newToolTitle = oldSettings.toolTitle || {};
        newToolTitle.zh = req.body.toolTitleZh;
        try {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
            for (let l of langs) { 
                if (req.body.toolTitleTargetLangs.includes(l.code)) { 
                    const result = await translateText([req.body.toolTitleZh], l.code); 
                    newToolTitle[l.code] = result[0]; 
                } 
            }
            newSettings.toolTitle = newToolTitle;
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    delete newSettings.toolTitleZh;

    // 2. 处理工具输入提示翻译
    if (req.body.toolPlaceholderZh !== undefined && req.body.toolPlaceholderTargetLangs !== undefined) {
        let newToolPlaceholder = oldSettings.toolPlaceholder || {};
        newToolPlaceholder.zh = req.body.toolPlaceholderZh;
        try {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
            for (let l of langs) { 
                if (req.body.toolPlaceholderTargetLangs.includes(l.code)) { 
                    const result = await translateText([req.body.toolPlaceholderZh], l.code); 
                    newToolPlaceholder[l.code] = result[0]; 
                } 
            }
            newSettings.toolPlaceholder = newToolPlaceholder;
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    delete newSettings.toolPlaceholderZh;

    // 3. 处理工具描述翻译
    if (req.body.toolDescZh !== undefined && req.body.targetLangs !== undefined) {
        let newToolDesc = oldSettings.toolDesc || {};
        newToolDesc.zh = req.body.toolDescZh;
        try {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
            for (let l of langs) { 
                if (req.body.targetLangs.includes(l.code)) { 
                    const result = await translateText([req.body.toolDescZh], l.code); 
                    newToolDesc[l.code] = result[0]; 
                } 
            }
            newSettings.toolDesc = newToolDesc;
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    delete newSettings.toolDescZh;

    // 4. 处理网站标题、描述翻译
    if (req.body.siteTitleZh !== undefined || req.body.siteDescZh !== undefined) {
        let newSiteTitle = oldSettings.siteTitle || {};
        let newSiteDesc = oldSettings.siteDesc || {};
        if (req.body.siteTitleZh) newSiteTitle.zh = req.body.siteTitleZh;
        if (req.body.siteDescZh) newSiteDesc.zh = req.body.siteDescZh;
        
        if (req.body.targetLangs !== undefined) {
            try {
                const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
                for (let l of langs) {
                    if (req.body.targetLangs.includes(l.code)) {
                        if (req.body.siteTitleZh) {
                            const res1 = await translateText([req.body.siteTitleZh], l.code);
                            newSiteTitle[l.code] = res1[0];
                        }
                        if (req.body.siteDescZh) {
                            const res2 = await translateText([req.body.siteDescZh], l.code);
                            newSiteDesc[l.code] = res2[0];
                        }
                    }
                }
            } catch (e) { return res.status(500).json({ error: e.message }); }
        }
        newSettings.siteTitle = newSiteTitle;
        newSettings.siteDesc = newSiteDesc;
    }
    delete newSettings.siteTitleZh; delete newSettings.siteDescZh;

    writeDB('settings', newSettings); 
    res.json({ success: true });
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

app.put('/api/admin/tracking/config', auth, (req, res) => { 
    const config = readDB('tracking'); 
    config.interval = Math.max(0, Number(req.body.interval) || 0); 
    config.maxLogs = Math.max(10, Number(req.body.maxLogs) || 100); 
    if (req.body.autoTranslate !== undefined) config.autoTranslate = req.body.autoTranslate;
    writeDB('tracking', config); 
    res.json({ success: true }); 
});
app.post('/api/admin/tracking/source', auth, (req, res) => { const config = readDB('tracking'); config.sources.push({ name: req.body.name, url: req.body.url }); writeDB('tracking', config); res.json({ success: true }); });
app.delete('/api/admin/tracking/source/:index', auth, (req, res) => { const config = readDB('tracking'); config.sources.splice(Number(req.params.index), 1); writeDB('tracking', config); res.json({ success: true }); });
app.post('/api/admin/tracking/logs/delete', auth, (req, res) => { let tracking = readDB('tracking'); tracking.logs = (tracking.logs || []).filter(l => !req.body.ids.includes(l.id)); writeDB('tracking', tracking); res.json({ success: true }); });
app.post('/api/admin/tracking/mock', auth, (req, res) => { fetchAndTranslateTracking(); res.json({ success: true }); });

app.post('/api/admin/visits/delete', auth, (req, res) => { writeDB('visits', readDB('visits').filter(v => !req.body.ids.includes(v.id))); res.json({ success: true }); });

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
