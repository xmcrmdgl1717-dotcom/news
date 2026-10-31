export async function fetchArticles(type = 'all') {
    const res = await fetch(`/api/articles?type=${type}`);
    return await res.json();
}

export async function fetchArticleById(id) {
    const res = await fetch(`/api/articles/${id}`);
    return await res.json();
}

export async function createArticle(data) {
    const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

export async function deleteArticle(id) {
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    return await res.json();
}
