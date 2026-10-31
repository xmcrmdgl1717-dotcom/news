const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
// 假设你有这个翻译模块，如果没有请在下面提供 mock 实现
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
    settings: path.join(DB_DIR, 'settings.json')
};

// 初始化数据
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { autoLang: true, deeplKey1: '', deeplKey2: '' };
        if (key === 'languages') initialData = [
            { code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: {} },
            { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }
        ];
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// ================= 前台 API =================
app.get('/api/settings', (req, res) => res.json(readDB('settings')));
app.get('/api/languages', (req, res) => res.json(readDB('languages')));

// 获取文章列表（按语言）
app.get('/api/articles', (req, res) => {
    const { lang = 'en' } = req.query;
    const articles = readDB('articles').filter(a => a.lang === lang).sort((a, b) => new Date(b.time) - new Date(a.time));
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
        settings: readDB('settings')
    });
});

app.put('/api/admin/settings', auth, (req, res) => {
    const settings = { ...readDB('settings'), ...req.body };
    writeDB('settings', settings);
    res.json({ success: true });
});

// 语言管理
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

// 翻译日志
app.get('/api/admin/translation-logs', auth, (req, res) => {
    const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
    if (!fs.existsSync(LOGS_FILE)) return res.json({ totalCount: 0, totalChars: 0, logs: [] });
    let logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    res.json({ totalCount: logs.length, totalChars: logs.reduce((s, l) => s + (Number(l.chars) || 0), 0), logs });
});

// ====== 文章发布与智能翻译 ======
app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs } = req.body;
    const articles = readDB('articles');
    const groupId = uuidv4();
    
    // 保存中文源文
    if (targetLangs.includes('zh')) {
        articles.push({ id: uuidv4(), groupId, lang: 'zh', title, summary, content, coverUrl, time: new Date().toISOString() });
    }
    
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    
    try {
        for (let lang of foreignLangs) {
            // 调用你的翻译模块（如 DeepL）
            const textsToTranslate = [title, summary, content];
            const translatedTexts = await translateWithPolling(textsToTranslate, lang, 'zh');
            
            articles.push({ 
                id: uuidv4(), groupId, lang, 
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

// 删除文章整组
app.delete('/api/admin/article-group/:groupId', auth, (req, res) => {
    let articles = readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId);
    writeDB('articles', articles); 
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
