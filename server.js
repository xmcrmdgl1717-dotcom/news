const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. 初始化 PostgreSQL 连接池
// ==========================================
if (!process.env.DATABASE_URL) {
    console.warn("⚠️ 警告: 未检测到 DATABASE_URL 环境变量。请确保在 Render 后台配置了该变量。");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render 的数据库通常需要开启 SSL，但无需验证自签名证书
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ==========================================
// 2. 启动时自动建表 & 插入初始数据
// ==========================================
async function initDB() {
    try {
        // 建表语句 (注意 desc 是保留字，必须加双引号)
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL DEFAULT 'normal',
                title TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT '管理员',
                time TEXT NOT NULL DEFAULT '刚刚',
                "imageText" TEXT NOT NULL DEFAULT '[新文章]',
                "desc" TEXT,
                content TEXT
            );
        `;
        await pool.query(createTableSQL);
        console.log("✅ 数据库表 articles 已就绪");

        // 检查表里有没有数据，如果没有，则插入 10 篇默认文章
        const checkRes = await pool.query('SELECT COUNT(*) FROM articles');
        const count = parseInt(checkRes.rows[0].count);

        if (count === 0) {
            console.log("⏳ 检测到空表，正在插入 10 篇初始文章...");
            const initialArticles = [
                ['hack', '币安遭遇巨额黑客攻击！何一表态全额兜底', '无聊科技站', '15小时前', '[比特币图片]', '10月30日币安联合创始人何一公开发声，明确表示将全额兜底此次被盗资产。据悉，被搬空的钱包，正是币安拿来给客户兜底的那个钱包。', '<p>10月30日币安联合创始人何一公开发声，明确表示将全额兜底此次被盗资产。据悉，被搬空的钱包，正是币安拿来给客户兜底的那个钱包。56亿资产被盗，稳定币冻结但ETH难以追回。</p><p><br></p><p>目前，币安安全团队正在配合执法部门进行链上追踪，并已冻结部分稳定币资金。</p>'],
                ['normal', '从币安被盗看crypto去中心化', '数字小匣', '2小时前', '[FBI通缉令]', '大家天天讲去中心化，可钱真的被偷以后，第一反应还是找中心化机构冻结资产。币安确认此次事件影响约63亿美元。', '<p>大家天天讲去中心化，可钱真的被偷以后，第一反应还是找中心化机构冻结资产。币安确认此次事件影响约63亿美元。</p><p>这引发了一个深刻的讨论：在极致的安全面前，去中心化是否真的是万能药？</p>'],
                ['hack', '跨链桥 Protocol X 遭遇黑客攻击', '安全预警', '1小时前', '[漏洞]', '由于代码漏洞，黑客提取了价值约 4000 万美元的资产。团队已暂停跨链功能，并与安全机构展开合作。', '<p>据官方消息，跨链桥 Protocol X 因智能合约漏洞遭遇攻击，损失约 4000 万美元。目前官方已紧急暂停所有跨链通道。</p>'],
                ['scam', '警惕：新型 Discord 钓鱼链接蔓延', '反诈中心', '3小时前', '[钓鱼]', '近期出现大量伪造官方机器人的钓鱼骗局，请勿点击不明 Mint 链接，不要随意授权钱包。', '<p>Web3 安全团队监测到，近期有黑客利用被攻破的 Discord 服务器，伪造官方机器人发送虚假的空投链接。已有数百名用户中招。</p>'],
                ['hack', '某 DeFi 协议遭遇闪电贷攻击', '链上追踪者', '6小时前', '[安全通报]', '据慢雾安全团队监测，某知名DeFi协议遭遇闪电贷攻击，损失约1200万美元。攻击者已将资金转入Tornado Cash。', '<p>慢雾安全团队发文称，某头部 DeFi 协议遭遇闪电贷连环攻击，导致池内资金被掏空。目前攻击者已将资金分散转移至混币器。</p>'],
                ['normal', '以太坊基金会发布最新路线图', '慢钱的力量', '4小时前', '[ETH图标]', '以太坊核心开发者会议确定了下一次网络升级的时间节点，重点解决Layer2互操作性问题及降低Gas费用。', '<p>以太坊开发者大会确定了 EIP-4844 之后的新路线图，未来将重点关注跨 Rollup 的互操作性以及进一步降低 Gas 费。</p>'],
                ['scam', '假冒币安客服诈骗事件频发', '社区举报', '12小时前', '[客服]', '黑客通过 Telegram 冒充官方客服，以“解除风控”为由骗取用户验证码。官方重申：绝不会索要验证码。', '<p>多名用户反映，有黑客在 Telegram 上冒充币安官方客服，要求用户提供验证码或进行屏幕共享以“解除账号风控”。请务必警惕！</p>'],
                ['normal', '美SEC再次推迟比特币ETF决议', '加密观察', '5小时前', '[SEC大楼]', '美国证券交易委员会（SEC）宣布，将推迟对某资管巨头提交的现货比特币ETF申请作出决定，市场情绪受到影响。', '<p>SEC 今日发布文件称，需要更多时间来评估相关申请。受此消息影响，比特币短线跌破关键支撑位。</p>'],
                ['hack', '主流 Web3 库爆出高危漏洞', 'GitHub 监控', '8小时前', '[代码]', '某常用智能合约开发库被爆出存在整数溢出风险，请所有开发者尽快更新至最新版本以防资产受损。', '<p>GitHub 安全公告指出，某下载量极高的 Web3 开发依赖库存在严重漏洞，可能导致合约被恶意操控。请开发者尽快执行 npm update。</p>'],
                ['normal', '比特币全网算力创历史新高', '矿工日记', '9小时前', '[矿机图片]', '随着币价回暖及新一代ASIC矿机交付，比特币全网算力突破新高，矿企竞争进入白热化阶段。', '<p>数据显示，比特币全网算力（7日移动平均）已突破历史极值。多家北美矿企宣布了新的扩张计划。</p>']
            ];

            for (let art of initialArticles) {
                await pool.query(
                    `INSERT INTO articles (type, title, author, time, "imageText", "desc", content) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    art
                );
            }
            console.log("✅ 10 篇初始文章插入完成");
        }

    } catch (err) {
        console.error("❌ 数据库初始化失败:", err.message);
    }
}
// 执行初始化
initDB();

// ==========================================
// 3. API 接口定义
// ==========================================

// 获取所有文章 (支持分类筛选)
app.get('/api/articles', async (req, res) => {
    try {
        let sql = 'SELECT * FROM articles ORDER BY id DESC';
        const params = [];
        if (req.query.type && req.query.type !== 'all') {
            sql = 'SELECT * FROM articles WHERE type = $1 ORDER BY id DESC';
            params.push(req.query.type);
        }
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error("获取文章列表失败:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 获取单篇文章
app.get('/api/articles/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM articles WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '文章不存在' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("获取单篇文章失败:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 新增文章
app.post('/api/articles', async (req, res) => {
    try {
        const { type, title, author, desc, imageText, content } = req.body;
        const sql = `
            INSERT INTO articles (type, title, author, time, "imageText", "desc", content)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            type || 'normal',
            title,
            author || '管理员',
            '刚刚',
            imageText || '[新文章]',
            desc || '',
            content || ''
        ];
        const result = await pool.query(sql, values);
        res.json({ success: true, article: result.rows[0] });
    } catch (err) {
        console.error("发布文章失败:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 删除文章
app.delete('/api/articles/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("删除文章失败:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. 启动服务器
// ==========================================
// 注意：必须绑定 '0.0.0.0'，以适配 Render 的路由要求
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
