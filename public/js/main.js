import { fetchArticles } from './api.js';
import { initFloatingTool } from './floatingTool.js';

// 初始化悬浮窗
initFloatingTool();

// 页面路由切换
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page-view');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        
        link.classList.add('active');
        const pageId = link.dataset.page;
        document.getElementById(`page-${pageId}`).classList.add('active');
    });
});

// 渲染新闻列表组件
function renderList(articles, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    articles.forEach(item => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-header"><span>${item.author}</span><span>${item.time}</span></div>
            <h2 class="news-title">${item.title}</h2>
            <div class="news-content">
                <div class="news-image">${item.imageText}</div>
                <p class="news-desc">${item.desc}</p>
            </div>
        `;
        // 点击卡片跳转详情页
        card.addEventListener('click', () => {
            window.location.href = `/article.html?id=${item.id}`;
        });
        container.appendChild(card);
    });
}

// 加载初始数据
async function loadHomeData() {
    const allArticles = await fetchArticles('all');
    // 过滤掉纯安全事件的，保持首页综合属性 (仅作演示，实际按需处理)
    renderList(allArticles, 'home-list');
}

// 安全事件筛选逻辑
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const type = tab.dataset.type;
        const articles = await fetchArticles(type);
        renderList(articles, 'events-list');
    });
});

loadHomeData();
