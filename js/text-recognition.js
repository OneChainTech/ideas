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

    // 修改压缩图片方法
    async compressImage(dataUrl, maxWidth = 800) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 如果图片宽度超过最大宽度，按比例缩放
                if (width > maxWidth) {
                    height = Math.floor(height * (maxWidth / width));
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // 压缩为 JPEG 格式，质量降低到 0.3
                resolve(canvas.toDataURL('image/jpeg', 0.3));
            };
        });
    }

    async handleTextRecognition() {
        const textRecognitionBtn = document.getElementById('textRecognition');
        textRecognitionBtn.disabled = true;

        const progressContainer = this.showProgressBar();

        try {
            // 获取画布图片并使用更激进的压缩参数
            const originalDataUrl = this.canvas.toDataURL('image/png');
            const compressedDataUrl = await this.compressImage(originalDataUrl, 800);
            const blob = await (await fetch(compressedDataUrl)).blob();
            
            const formData = new FormData();
            formData.append('file', blob, 'canvas-image.jpg');

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

                // 移除已存在的容器
                const existingContainer = document.querySelector('.mermaid-canvas-container');
                if (existingContainer) {
                    existingContainer.remove();
                }

                // 创建容器
                const container = document.createElement('div');
                container.className = 'mermaid-canvas-container';  // 使用相同的类名
                container.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #ffffff;
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                `;

                // 创建内容区域
                const content = document.createElement('div');
                content.className = 'mermaid-content';  // 使用相同的类名
                content.style.cssText = `
                    flex: 1;
                    padding: 24px;
                    overflow: auto;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #ffffff;
                    border-radius: 4px;
                    position: relative;
                `;

                // 创建内容容器
                const contentInner = document.createElement('div');
                contentInner.style.cssText = `
                    background: #ffffff;
                    border-radius: 4px;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;  // 改为顶部对齐
                    padding: 20px;
                    overflow: auto;
                `;

                // 创建文本容器
                const textContent = document.createElement('div');
                textContent.style.cssText = `
                    white-space: pre-wrap;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #333;
                    width: 100%;
                `;
                textContent.textContent = cleanText;
                contentInner.appendChild(textContent);

                // 创建按钮容器
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                    position: absolute;
                    bottom: 16px;
                    right: 16px;
                    display: flex;
                    gap: 8px;
                    z-index: 1001;
                `;

                // 创建下载按钮
                const downloadButton = this.createIconButton('download');
                downloadButton.title = '下载';
                downloadButton.onclick = () => {
                    const blob = new Blob([cleanText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `text-recognition-${new Date().toISOString().slice(0,10)}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                };

                // 创建关闭按钮
                const closeButton = this.createIconButton('close');
                closeButton.title = '关闭';
                closeButton.onclick = () => container.remove();

                // 组装 DOM
                buttonContainer.appendChild(downloadButton);
                buttonContainer.appendChild(closeButton);
                content.appendChild(contentInner);
                content.appendChild(buttonContainer);
                container.appendChild(content);

                // 添加到画布容器
                document.querySelector('.canvas-container').appendChild(container);
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

    // 添加创建按钮的辅助方法
    createIconButton(icon) {
        const button = document.createElement('button');
        button.className = 'icon-button';
        button.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 4px;
            cursor: pointer;
            color: #666;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons';
        iconSpan.style.cssText = `
            font-size: 20px;
        `;
        iconSpan.textContent = icon;

        button.appendChild(iconSpan);

        button.addEventListener('mouseover', () => {
            button.style.background = '#f0f0f0';
            button.style.color = '#333';
            button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });

        button.addEventListener('mouseout', () => {
            button.style.background = 'rgba(255, 255, 255, 0.9)';
            button.style.color = '#666';
            button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        });

        return button;
    }
} 