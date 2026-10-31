const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
// 如果你有 translator.js，请解开下面这行，如果没有，注释掉，并将翻译函数替换为假数据
// const { translateWithPolling, describeError } = require('./translator'); 

// 假翻译函数，防止服务器报错
const translateWithPolling = async (texts, targetLang, sourceLang) => texts.map(t => `[${targetLang}] ${t}`);
const describeError = (e) => e.message;

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
    tracking: path.join(DB_DIR, 'tracking.json') // 新增追踪配置文件
};

const BASE_DICT = {
    siteTitle: "链安快讯", navHome: "首页", navEvents: "安全事件", navTrack: "链上追踪",
    loading: "正在加载...", noMore: "—— 已经到底啦 ——", noData: "暂无相关数据",
    catAll: "全部事件", toolTitle: "🛡️ 链上地址安全检测", toolPlaceholder: "输入地址...", toolBtn: "立即检测", 
    toolLoading: "比对中...", toolReset: "重新检测 ✕", toolDisc: "* 演示UI",
    resSafe: "✅ 安全", resSafeDesc: "未发现风险。", resDanger: "❌ 高危警告", resDangerDesc: "疑似黑客地址！"
};

// 初始化
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { autoLang: true, deeplKey1: '', deeplKey2: '' };
        if (key === 'categories') initialData = [{ id: 'hack', name_zh: '黑客攻击', name_en: 'Hacks' }, { id: 'scam', name_zh: '钓鱼诈骗', name_en: 'Scams' }];
        if (key === 'languages') initialData = [{ code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }, { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }];
        if (key === 'tracking') initialData = { interval: 0, sources: [{ name: 'SlowMist', url: 'https://slowmist.com/api' }] };
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
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

app.get('/api/articles/:id', (req, res) => {
    res.json(readDB('articles').find(a => a.id === req.params.id) || null);
});

// 获取动态追踪数据 (前台调用)
app.get('/api/tracking', (req, res) => {
    const config = readDB('tracking');
    // 模拟动态生成一批数据
    const mockTracks = [
        { id: "1", title: "Lazarus Group (朝鲜黑客)", address: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96", desc: "近期异动：该地址在刚刚将 1,200 ETH 转移至 Tornado Cash 混币器。", tag: "FBI 通缉" },
        { id: "2", title: "某 DeFi 攻击者", address: "0xFb3bD022D5DAcF95EFFcf249C0b79f7eDc08cD22", desc: `该地址根据数据源 [${config.sources[0]?.name || '未知'}] 抓取，正在转移盗取资金。`, tag: "高危" }
    ];
    res.json(mockTracks);
});

// ================= 后台 API =================
const auth = (req, res, next) => {
    const pwd = req.headers['x-admin-pwd'] || req.query.pwd;
    if (pwd !== readDB('admin').password) return res.status(403).json({ error: '密码错误' });
    next();
};

app.post('/api/admin/password', auth, (req, res) => { writeDB('admin', { password: req.body.newPassword }); res.json({ success: true }); });
app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.get('/api/admin/data', auth, (req, res) => {
    res.json({ articles: readDB('articles'), languages: readDB('languages'), settings: readDB('settings'), categories: readDB('categories'), tracking: readDB('tracking') });
});

app.get('/api/admin/stats', auth, (req, res) => {
    const articles = readDB('articles');
    const categories = readDB('categories');
    const stats = { total: articles.length, byCategory: {} };
    categories.forEach(c => stats.byCategory[c.id] = articles.filter(a => a.type === c.id).length);
    res.json(stats);
});

app.post('/api/admin/categories', auth, (req, res) => { const cats = readDB('categories'); cats.push(req.body); writeDB('categories', cats); res.json({ success: true }); });
app.delete('/api/admin/categories/:id', auth, (req, res) => { writeDB('categories', readDB('categories').filter(c => c.id !== req.params.id)); res.json({ success: true }); });
app.put('/api/admin/settings', auth, (req, res) => { const s = { ...readDB('settings'), ...req.body }; writeDB('settings', s); res.json({ success: true }); });

// 追踪配置接口
app.put('/api/admin/tracking/config', auth, (req, res) => {
    const config = readDB('tracking');
    config.interval = Math.max(0, Number(req.body.interval) || 0);
    writeDB('tracking', config);
    res.json({ success: true });
});
app.post('/api/admin/tracking/source', auth, (req, res) => {
    const config = readDB('tracking');
    config.sources.push({ name: req.body.name, url: req.body.url });
    writeDB('tracking', config);
    res.json({ success: true });
});
app.delete('/api/admin/tracking/source/:index', auth, (req, res) => {
    const config = readDB('tracking');
    const idx = Number(req.params.index);
    if (idx >= 0 && idx < config.sources.length) { config.sources.splice(idx, 1); writeDB('tracking', config); }
    res.json({ success: true });
});

// 翻译与文章发布
app.post('/api/admin/languages', auth, (req, res) => { const langs = readDB('languages'); langs.push({ code: req.body.code, name: req.body.name, flag: req.body.flag, active: true, dict: {} }); writeDB('languages', langs); res.json({ success: true }); });
app.put('/api/admin/languages/:code', auth, (req, res) => {
    const langs = readDB('languages'); const idx = langs.findIndex(l => l.code === req.params.code);
    if (idx > -1) { langs[idx] = { ...langs[idx], ...req.body }; writeDB('languages', langs); } res.json({ success: true });
});

app.post('/api/admin/languages/translate-dict', auth, async (req, res) => {
    const { targetLang } = req.body; const langs = readDB('languages'); const idx = langs.findIndex(l => l.code === targetLang);
    if (idx === -1 || targetLang === 'zh') return res.status(400).json({ error: 'Invalid' });
    try {
        const keys = Object.keys(BASE_DICT); const texts = keys.map(k => BASE_DICT[k]);
        const translated = await translateWithPolling(texts, targetLang, 'zh');
        const newDict = {}; keys.forEach((k, i) => newDict[k] = translated[i]);
        langs[idx].dict = newDict; writeDB('languages', langs); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: '翻译失败' }); }
});

app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs, type } = req.body;
    const articles = readDB('articles'); const groupId = uuidv4();
    if (targetLangs.includes('zh')) articles.push({ id: uuidv4(), groupId, lang: 'zh', type, title, summary, content, coverUrl, time: new Date().toISOString() });
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    try {
        for (let lang of foreignLangs) {
            const translated = await translateWithPolling([title, summary, content], lang, 'zh');
            articles.push({ id: uuidv4(), groupId, lang, type, title: translated[0], summary: translated[1], content: translated[2], coverUrl, time: new Date().toISOString() });
        }
        writeDB('articles', articles); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: '翻译失败' }); }
});

app.delete('/api/admin/article-group/:groupId', auth, (req, res) => {
    writeDB('articles', readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId));
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
