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
                
                this.canvas.clear();
                this.canvas.setBackgroundColor('#FFFFFF', this.canvas.renderAll.bind(this.canvas));
                
                const text = new fabric.Textbox(cleanText, {
                    left: 50,
                    top: 50,
                    fontSize: 14,
                    fill: '#000000',
                    fontFamily: 'Arial',
                    width: this.canvas.width - 100,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    breakWords: true,
                    lockUniScaling: true,
                    padding: 10
                });
                
                // 计算文本高度
                const textHeight = text.calcTextHeight();
                text.set({
                    height: textHeight + 20
                });
                
                this.canvas.add(text);
                this.canvas.renderAll();
                this.canvas.setActiveObject(text);
                
                if (window.drawingBoard) {
                    window.drawingBoard.saveState();
                }
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