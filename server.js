const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
// 确保你的 translator.js 能够正常接收数组并翻译
const { translateWithPolling, describeError } = require('./translator'); 

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
    categories: path.join(DB_DIR, 'categories.json') // 新增：板块管理
};

// 基础字典模板（用于一键翻译）
const BASE_DICT = {
    siteTitle: "链安快讯", navHome: "首页", navEvents: "安全事件", navTrack: "链上追踪",
    loading: "正在加载...", noMore: "—— 已经到底啦 ——", noData: "暂无相关数据",
    catAll: "全部事件", catHack: "黑客攻击", catScam: "钓鱼诈骗", catVuln: "漏洞预警",
    toolTitle: "🛡️ 链上地址安全检测", toolPlaceholder: "输入 ETH / BTC / TRC20 钱包地址...", 
    toolBtn: "立即检测", toolLoading: "正在比对链上黑名单数据库...", toolReset: "重新输入检测 ✕",
    toolDisc: "* 本模块为前端安全演示UI，检测结果由随机算法生成，不构成任何投资建议或法律依据。",
    resSafe: "✅ 安全", resSafeDesc: "该地址暂未发现与黑客、暗网、混币器存在交互记录。",
    resDanger: "❌ 高危警告", resDangerDesc: "该地址疑似黑客关联地址，请立即停止与其交互！"
};

// 初始化数据
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { autoLang: true, deeplKey1: '', deeplKey2: '' };
        if (key === 'categories') initialData = [
            { id: 'hack', name_zh: '黑客攻击', name_en: 'Hacks' },
            { id: 'scam', name_zh: '钓鱼诈骗', name_en: 'Scams' },
            { id: 'vuln', name_zh: '漏洞预警', name_en: 'Vulnerabilities' }
        ];
        if (key === 'languages') initialData = [
            { code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT },
            { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} } // en 字典可通过一键机翻生成
        ];
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
    if (type !== 'all') {
        articles = articles.filter(a => a.type === type);
    }
    articles.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json(articles);
});

app.get('/api/articles/:id', (req, res) => {
    const article = readDB('articles').find(a => a.id === req.params.id);
    res.json(article || null);
});

// ================= 后台 API =================
const auth = (req, res, next) => {
    const pwd = req.headers['x-admin-pwd'] || req.query.pwd;
    if (pwd !== readDB('admin').password) return res.status(403).json({ error: '密码错误' });
    next();
};

app.post('/api/admin/password', auth, (req, res) => {
    writeDB('admin', { password: req.body.newPassword });
    res.json({ success: true });
});

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.get('/api/admin/data', auth, (req, res) => {
    res.json({
        articles: readDB('articles'),
        languages: readDB('languages'),
        settings: readDB('settings'),
        categories: readDB('categories')
    });
});

// 新增：数据汇总统计
app.get('/api/admin/stats', auth, (req, res) => {
    const articles = readDB('articles');
    const categories = readDB('categories');
    
    const stats = {
        total: articles.length,
        byCategory: {}
    };
    
    categories.forEach(c => {
        stats.byCategory[c.id] = articles.filter(a => a.type === c.id).length;
    });
    
    res.json(stats);
});

// 新增：板块管理
app.post('/api/admin/categories', auth, (req, res) => {
    const categories = readDB('categories');
    const { id, name_zh, name_en } = req.body;
    categories.push({ id, name_zh, name_en });
    writeDB('categories', categories);
    res.json({ success: true });
});

app.delete('/api/admin/categories/:id', auth, (req, res) => {
    let categories = readDB('categories').filter(c => c.id !== req.params.id);
    writeDB('categories', categories);
    res.json({ success: true });
});

app.put('/api/admin/settings', auth, (req, res) => {
    const settings = { ...readDB('settings'), ...req.body };
    writeDB('settings', settings);
    res.json({ success: true });
});

// 语言与字典管理
app.post('/api/admin/languages', auth, (req, res) => {
    const languages = readDB('languages');
    languages.push({ code: req.body.code, name: req.body.name, flag: req.body.flag, active: true, dict: {} });
    writeDB('languages', languages);
    res.json({ success: true });
});
app.put('/api/admin/languages/:code', auth, (req, res) => {
    const languages = readDB('languages');
    const idx = languages.findIndex(l => l.code === req.params.code);
    if (idx > -1) { languages[idx] = { ...languages[idx], ...req.body }; writeDB('languages', languages); }
    res.json({ success: true });
});

// 核心：一键翻译全站菜单字典
app.post('/api/admin/languages/translate-dict', auth, async (req, res) => {
    const { targetLang } = req.body;
    const languages = readDB('languages');
    const targetIdx = languages.findIndex(l => l.code === targetLang);
    
    if (targetIdx === -1) return res.status(404).json({ error: '目标语言不存在' });
    if (targetLang === 'zh') return res.status(400).json({ error: '中文无需翻译' });

    try {
        const keys = Object.keys(BASE_DICT);
        const textsToTranslate = keys.map(k => BASE_DICT[k]);
        
        // 调用翻译模块，将所有的值翻译为目标语言
        const translatedTexts = await translateWithPolling(textsToTranslate, targetLang, 'zh');
        
        // 重新组装成字典
        const newDict = {};
        keys.forEach((key, index) => {
            newDict[key] = translatedTexts[index];
        });

        languages[targetIdx].dict = newDict;
        writeDB('languages', languages);
        res.json({ success: true, dict: newDict });
    } catch (e) {
        console.error('字典翻译失败:', e);
        res.status(502).json({ error: '翻译失败', reason: describeError ? describeError(e) : e.message });
    }
});

// 翻译日志
app.get('/api/admin/translation-logs', auth, (req, res) => {
    const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
    if (!fs.existsSync(LOGS_FILE)) return res.json({ totalCount: 0, totalChars: 0, logs: [] });
    let logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    res.json({ totalCount: logs.length, totalChars: logs.reduce((s, l) => s + (Number(l.chars) || 0), 0), logs });
});

// ====== 文章发布与智能翻译 (加入了 type 板块) ======
app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs, type } = req.body;
    const articles = readDB('articles');
    const groupId = uuidv4();
    
    // 保存中文源文
    if (targetLangs.includes('zh')) {
        articles.push({ id: uuidv4(), groupId, lang: 'zh', type, title, summary, content, coverUrl, time: new Date().toISOString() });
    }
    
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    
    try {
        for (let lang of foreignLangs) {
            const textsToTranslate = [title, summary, content];
            const translatedTexts = await translateWithPolling(textsToTranslate, lang, 'zh');
            
            articles.push({ 
                id: uuidv4(), groupId, lang, type,
                title: translatedTexts[0], 
                summary: translatedTexts[1], 
                content: translatedTexts[2], 
                coverUrl, time: new Date().toISOString() 
            });
            await new Promise(r => setTimeout(r, 1000));
        }
        writeDB('articles', articles);
        res.json({ success: true });
    } catch (e) {
        res.status(502).json({ error: '翻译失败', reason: describeError ? describeError(e) : e.message });
    }
});

app.delete('/api/admin/article-group/:groupId', auth, (req, res) => {
    let articles = readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId);
    writeDB('articles', articles); 
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
