class TextRecognitionHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.initializeButton();
    }

    initializeButton() {
        const textRecognitionBtn = document.getElementById('textRecognition');
        textRecognitionBtn.addEventListener('click', () => this.handleTextRecognition());
    }

    showProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
        `;
        progressContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">正在识别文本...</div>
        `;
        document.querySelector('.canvas-container').appendChild(progressContainer);
        return progressContainer;
    }

    hideProgressBar(progressContainer) {
        if (progressContainer) {
            progressContainer.remove();
        }
    }

    async handleTextRecognition() {
        const textRecognitionBtn = document.getElementById('textRecognition');
        textRecognitionBtn.disabled = true;

        const progressContainer = this.showProgressBar();

        try {
            const dataUrl = this.canvas.toDataURL('image/png');
            const blob = await (await fetch(dataUrl)).blob();
            
            const formData = new FormData();
            formData.append('file', blob, 'canvas-image.png');

            console.log('发送请求到服务器...');
            const response = await fetch('https://ideasai.onrender.com/uploadMd', {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(30000)
            });

            console.log('服务器响应状态:', response.status);
            const responseText = await response.text();
            console.log('服务器原始响应:', responseText);

            if (!response.ok) {
                throw new Error(`服务器响应错误 (${response.status}): ${responseText}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`解析JSON失败: ${responseText}`);
            }
            
            if (data.analysisResult) {
                let cleanText = data.analysisResult
                    .replace(/```markdown\n/g, '')
                    .replace(/```/g, '')
                    .trim();

                // 创建结果容器
                const resultContainer = document.createElement('div');
                resultContainer.className = 'result-container';
                resultContainer.innerHTML = `
                    <div class="result-content">${cleanText}</div>
                    <div class="button-group">
                        <button class="download-result">下载</button>
                        <button class="close-result">关闭</button>
                    </div>
                `;

                // 添加样式，使其与画布大小一致
                resultContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 800px;
                    height: 600px;
                    background: white;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                `;

                // 添加内容区域样式
                const resultContent = resultContainer.querySelector('.result-content');
                resultContent.style.cssText = `
                    flex: 1;
                    padding: 20px;
                    overflow: auto;
                    white-space: pre-wrap;
                    font-size: 14px;
                    line-height: 1.5;
                `;

                // 添加按钮组样式
                const buttonGroup = resultContainer.querySelector('.button-group');
                buttonGroup.style.cssText = `
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 10px 20px;
                    background: #f5f5f5;
                    border-top: 1px solid #e0e0e0;
                `;

                // 添加按钮样式
                const buttons = resultContainer.querySelectorAll('button');
                buttons.forEach(button => {
                    button.style.cssText = `
                        padding: 6px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    `;
                });

                const downloadButton = resultContainer.querySelector('.download-result');
                downloadButton.style.cssText += `
                    background-color: #4CAF50;
                    color: white;
                `;

                const closeButton = resultContainer.querySelector('.close-result');
                closeButton.style.cssText += `
                    background-color: #f5f5f5;
                    color: #333;
                `;

                // 添加按钮事件
                downloadButton.addEventListener('click', () => {
                    const blob = new Blob([cleanText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `text-recognition-${new Date().toISOString().slice(0,10)}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });

                closeButton.addEventListener('click', () => {
                    resultContainer.remove();
                });

                document.querySelector('.canvas-container').appendChild(resultContainer);
            } else {
                throw new Error('未能识别出文本内容');
            }
        } catch (error) {
            console.error('文本识别失败:', error);
            let errorMessage = '文本识别失败: ';
            
            if (error.name === 'TimeoutError') {
                errorMessage += '请求超时，请检查网络连接';
            } else if (error.name === 'AbortError') {
                errorMessage += '请求被中断';
            } else if (!navigator.onLine) {
                errorMessage += '请检查网络连接';
            } else {
                errorMessage += error.message || '请稍后重试';
            }
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = errorMessage;
            errorDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #ff4444;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                z-index: 1000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
        } finally {
            this.hideProgressBar(progressContainer);
            textRecognitionBtn.disabled = false;
        }
    }
} 