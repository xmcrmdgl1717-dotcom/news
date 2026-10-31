const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
// Render 会动态分配 PORT 环境变量，本地默认 3000
const PORT = process.env.PORT || 3000; 

// 中间件：解析 JSON 请求体
app.use(express.json());

// 托管 public 文件夹下的静态前端资源
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. 初始化 Supabase 客户端
// ==========================================
// 检查环境变量是否配置，防止服务器启动直接崩溃
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.warn("⚠️ 警告: 未检测到 SUPABASE_URL 或 SUPABASE_KEY 环境变量。请确保在 Render 后台配置了这些变量。");
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. API 接口定义
// ==========================================

// 接口：获取所有文章 (支持分类筛选)
app.get('/api/articles', async (req, res) => {
    try {
        let query = supabase.from('articles').select('*').order('id', { ascending: false });
        
        // 如果有 type 参数且不是 'all'，则进行过滤
        if (req.query.type && req.query.type !== 'all') {
            query = query.eq('type', req.query.type);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("获取文章列表失败:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 接口：获取单篇文章
app.get('/api/articles/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', req.params.id)
            .single(); // 只获取单条记录
            
        if (error) throw error;
        if (!data) return res.status(404).json({ error: '文章不存在' });
        
        res.json(data);
    } catch (error) {
        console.error("获取单篇文章失败:", error.message);
        res.status(404).json({ error: '文章不存在或已被删除' });
    }
});

// 接口：新增文章 (后台管理用)
app.post('/api/articles', async (req, res) => {
    try {
        const newArticle = {
            type: req.body.type || 'normal',
            title: req.body.title,
            author: req.body.author || '管理员',
            time: '刚刚',
            imageText: '[新文章]',
            desc: req.body.desc || '',
            content: req.body.content || ''
        };
        
        // 插入数据并返回插入的记录
        const { data, error } = await supabase
            .from('articles')
            .insert([newArticle])
            .select();
            
        if (error) throw error;
        res.json({ success: true, article: data[0] });
    } catch (error) {
        console.error("发布文章失败:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 接口：删除文章 (后台管理用)
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('articles')
            .delete()
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error("删除文章失败:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 3. 启动服务器
// ==========================================
// 注意：Render 要求必须绑定到 '0.0.0.0'，否则会导致服务路由失败
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`前台访问: http://localhost:${PORT}`);
    console.log(`后台访问: http://localhost:${PORT}/admin.html`);
});
