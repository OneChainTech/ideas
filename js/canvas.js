class DrawingBoard {
    constructor() {
        this.canvas = document.getElementById('drawingBoard');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.isDrawing = false;
        this.undoStack = [];
        this.mode = 'pen';
        this.startX = 0;
        this.startY = 0;
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        this.colorPicker = document.getElementById('colorPicker');
        this.initializeCanvas();
        this.setupEventListeners();
        this.loadState();
        this.lastDrawTime = 0;
        this.drawRequestId = null;
        this.lastState = null;
        this.currentShape = null;
        this.backgroundImage = null;
        this.isSubmitting = false;
    }

    initializeCanvas() {
        this.canvas.width = 768;
        this.canvas.height = 520;
        this.tempCanvas.width = 768;
        this.tempCanvas.height = 520;
        
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.font = '16px Arial';
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.ctx.strokeStyle = e.target.value;
            this.ctx.fillStyle = e.target.value;
        });

        document.getElementById('undo').addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('pen').addEventListener('click', () => {
            this.setMode('pen');
        });

        document.getElementById('text').addEventListener('click', () => {
            this.setMode('text');
        });

        document.getElementById('new').addEventListener('click', () => {
            this.clearCanvas();
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.mode === 'text') {
                this.handleTextInput(e);
            }
        });

        document.getElementById('confirmText').addEventListener('click', () => {
            this.addText();
        });

        document.getElementById('cancelText').addEventListener('click', () => {
            const textInput = document.getElementById('textInput');
            textInput.style.display = 'none';
            document.getElementById('textContent').value = '';
        });

        setInterval(() => this.saveState(), 1000);

        document.getElementById('eraser').addEventListener('click', () => {
            this.setMode('eraser');
        });

        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const shape = e.target.dataset.shape;
                this.setMode('shape');
                this.currentShape = shape;
                document.querySelectorAll('.dropdown-item').forEach(i => {
                    i.classList.remove('active');
                });
                e.target.classList.add('active');
                
                const shapeButton = document.getElementById('shape');
                const icon = e.target.querySelector('.material-icons').textContent;
                shapeButton.innerHTML = `<span class="material-icons">${icon}</span>`;
            });
        });

        document.getElementById('save').addEventListener('click', () => {
            this.saveImage();
        });

        const colorPicker = document.getElementById('colorPicker');
        const colorPreview = document.querySelector('.color-preview');
        if (colorPicker && colorPreview) {
            colorPicker.addEventListener('change', (e) => {
                this.ctx.strokeStyle = e.target.value;
                this.ctx.fillStyle = e.target.value;
                colorPreview.style.backgroundColor = e.target.value;
            });
            colorPreview.style.backgroundColor = colorPicker.value;
        }

        document.getElementById('aiRenderButton').addEventListener('click', async () => {
            if (this.isSubmitting) return;
            this.isSubmitting = true;

            const progressBar = showProgressBar();
            
            try {
                // 创建要上传的图像数据
                const formData = new FormData();
                const imageBlob = await new Promise(resolve => {
                    this.canvas.toBlob(resolve, 'image/png');
                });
                formData.append('file', imageBlob, 'drawing.png');

                // 上传图像并获取分析结果
                const response = await uploadImage(formData);
                
                // 从返回的文本中提取 mermaid 代码
                const mermaidMatch = response.match(/```mermaid\n([\s\S]*?)```/);
                if (mermaidMatch && mermaidMatch[1]) {
                    const mermaidCode = mermaidMatch[1].trim();
                    console.log('Extracted mermaid code:', mermaidCode);
                    
                    // 渲染 mermaid 图表
                    await renderMermaidDiagram(mermaidCode);
                    
                    // 保存当前状态
                    this.saveState();
                } else {
                    throw new Error('未能识别出有效的流程图代码');
                }
            } catch (error) {
                console.error('AI rendering failed:', error);
                displayResponse(error.message || 'AI 渲染失败，请稍后重试');
            } finally {
                hideProgressBar();
                this.isSubmitting = false;
            }
        });

        // 添加图片上传处理
        const imageUpload = document.getElementById('imageUpload');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadImage(file);
                }
                // 清空 input 的值，这样同一张图片可以重复上传
                imageUpload.value = '';
            });
        }
    }

    setMode(mode) {
        this.mode = mode;
        
        switch(mode) {
            case 'pen':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                this.canvas.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAQBJREFUOE+dlDEOgzAMRX8nyQmqnqJsZekBegc2lh6kJ2FhYmRh6QFyhx6lJ0BKJBRFwXYcNYuF7Pd+7GAbKT6qYr0RkTUzL4loKyL7pmleOedUxVJKW2PMEcCOmRdxvgNwF5FDCGG31vpENkpEFwBzZr7FxEtm3sQYL977KzNvAcyI6FxCLYAzgAUzX/I8O+dUxU0ArXPuHmM8pZTwJ4CU0sk5d2Lmg/e+qRHZKKV0jDEevfcXZp7kc/6wbPjzFbKR5YY1QK34r6Aq4FBgFfC/wYOBQ0AlMI+cc8Wm35OIzEII86EOywn5RkQWzPyIMR5TSk0J/AowxrSllL33/gkVYHUZX0UzNQAAAABJRU5ErkJggg==) 0 20, auto';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            case 'shape':
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }

        const buttons = ['pen', 'eraser', 'shape', 'text'];
        buttons.forEach(btn => {
            const element = document.getElementById(btn);
            if (element) {
                element.classList.toggle('active', btn === mode);
            }
        });
    }

    clearCanvas() {
        const currentFillStyle = this.ctx.fillStyle;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = currentFillStyle;
        
        this.backgroundImage = null;
        this.undoStack = [];
        this.saveState();
    }

    saveState() {
        const imageData = this.canvas.toDataURL();
        localStorage.setItem('drawingBoardState', imageData);
        
        const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        if (this.undoStack.length === 0 || !this.compareImageData(currentState, this.undoStack[this.undoStack.length - 1])) {
            this.undoStack.push(currentState);
        }
    }

    compareImageData(imageData1, imageData2) {
        const data1 = imageData1.data;
        const data2 = imageData2.data;
        if (data1.length !== data2.length) return false;
        for (let i = 0; i < data1.length; i++) {
            if (data1[i] !== data2[i]) return false;
        }
        return true;
    }

    loadState() {
        const savedState = localStorage.getItem('drawingBoardState');
        if (savedState) {
            const img = new Image();
            img.onload = () => {
                this.ctx.drawImage(img, 0, 0);
                this.saveState();
            };
            img.src = savedState;
        }
    }

    handleTextInput(e) {
        const textInput = document.getElementById('textInput');
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        textInput.style.display = 'block';
        textInput.style.left = `${x}px`;
        textInput.style.top = `${y}px`;
        textInput.dataset.x = x;
        textInput.dataset.y = y;

        const input = document.getElementById('textContent');
        input.value = '';
        input.focus();
    }

    addText() {
        const textInput = document.getElementById('textInput');
        const input = document.getElementById('textContent');
        const text = input.value.trim();
        
        if (text) {
            const x = parseInt(textInput.dataset.x);
            const y = parseInt(textInput.dataset.y);
            
            this.ctx.fillStyle = this.colorPicker.value;
            this.ctx.fillText(text, x, y);
            this.saveState();
        }

        textInput.style.display = 'none';
        input.value = '';
    }

    undo() {
        if (this.undoStack.length > 1) {
            this.undoStack.pop();
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.ctx.putImageData(previousState, 0, 0);
            const imageData = this.canvas.toDataURL();
            localStorage.setItem('drawingBoardState', imageData);
        } else if (this.undoStack.length === 1) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.undoStack = [];
            localStorage.removeItem('drawingBoardState');
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;

        if (this.mode === 'pen' || this.mode === 'eraser') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            if (this.mode === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = 20;
            } else {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.lineWidth = 2;
            }
        } else if (this.mode === 'shape') {
            this.lastState = this.undoStack[this.undoStack.length - 1];
        }
    }

    drawArrow(fromX, fromY, toX, toY) {
        const headLength = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
    }

    draw(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.mode === 'pen' || this.mode === 'eraser') {
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        } else if (this.mode === 'shape') {
            if (this.lastState) {
                this.ctx.putImageData(this.lastState, 0, 0);
            }

            this.ctx.beginPath();
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.lineWidth = 2;
            
            switch (this.currentShape) {
                case 'rect':
                    const width = x - this.startX;
                    const height = y - this.startY;
                    this.ctx.strokeRect(
                        width > 0 ? this.startX : x,
                        height > 0 ? this.startY : y,
                        Math.abs(width),
                        Math.abs(height)
                    );
                    break;
                case 'circle':
                    const w = Math.abs(x - this.startX);
                    const h = Math.abs(y - this.startY);
                    const centerX = Math.min(this.startX, x) + w / 2;
                    const centerY = Math.min(this.startY, y) + h / 2;
                    this.ctx.ellipse(centerX, centerY, w / 2, h / 2, 0, 0, 2 * Math.PI);
                    this.ctx.stroke();
                    break;
                case 'arrow':
                    this.drawArrow(this.startX, this.startY, x, y);
                    break;
            }
        }
    }

    stopDrawing(e) {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.lastState = null;
            if (this.mode === 'eraser') {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.lineWidth = 2;
            }
            this.saveState();
        }
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = `drawing-${new Date().toISOString().slice(0,10)}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                const maxWidth = this.canvas.width * 0.8;
                const maxHeight = this.canvas.height * 0.8;
                
                const scale = Math.min(
                    maxWidth / img.width,
                    maxHeight / img.height
                );
                
                const x = (this.canvas.width - img.width * scale) / 2;
                const y = (this.canvas.height - img.height * scale) / 2;
                
                this.ctx.drawImage(
                    img,
                    x, y,
                    img.width * scale,
                    img.height * scale
                );
                
                this.backgroundImage = {
                    image: img,
                    x, y,
                    width: img.width * scale,
                    height: img.height * scale
                };
                
                this.saveState();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 获取画布中有内容的区域
    getContentBounds() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        let minX = this.canvas.width;
        let minY = this.canvas.height;
        let maxX = 0;
        let maxY = 0;
        
        // 遍历像素数据找到内容边界
        for (let y = 0; y < this.canvas.height; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const idx = (y * this.canvas.width + x) * 4;
                // 检查像素是否不是白色（排除背景）
                if (data[idx] !== 255 || data[idx + 1] !== 255 || data[idx + 2] !== 255) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // 添加边距
        const padding = 20;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(this.canvas.width, maxX + padding);
        maxY = Math.min(this.canvas.height, maxY + padding);
        
        // 如果没有找到内容，返回整个画布
        if (minX > maxX || minY > maxY) {
            return { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // 修改上传图片的方法
    async uploadForAnalysis() {
        try {
            // 获取有效内容区域
            const bounds = this.getContentBounds();
            console.log('Content bounds:', bounds);

            // 创建临时画布来存储裁剪的内容
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = bounds.width;
            tempCanvas.height = bounds.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 设置白色背景
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, bounds.width, bounds.height);

            // 复制内容区域
            tempCtx.drawImage(
                this.canvas,
                bounds.x, bounds.y, bounds.width, bounds.height,
                0, 0, bounds.width, bounds.height
            );

            // 转换为 blob
            const blob = await new Promise(resolve => {
                tempCanvas.toBlob(resolve, 'image/png');
            });

            console.log('Upload image size:', blob.size);

            // 创建 FormData 并上传
            const formData = new FormData();
            formData.append('file', blob, 'drawing.png');

            console.log('Sending request to server...');
            const response = await fetch('https://ideasai.onrender.com/upload', {
                method: 'POST',
                body: formData
            });

            console.log('Server response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Server response:', result);

            return result;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }
}

function showProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <div class="progress-text">正在分析图像...</div>
    `;
    document.querySelector('.canvas-container').appendChild(progressContainer);
    return progressContainer;
}

function hideProgressBar() {
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.remove();
    }
}

function displayResponse(response) {
    console.log('Displaying response:', response);
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
    
    let content = response;
    const isError = typeof response === 'string' && 
                   (response.includes('error') || response.includes('失败'));
    
    if (typeof response === 'object') {
        content = JSON.stringify(response, null, 2);
    }
    
    resultContainer.innerHTML = `
        <div class="result-content ${isError ? 'error' : ''}">${content}</div>
        <button class="close-result">关闭</button>
    `;
    document.querySelector('.canvas-container').appendChild(resultContainer);

    resultContainer.querySelector('.close-result').addEventListener('click', () => {
        resultContainer.remove();
    });
}

// 添加测试模式
const TEST_MODE = false; // 设置为 true 启用测试模式

async function uploadImage(formData) {
    if (TEST_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return "```mermaid\ngraph TD\n    A[开始] --> B[处理]\n    B --> C[结束]\n```";
    }
    
    try {
        // 获取图像数据
        const imageData = formData.get('file');
        
        // 发送消息给 background script
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'uploadImage',
                imageData: URL.createObjectURL(imageData)
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response.error));
                }
            });
        });

        console.log('API Response:', response);
        
        if (!response.analysisResult) {
            throw new Error('API 返回数据格式错误');
        }

        return response.analysisResult;
    } catch (error) {
        console.error('Upload Error:', error);
        throw new Error(error.message || '上传失败');
    }
}

function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// 在文件开头初始化 mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
});

// 添加渲染 mermaid 图表的函数
async function renderMermaidDiagram(mermaidCode) {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    // 设置容器宽度与画布相同，确保生成的SVG大小合适
    tempContainer.style.width = document.getElementById('drawingBoard').width + 'px';
    document.body.appendChild(tempContainer);

    try {
        // 配置 mermaid 渲染选项
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });

        // 渲染 mermaid 图表
        const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
        
        // 创建一个临时的 SVG 容器来调整 SVG 大小
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svg;
        const svgElement = tempDiv.querySelector('svg');
        
        // 获取画布尺寸
        const canvas = document.getElementById('drawingBoard');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // 设置 SVG 尺寸以适应画布
        svgElement.setAttribute('width', canvasWidth);
        svgElement.setAttribute('height', canvasHeight);
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // 将调整后的 SVG 转换为字符串
        const adjustedSvg = tempDiv.innerHTML;
        
        // 创建图片对象
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            // 使用调整后的 SVG
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(adjustedSvg)));
        });

        // 获取画布上下文
        const ctx = canvas.getContext('2d');
        
        // 保存当前画布状态到撤销栈
        const currentState = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        
        // 清除画布
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // 计算绘制位置和尺寸
        const aspectRatio = img.width / img.height;
        let drawWidth = canvasWidth * 0.9;
        let drawHeight = drawWidth / aspectRatio;
        
        // 如果高度超出画布，则按高度计算
        if (drawHeight > canvasHeight * 0.9) {
            drawHeight = canvasHeight * 0.9;
            drawWidth = drawHeight * aspectRatio;
        }
        
        // 计算居中位置
        const x = (canvasWidth - drawWidth) / 2;
        const y = (canvasHeight - drawHeight) / 2;
        
        // 绘制图表
        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        // 将当前状态添加到撤销栈
        const drawingBoard = document.querySelector('#drawingBoard').__drawingBoard;
        if (drawingBoard) {
            drawingBoard.undoStack.push(currentState);
            drawingBoard.saveState();
        }

    } catch (error) {
        console.error('Mermaid rendering failed:', error);
        throw new Error('流程图渲染失败：' + error.message);
    } finally {
        // 清理临时容器
        document.body.removeChild(tempContainer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const drawingBoard = new DrawingBoard();
}); 