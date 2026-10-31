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
    crawl: path.join(DB_DIR, 'crawl.json') // 新增采集配置
};

const BASE_DICT = {
    siteTitle: "链安快讯", navHome: "首页", navEvents: "安全事件", navTrack: "链上追踪",
    loading: "正在加载...", noMore: "—— 已经到底啦 ——", noData: "暂无相关数据",
    catAll: "全部事件", toolTitle: "🛡️ 链上地址安全检测", toolPlaceholder: "输入地址...", toolBtn: "立即检测", 
    toolLoading: "比对中...", toolReset: "重新检测 ✕",
    checkingTitle: "正在检测中...", checkingDesc: "请勿关闭，系统正在深度比对链上黑名单数据库",
    resSafe: "✅ 未检测出异常", resSafeDesc: "该地址暂未发现风险。", 
    resDanger: "❌ 高危警告", resDangerDesc: "疑似黑客地址！"
};

// 初始化数据文件
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { autoLang: true, deeplKey1: '', deeplKey2: '', checkWaitTime: 5, toolDesc: { zh: "* 本模块为前端安全演示UI，检测结果由随机算法生成。" } };
        if (key === 'categories') initialData = [{ id: 'hack', name_zh: '黑客攻击', name_en: 'Hacks' }, { id: 'scam', name_zh: '钓鱼诈骗', name_en: 'Scams' }];
        if (key === 'languages') initialData = [{ code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }, { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }];
        if (key === 'tracking') initialData = { interval: 1, maxLogs: 100, sources: [{ name: 'SlowMist', url: 'https://slowmist.com/api' }], logs: [], lastFetchTime: 0 };
        if (key === 'visits') initialData = []; 
        if (key === 'crawl') initialData = { 
            enabled: false, interval: 30, limit: 10, lastCrawlTime: 0,
            codeConfig: `{\n  "url": "https://api.example.com/news",\n  "method": "GET",\n  "headers": {},\n  "mapping": {\n    "title": "title",\n    "summary": "description",\n    "content": "body",\n    "coverUrl": "image",\n    "author": "source_name",\n    "time": "published_at",\n    "type": "hack"\n  }\n}` 
        };
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

// ================= DeepL 翻译引擎 =================
async function translateText(textArray, targetLang, sourceLang = 'ZH') {
    const settings = readDB('settings');
    const keys = [settings.deeplKey1, settings.deeplKey2].filter(k => k && k.trim() !== '');
    if (keys.length === 0) return textArray; // 没配Key直接返回原文本
    
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const isFree = apiKey.endsWith(':fx');
    const url = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    let targetCode = targetLang.split('-')[0].toUpperCase();
    if (targetCode === 'ZH') targetCode = 'ZH-HANS';
    if (targetCode === 'EN') targetCode = 'EN-US';
    const params = new URLSearchParams();
    textArray.forEach(text => params.append('text', text));
    params.append('target_lang', targetCode);
    params.append('source_lang', sourceLang.toUpperCase());
    try {
        const response = await axios.post(url, params, { headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
        const charCount = textArray.join('').length;
        const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
        let logs = fs.existsSync(LOGS_FILE) ? JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')) : [];
        logs.push({ time: new Date().toISOString(), targetLang: targetCode, chars: charCount, apiKey: apiKey.substring(0, 5) + '***' });
        fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
        return response.data.translations.map(t => t.text);
    } catch (error) { return textArray; } // 出错返回原文
}

// ================= 自动采集机制 =================

// 1. 追踪数据生成与翻译
async function fetchAndTranslateTracking() {
    try {
        let tracking = readDB('tracking');
        const now = Date.now();
        // 间隔未到则跳过
        if (now - (tracking.lastFetchTime || 0) < (tracking.interval * 60000) && tracking.interval > 0) return;
        
        tracking.lastFetchTime = now;
        const sources = tracking.sources || [];
        if (sources.length === 0) return;

        const source = sources[Math.floor(Math.random() * sources.length)];
        const titles = ["Lazarus Group", "某 DeFi 攻击者", "朝鲜黑客组织", "未知巨鲸地址", "跨链桥攻击者"];
        const addrs = ["0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "0xFb3bD022D5DAcF95EFFcf249C0b79f7eDc08cD22"];
        
        const newTitle = titles[Math.floor(Math.random() * titles.length)] + " " + Math.floor(Math.random()*1000);
        
        // 翻译标题
        const titleTranslations = { zh: newTitle };
        const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
        for (let l of langs) {
            const result = await translateText([newTitle], l.code);
            titleTranslations[l.code] = result[0];
        }

        const newLog = { 
            id: uuidv4(), 
            time: new Date().toISOString(), 
            title: titleTranslations, 
            address: addrs[Math.floor(Math.random() * addrs.length)], 
            tag: "高危" 
        };
        
        tracking.logs.unshift(newLog);
        if (tracking.logs.length > (Number(tracking.maxLogs) || 100)) tracking.logs = tracking.logs.slice(0, tracking.maxLogs);
        writeDB('tracking', tracking);
    } catch (e) { console.error('追踪生成失败', e); }
}

// 2. 文章采集 (模拟)
async function crawlNews() {
    let config = readDB('crawl');
    const now = Date.now();
    if (!config.enabled || (now - (config.lastCrawlTime || 0) < (config.interval * 60000))) return;

    config.lastCrawlTime = now;
    writeDB('crawl', config);

    try {
        const codeObj = JSON.parse(config.codeConfig);
        // 模拟发出请求，这里用假数据代替真实API返回
        // 真实代码为: const res = await axios({ url: codeObj.url, method: codeObj.method, headers: codeObj.headers });
        const mockResponse = Array.from({length: config.limit}).map((_, i) => ({
            title: `Auto Crawled News ${Date.now()} - ${i}`,
            summary: "This is an automatically fetched summary for crypto news.",
            body: "<p>This is the full content of the crawled news article.</p>",
            image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80",
            source_name: "Crypto API",
            published_at: new Date().toISOString()
        }));

        let articles = readDB('articles');
        const existingTitles = new Set(articles.map(a => a.title));
        let newArticles = [];

        for (let item of mockResponse) {
            if (existingTitles.has(item[codeObj.mapping.title])) continue; // 去重

            const title = item[codeObj.mapping.title];
            const summary = item[codeObj.mapping.summary] || '';
            const content = item[codeObj.mapping.content] || '';
            const coverUrl = item[codeObj.mapping.coverUrl] || '';
            const author = item[codeObj.mapping.author] || 'Bot';
            const type = codeObj.mapping.type || 'hack'; // 指定板块

            // 自动翻译
            const groupId = uuidv4();
            const tTitle = await translateText([title], 'en');
            const tSummary = await translateText([summary], 'en');
            const tContent = await translateText([content], 'en');

            // 存中文
            articles.push({ id: uuidv4(), groupId, lang: 'zh', type, title, summary, content, coverUrl, author, time: new Date().toISOString() });
            // 存英文
            articles.push({ id: uuidv4(), groupId, lang: 'en', type, title: tTitle[0], summary: tSummary[0], content: tContent[0], coverUrl, author, time: new Date().toISOString() });
        }
        
        writeDB('articles', articles);
    } catch (e) { console.error('自动采集失败', e); }
}

// 定时任务：每分钟检查一次
setInterval(() => {
    const tracking = readDB('tracking');
    if (tracking.interval > 0) fetchAndTranslateTracking();
    
    const crawl = readDB('crawl');
    if (crawl.enabled) crawlNews();
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

// 前台获取追踪数据（根据语言过滤）
app.get('/api/tracking', async (req, res) => {
    // 触发一次检查（如果是第一次访问）
    const tracking = readDB('tracking');
    if (Date.now() - (tracking.lastFetchTime || 0) > (tracking.interval * 60000)) {
        fetchAndTranslateTracking(); // 不阻塞，后台运行
    }
    
    const lang = req.query.lang || 'en';
    let logs = readDB('tracking').logs || [];
    // 只返回有当前语言翻译的数据
    logs = logs.filter(l => l.title && l.title[lang]);
    
    // 将 title 转换为前端期望的平铺结构
    const result = logs.map(l => ({
        id: l.id, address: l.address, tag: l.tag, 
        title: l.title[lang]
    }));

    res.json(result.slice(0, 20));
});

app.post('/api/track/visit', (req, res) => { /*...*/ res.json({ success: true }); });
app.post('/api/track/leave', (req, res) => res.json({ success: true }));
app.post('/api/track/submit', (req, res) => res.json({ success: true }));

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

// ... 其他省略的接口保持不变（文章、设置、多语言等） ...
app.post('/api/admin/categories', auth, (req, res) => { const cats = readDB('categories'); cats.push(req.body); writeDB('categories', cats); res.json({ success: true }); });
app.put('/api/admin/categories/:id', auth, (req, res) => {
    const cats = readDB('categories'); const idx = cats.findIndex(c => c.id === req.params.id);
    if (idx > -1) { cats[idx].name_zh = req.body.name_zh; cats[idx].name_en = req.body.name_en; writeDB('categories', cats); res.json({ success: true }); }
    else res.status(404).json({ error: '不存在' });
});
app.delete('/api/admin/categories/:id', auth, (req, res) => { writeDB('categories', readDB('categories').filter(c => c.id !== req.params.id)); res.json({ success: true }); });

app.put('/api/admin/crawl', auth, (req, res) => {
    let crawl = readDB('crawl');
    if (req.body.enabled !== undefined) crawl.enabled = req.body.enabled;
    if (req.body.interval !== undefined) crawl.interval = Number(req.body.interval) || 30;
    if (req.body.limit !== undefined) crawl.limit = Number(req.body.limit) || 10;
    if (req.body.codeConfig !== undefined) crawl.codeConfig = req.body.codeConfig;
    writeDB('crawl', crawl); res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
