import { fetchArticles, createArticle, deleteArticle } from './api.js';

async function loadTable() {
    const articles = await fetchArticles('all');
    const tbody = document.getElementById('admin-list');
    tbody.innerHTML = '';
    
    articles.forEach(article => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${article.type}</td>
            <td>${article.title}</td>
            <td>${article.author}</td>
            <td><button class="btn-danger" data-id="${article.id}">删除</button></td>
        `;
        // 删除事件
        tr.querySelector('.btn-danger').addEventListener('click', async (e) => {
            if(confirm('确定要删除这篇文章吗？')) {
                await deleteArticle(e.target.dataset.id);
                loadTable();
            }
        });
        tbody.appendChild(tr);
    });
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    const title = document.getElementById('title').value;
    const type = document.getElementById('type').value;
    const author = document.getElementById('author').value;
    const desc = document.getElementById('desc').value;
    const content = document.getElementById('content').value;

    if (!title || !desc || !content) return alert('请填写完整信息');

    await createArticle({ title, type, author, desc, content });
    alert('发布成功！');
    
    // 清空表单并刷新表格
    document.getElementById('title').value = '';
    document.getElementById('desc').value = '';
    document.getElementById('content').value = '';
    loadTable();
});

// 初始化
loadTable();
