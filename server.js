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
    tracking: path.join(DB_DIR, 'tracking.json')
};

const BASE_DICT = {
    siteTitle: "链安快讯", navHome: "首页", navEvents: "安全事件", navTrack: "链上追踪",
    loading: "正在加载...", noMore: "—— 已经到底啦 ——", noData: "暂无相关数据",
    catAll: "全部事件", toolTitle: "🛡️ 链上地址安全检测", toolPlaceholder: "输入地址...", toolBtn: "立即检测", 
    toolLoading: "比对中...", toolReset: "重新检测 ✕",
    checkingTitle: "正在检测中...",
    checkingDesc: "请勿关闭，系统正在深度比对链上黑名单数据库",
    resSafe: "✅ 未检测出异常", resSafeDesc: "该地址暂未发现风险。", 
    resDanger: "❌ 高危警告", resDangerDesc: "疑似黑客地址！"
};

// 初始化数据文件
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { 
            autoLang: true, deeplKey1: '', deeplKey2: '',
            checkWaitTime: 5, 
            toolDesc: { zh: "* 本模块为前端安全演示UI，检测结果由随机算法生成，不构成任何投资建议或法律依据。" }
        };
        if (key === 'categories') initialData = [
            { id: 'hack', name_zh: '黑客攻击', name_en: 'Hacks' }, 
            { id: 'scam', name_zh: '钓鱼诈骗', name_en: 'Scams' }
        ];
        if (key === 'languages') initialData = [
            { code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: BASE_DICT }, 
            { code: 'en', name: 'English', flag: '🇺🇸', active: true, dict: {} }, 
            { code: 'ja', name: '日本語', flag: '🇯🇵', active: true, dict: {} }
        ];
        if (key === 'tracking') initialData = { 
            interval: 1, 
            maxLogs: 100, 
            sources: [{ name: 'SlowMist', url: 'https://slowmist.com/api' }], 
            logs: [] 
        };
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

// ================= 追踪数据自动生成机制 =================
function mockTrackingData() {
    try {
        let tracking = readDB('tracking');
        const sources = tracking.sources || [];
        if (sources.length === 0) return;

        const source = sources[Math.floor(Math.random() * sources.length)];
        const titles = ["Lazarus Group", "某 DeFi 攻击者", "朝鲜黑客组织", "未知巨鲸地址", "跨链桥攻击者"];
        const addrs = ["0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "0xFb3bD022D5DAcF95EFFcf249C0b79f7eDc08cD22", "0x1234567890abcdef1234567890abcdef12345678"];
        const descs = ["将 1,200 ETH 转移至 Tornado Cash", "正在分散资金", "向币安热钱包充值", "利用合约漏洞提取资金", "进行大额 Swap 操作"];
        
        const newLog = {
            id: uuidv4(),
            time: new Date().toISOString(),
            title: titles[Math.floor(Math.random() * titles.length)],
            address: addrs[Math.floor(Math.random() * addrs.length)],
            desc: `[来源: ${source.name}] ${descs[Math.floor(Math.random() * descs.length)]}`,
            tag: "高危"
        };

        tracking.logs = tracking.logs || [];
        tracking.logs.unshift(newLog); // 插入到头部

        // 限制最大条数，超出则剔除尾部旧数据
        const max = Number(tracking.maxLogs) || 100;
        if (tracking.logs.length > max) {
            tracking.logs = tracking.logs.slice(0, max);
        }
        writeDB('tracking', tracking);
    } catch (e) { console.error('生成追踪数据失败:', e); }
}

// 每分钟检查一次是否需要生成数据 (生产环境可配合 cron 库)
setInterval(() => {
    const tracking = readDB('tracking');
    if (tracking.interval > 0) {
        mockTrackingData();
    }
}, 60000);


app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

async function translateText(textArray, targetLang, sourceLang = 'ZH') {
    const settings = readDB('settings');
    const keys = [settings.deeplKey1, settings.deeplKey2].filter(k => k && k.trim() !== '');
    if (keys.length === 0) throw new Error('请先在“系统设置”中配置真实的 DeepL API Key！');
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
        const response = await axios.post(url, params, {
            headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const charCount = textArray.join('').length;
        const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
        let logs = fs.existsSync(LOGS_FILE) ? JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')) : [];
        logs.push({ time: new Date().toISOString(), targetLang: targetCode, chars: charCount, apiKey: apiKey.substring(0, 5) + '***' });
        fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
        return response.data.translations.map(t => t.text);
    } catch (error) { throw new Error('翻译失败，请检查 API Key 是否正确或额度是否耗尽。'); }
}

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

// 前台只返回最新的 20 条
app.get('/api/tracking', (req, res) => { 
    const tracking = readDB('tracking');
    res.json((tracking.logs || []).slice(0, 20)); 
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
    const articles = readDB('articles'); const categories = readDB('categories');
    const stats = { total: articles.length, byCategory: {} };
    categories.forEach(c => stats.byCategory[c.id] = articles.filter(a => a.type === c.id).length);
    res.json(stats);
});
app.post('/api/admin/categories', auth, (req, res) => { const cats = readDB('categories'); cats.push(req.body); writeDB('categories', cats); res.json({ success: true }); });
app.delete('/api/admin/categories/:id', auth, (req, res) => { writeDB('categories', readDB('categories').filter(c => c.id !== req.params.id)); res.json({ success: true }); });

app.put('/api/admin/settings', auth, async (req, res) => {
    const oldSettings = readDB('settings');
    const newSettings = { ...oldSettings, ...req.body };

    if (req.body.toolDescZh !== undefined && req.body.targetLangs !== undefined) {
        const zhDesc = req.body.toolDescZh;
        const targetLangs = req.body.targetLangs;
        let newToolDesc = oldSettings.toolDesc || { zh: zhDesc };

        try {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
            for (let l of langs) {
                if (targetLangs.includes(l.code)) {
                    const result = await translateText([zhDesc], l.code);
                    newToolDesc[l.code] = result[0];
                }
            }
            newSettings.toolDesc = newToolDesc;
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }

    delete newSettings.toolDescZh;
    delete newSettings.targetLangs;

    writeDB('settings', newSettings);
    res.json({ success: true });
});

app.post('/api/admin/languages/translate-dict', auth, async (req, res) => {
    const { targetLang } = req.body; const langs = readDB('languages'); const idx = langs.findIndex(l => l.code === targetLang);
    if (idx === -1 || targetLang === 'zh') return res.status(400).json({ error: '无效的语言' });
    try {
        const keys = Object.keys(BASE_DICT); const texts = keys.map(k => BASE_DICT[k]);
        const translated = await translateText(texts, targetLang);
        const newDict = {}; keys.forEach((k, i) => newDict[k] = translated[i]);
        langs[idx].dict = newDict; writeDB('languages', langs); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post('/api/admin/languages', auth, (req, res) => { const langs = readDB('languages'); langs.push({ code: req.body.code, name: req.body.name, flag: req.body.flag, active: true, dict: {} }); writeDB('languages', langs); res.json({ success: true }); });
app.put('/api/admin/languages/:code', auth, (req, res) => {
    const langs = readDB('languages'); const idx = langs.findIndex(l => l.code === req.params.code);
    if (idx > -1) { langs[idx] = { ...langs[idx], ...req.body }; writeDB('languages', langs); } res.json({ success: true });
});

app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs, type } = req.body;
    const articles = readDB('articles'); const groupId = uuidv4();
    if (targetLangs.includes('zh')) articles.push({ id: uuidv4(), groupId, lang: 'zh', type, title, summary, content, coverUrl, time: new Date().toISOString() });
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    try {
        for (let lang of foreignLangs) {
            const translated = await translateText([title, summary, content], lang);
            articles.push({ id: uuidv4(), groupId, lang, type, title: translated[0], summary: translated[1], content: translated[2], coverUrl, time: new Date().toISOString() });
        }
        writeDB('articles', articles); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: e.message }); }
});

app.put('/api/admin/article-group/:groupId', auth, async (req, res) => {
    const { groupId } = req.params;
    const { title, summary, content, coverUrl, targetLangs, type } = req.body;
    let articles = readDB('articles');
    
    let sourceArticle = articles.find(a => a.groupId === groupId && a.lang === 'zh');
    if (sourceArticle) {
        sourceArticle.title = title; sourceArticle.summary = summary;
        sourceArticle.content = content; sourceArticle.coverUrl = coverUrl;
        sourceArticle.type = type; sourceArticle.time = new Date().toISOString();
    }

    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    try {
        for (let lang of foreignLangs) {
            const translated = await translateText([title, summary, content], lang);
            let existing = articles.find(a => a.groupId === groupId && a.lang === lang);
            if (existing) {
                existing.title = translated[0]; existing.summary = translated[1];
                existing.content = translated[2]; existing.coverUrl = coverUrl;
                existing.type = type; existing.time = new Date().toISOString();
            } else {
                articles.push({ id: uuidv4(), groupId, lang, type, title: translated[0], summary: translated[1], content: translated[2], coverUrl, time: new Date().toISOString() });
            }
        }
        writeDB('articles', articles); res.json({ success: true });
    } catch (e) { res.status(502).json({ error: e.message }); }
});

app.delete('/api/admin/article-group/:groupId', auth, (req, res) => { writeDB('articles', readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId)); res.json({ success: true }); });

// === 追踪管理相关 API ===
app.put('/api/admin/tracking/config', auth, (req, res) => { 
    const config = readDB('tracking'); 
    if (req.body.interval !== undefined) config.interval = Math.max(0, Number(req.body.interval) || 0); 
    if (req.body.maxLogs !== undefined) config.maxLogs = Math.max(10, Number(req.body.maxLogs) || 100); 
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
    if (idx >= 0 && idx < config.sources.length) { 
        config.sources.splice(idx, 1); 
        writeDB('tracking', config); 
    } 
    res.json({ success: true }); 
});

// 新增：批量删除追踪记录
app.post('/api/admin/tracking/logs/delete', auth, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: '参数错误' });
    
    let tracking = readDB('tracking');
    tracking.logs = (tracking.logs || []).filter(l => !ids.includes(l.id));
    writeDB('tracking', tracking);
    res.json({ success: true });
});

// 手动生成一条测试数据（方便用户测试）
app.post('/api/admin/tracking/mock', auth, (req, res) => {
    mockTrackingData();
    res.json({ success: true });
});

app.get('/api/admin/translation-logs', auth, (req, res) => {
    const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
    if (!fs.existsSync(LOGS_FILE)) return res.json({ totalCount: 0, totalChars: 0, logs: [] });
    let logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    res.json({ totalCount: logs.length, totalChars: logs.reduce((s, l) => s + (Number(l.chars) || 0), 0), logs });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
