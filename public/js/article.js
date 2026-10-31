import { fetchArticleById } from './api.js';
import { initFloatingTool } from './floatingTool.js';

initFloatingTool();

// 从 URL 参数中获取 ID
const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('id');

async function loadArticle() {
    if (!articleId) {
        document.getElementById('article-container').innerHTML = '<p>文章不存在</p>';
        return;
    }
    
    const article = await fetchArticleById(articleId);
    const container = document.getElementById('article-container');
    
    if (article.error) {
        container.innerHTML = `<p>${article.error}</p>`;
        return;
    }

    container.innerHTML = `
        <h1>${article.title}</h1>
        <div class="article-meta">
            作者：${article.author} | 发布于：${article.time}
        </div>
        <div class="article-body">
            <p>${article.content}</p>
        </div>
    `;
}

loadArticle();
