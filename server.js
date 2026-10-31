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
    resSafe: "✅ 安全", resSafeDesc: "未发现风险。", resDanger: "❌ 高危警告", resDangerDesc: "疑似黑客地址！"
};

// ================= 初始化数据文件 =================
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { 
            autoLang: true, deeplKey1: '', deeplKey2: '',
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
        if (key === 'tracking') initialData = { interval: 0, sources: [{ name: 'SlowMist', url: 'https://slowmist.com/api' }] };
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

// ================= 核心：自动注入 10 篇初始文章 =================
async function seedInitialArticles() {
    try {
        let articles = readDB('articles');
        if (articles.length === 0) {
            console.log('⏳ 检测到文章库为空，正在注入 10 篇初始文章...');
            const now = new Date().toISOString();
            
            const seedData = [
                // 组 1：币安被盗 (中英日)
                { id: uuidv4(), groupId: "g1", lang: "zh", type: "hack", title: "币安遭遇巨额黑客攻击！何一表态全额兜底", summary: "10月30日币安联合创始人何一公开发声，明确表示将全额兜底此次被盗资产。", content: "<p>10月30日币安联合创始人何一公开发声，明确表示将全额兜底此次被盗资产。据悉，被搬空的钱包，正是币安拿来给客户兜底的那个钱包。56亿资产被盗，稳定币冻结但ETH难以追回。</p>", coverUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80", time: now },
                { id: uuidv4(), groupId: "g1", lang: "en", type: "hack", title: "Binance Suffers Massive Hack! Yi He Promises Full Compensation", summary: "Binance co-founder Yi He publicly stated on Oct 30 that the exchange will fully cover the stolen assets.", content: "<p>Binance co-founder Yi He publicly stated on Oct 30 that the exchange will fully cover the stolen assets. The emptied wallet was the one used by Binance to compensate customers. 5.6 billion stolen.</p>", coverUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80", time: now },
                { id: uuidv4(), groupId: "g1", lang: "ja", type: "hack", title: "バイナンスが巨額ハッキング被害！何一氏が全額補償を表明", summary: "10月30日、バイナンスの共同創設者である何一氏は、今回盗まれた資産を全額補償すると公に表明しました。", content: "<p>10月30日、バイナンスの共同創設者である何一氏は、今回盗まれた資産を全額補償すると公に表明しました。空になった財布は、バイナンスが顧客に補償するために使用していたものです。56億ドルの資産が盗まれました。</p>", coverUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80", time: now },

                // 组 2：以太坊升级 (中英)
                { id: uuidv4(), groupId: "g2", lang: "zh", type: "normal", title: "以太坊基金会发布最新路线图", summary: "以太坊核心开发者会议确定了下一次网络升级的时间节点，重点解决Layer2互操作性问题。", content: "<p>以太坊核心开发者会议确定了下一次网络升级的时间节点，重点解决Layer2互操作性问题及降低Gas费用。</p>", coverUrl: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?auto=format&fit=crop&w=400&q=80", time: now },
                { id: uuidv4(), groupId: "g2", lang: "en", type: "normal", title: "Ethereum Foundation Releases New Roadmap", summary: "Core developers have set the timeline for the next network upgrade, focusing on Layer2 interoperability.", content: "<p>Ethereum core developers have set the timeline for the next network upgrade, focusing on Layer2 interoperability and reducing Gas fees.</p>", coverUrl: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?auto=format&fit=crop&w=400&q=80", time: now },

                // 组 3：DeFi 闪电贷 (中英)
                { id: uuidv4(), groupId: "g3", lang: "zh", type: "hack", title: "某知名 DeFi 协议遭遇闪电贷攻击", summary: "据慢雾安全团队监测，某知名DeFi协议遭遇闪电贷攻击，损失约1200万美元。", content: "<p>据慢雾安全团队监测，某知名DeFi协议遭遇闪电贷攻击，损失约1200万美元。目前攻击者已将资金转入Tornado Cash。</p>", coverUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=400&q=80", time: now },
                { id: uuidv4(), groupId: "g3", lang: "en", type: "hack", title: "Popular DeFi Protocol Hit by Flash Loan Attack", summary: "According to SlowMist, a popular DeFi protocol suffered a flash loan attack resulting in a loss of $12M.", content: "<p>According to SlowMist, a popular DeFi protocol suffered a flash loan attack resulting in a loss of $12M. The attacker has moved funds to Tornado Cash.</p>", coverUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=400&q=80", time: now },

                // 组 4：Discord 钓鱼 (中英)
                { id: uuidv4(), groupId: "g4", lang: "zh", type: "scam", title: "警惕：新型 Discord 钓鱼链接蔓延", summary: "近期出现大量伪造官方机器人的钓鱼骗局，请勿点击不明 Mint 链接。", content: "<p>Web3 安全团队监测到，近期有黑客利用被攻破的 Discord 服务器，伪造官方机器人发送虚假的空投链接。已有数百名用户中招。</p>", coverUrl: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=400&q=80", time: now },
                { id: uuidv4(), groupId: "g4", lang: "en", type: "scam", title: "Alert: New Wave of Discord Phishing Links", summary: "A large number of phishing scams faking official bots have appeared recently. Do not click suspicious Mint links.", content: "<p>Web3 security teams have detected hackers using compromised Discord servers to send fake airdrop links. Hundreds of users have been affected.</p>", coverUrl: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=400&q=80", time: now },

                // 组 5：跨链桥漏洞 (仅中文)
                { id: uuidv4(), groupId: "g5", lang: "zh", type: "hack", title: "跨链桥 Protocol X 遭遇黑客攻击", summary: "由于代码漏洞，黑客提取了价值约 4000 万美元的资产。", content: "<p>据官方消息，跨链桥 Protocol X 因智能合约漏洞遭遇攻击，损失约 4000 万美元。目前官方已紧急暂停所有跨链通道，并联合安全机构展开调查。</p>", coverUrl: "https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=400&q=80", time: now }
            ];

            writeDB('articles', seedData);
            console.log('✅ 10 篇初始文章注入成功！');
        }
    } catch (e) {
        console.error('❌ 注入初始文章失败:', e);
    }
}
// 执行注入逻辑
seedInitialArticles();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// ================= 真实 DeepL 翻译引擎 =================
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
    } catch (error) {
        console.error('DeepL API 请求失败:', error.response?.data || error.message);
        throw new Error('翻译失败，请检查 API Key 是否正确或额度是否耗尽。');
    }
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
app.get('/api/tracking', (req, res) => { res.json([{ id: "1", title: "Lazarus Group", address: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96", desc: "近期异动：转移至 Tornado Cash。", tag: "FBI 通缉" }]); });

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

// 保存设置
app.put('/api/admin/settings', auth, async (req, res) => {
    const oldSettings = readDB('settings');
    const newSettings = { ...oldSettings, ...req.body };

    if (req.body.toolDescZh !== undefined && req.body.targetLangs !== undefined) {
        const zhDesc = req.body.toolDescZh;
        const targetLangs = req.body.targetLangs;
        
        let newToolDesc = oldSettings.toolDesc || {};
        newToolDesc.zh = zhDesc;

        try {
            const langs = readDB('languages').filter(l => l.active && l.code !== 'zh');
            for (let l of langs) {
                if (targetLangs.includes(l.code)) {
                    const result = await translateText([zhDesc], l.code);
                    newToolDesc[l.code] = result[0];
                }
            }
            newSettings.toolDesc = newToolDesc;
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
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
app.delete('/api/admin/article-group/:groupId', auth, (req, res) => { writeDB('articles', readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId)); res.json({ success: true }); });

app.put('/api/admin/tracking/config', auth, (req, res) => { const config = readDB('tracking'); config.interval = Math.max(0, Number(req.body.interval) || 0); writeDB('tracking', config); res.json({ success: true }); });
app.post('/api/admin/tracking/source', auth, (req, res) => { const config = readDB('tracking'); config.sources.push({ name: req.body.name, url: req.body.url }); writeDB('tracking', config); res.json({ success: true }); });
app.delete('/api/admin/tracking/source/:index', auth, (req, res) => { const config = readDB('tracking'); const idx = Number(req.params.index); if (idx >= 0 && idx < config.sources.length) { config.sources.splice(idx, 1); writeDB('tracking', config); } res.json({ success: true }); });

app.get('/api/admin/translation-logs', auth, (req, res) => {
    const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');
    if (!fs.existsSync(LOGS_FILE)) return res.json({ totalCount: 0, totalChars: 0, logs: [] });
    let logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    res.json({ totalCount: logs.length, totalChars: logs.reduce((s, l) => s + (Number(l.chars) || 0), 0), logs });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
