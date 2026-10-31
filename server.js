const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // 托管静态文件

const DB_FILE = path.join(__dirname, 'data.json');

// 读取数据
const readData = () => {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
};

// 写入数据
const writeData = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// 接口：获取所有文章 (可带分类筛选)
app.get('/api/articles', (req, res) => {
    let articles = readData();
    const { type } = req.query;
    if (type && type !== 'all') {
        articles = articles.filter(a => a.type === type);
    }
    res.json(articles);
});

// 接口：获取单篇文章
app.get('/api/articles/:id', (req, res) => {
    const articles = readData();
    const article = articles.find(a => a.id === req.params.id);
    if (article) res.json(article);
    else res.status(404).json({ error: '文章不存在' });
});

// 接口：新增文章 (后台管理用)
app.post('/api/articles', (req, res) => {
    const articles = readData();
    const newArticle = {
        id: Date.now().toString(),
        type: req.body.type || 'normal',
        title: req.body.title,
        author: req.body.author || '管理员',
        time: '刚刚',
        imageText: '[新文章]',
        desc: req.body.desc,
        content: req.body.content
    };
    articles.unshift(newArticle); // 插在最前面
    writeData(articles);
    res.json({ success: true, article: newArticle });
});

// 接口：删除文章 (后台管理用)
app.delete('/api/articles/:id', (req, res) => {
    let articles = readData();
    articles = articles.filter(a => a.id !== req.params.id);
    writeData(articles);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
