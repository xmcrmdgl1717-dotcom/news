export function initFloatingTool() {
    const toolHTML = `
        <div class="floating-tool">
            <div class="tool-inner">
                <div class="tool-default" id="toolDefault">
                    <div class="tool-title">🛡️ 链上地址安全检测</div>
                    <div class="input-group">
                        <input type="text" id="walletAddress" placeholder="输入 ETH / BTC 钱包地址...">
                        <button id="checkBtn">立即检测</button>
                    </div>
                </div>
                <div class="tool-loading" id="toolLoading">
                    <span style="color: var(--accent-color);">正在比对链上黑名单数据库...</span>
                    <div class="progress-bar"><div class="progress-inner" id="progressInner"></div></div>
                </div>
                <div class="tool-result" id="toolResult">
                    <div id="resultText"></div>
                    <div class="close-btn" id="resetBtn">重新输入检测 ✕</div>
                </div>
                <p class="disclaimer">* 本模块为前端安全演示UI，检测结果由随机算法生成，不构成任何建议。</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', toolHTML);

    const toolDefault = document.getElementById('toolDefault');
    const toolLoading = document.getElementById('toolLoading');
    const toolResult = document.getElementById('toolResult');
    const progressInner = document.getElementById('progressInner');
    const resultText = document.getElementById('resultText');

    document.getElementById('checkBtn').addEventListener('click', () => {
        const input = document.getElementById('walletAddress').value.trim();
        if (input.length < 10) return alert("请输入有效的钱包地址！");

        toolDefault.style.display = 'none';
        toolResult.style.display = 'none';
        toolLoading.style.display = 'flex';
        progressInner.style.width = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 25;
            if (progress > 100) progress = 100;
            progressInner.style.width = progress + '%';
            if (progress === 100) {
                clearInterval(interval);
                setTimeout(showResult, 400);
            }
        }, 200);
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        toolResult.style.display = 'none';
        toolLoading.style.display = 'none';
        toolDefault.style.display = 'flex';
        document.getElementById('walletAddress').value = '';
    });

    function showResult() {
        toolLoading.style.display = 'none';
        toolResult.style.display = 'flex';
        const isSafe = Math.random() > 0.5;
        toolResult.className = 'tool-result';
        
        if (isSafe) {
            toolResult.classList.add('res-safe');
            resultText.innerHTML = `<strong>✅ 安全</strong><br><span style="font-size:13px; color:#ccc">未发现风险。</span>`;
        } else {
            toolResult.classList.add('res-danger');
            resultText.innerHTML = `<strong>❌ 高危警告</strong><br><span style="font-size:13px; color:#ccc">该地址疑似黑客关联地址！</span>`;
        }
    }
}
