function showProgressBar() {
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

async function renderMermaidDiagram(mermaidCode) {
    try {
        let code = mermaidCode;
        
        if (code.includes('```mermaid')) {
            code = code.replace(/```mermaid\n([\s\S]*?)```/, '$1');
        }
        
        code = code.trim();
        
        if (!code.startsWith('graph') && !code.startsWith('flowchart')) {
            code = 'flowchart TD\n' + code;
        }
        
        console.log('最终处理的 Mermaid 代码:', code);

        // 创建结果容器
        const resultContainer = document.createElement('div');
        resultContainer.className = 'mermaid-result-container';
        resultContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        `;

        // 创建关闭按
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '关闭';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border: none;
            background: #f0f0f0;
            border-radius: 4px;
            cursor: pointer;
        `;
        closeButton.onclick = () => resultContainer.remove();

        // 创建 mermaid 容器
        const mermaidContainer = document.createElement('div');
        mermaidContainer.style.cssText = `
            margin-top: 30px;
            min-width: 300px;
            min-height: 200px;
        `;

        resultContainer.appendChild(closeButton);
        resultContainer.appendChild(mermaidContainer);
        document.querySelector('.canvas-container').appendChild(resultContainer);

        // 渲染 mermaid 图表
        const { svg } = await mermaid.render('mermaid-' + Date.now(), code);
        mermaidContainer.innerHTML = svg;

    } catch (error) {
        console.error('Mermaid rendering error:', error);
        console.error('Problematic code:', code);
        throw new Error('Mermaid 图表渲染失败: ' + error.message);
    }
}

// 添加防抖函数以限制 saveState 的调用频率
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

class DrawingBoard {
    constructor() {
        this.mode = 'pen';
        this.colorPicker = document.getElementById('colorPicker');
        this.isSubmitting = false;
        this.undoStack = [];
        this.redoStack = [];
        this.isFirstDraw = true;
        this.currentStateIndex = -1;
        this.currentShape = null;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentShapeIcon = null;
        this.isUndoing = false;
        
        // 确保 fabric 已经加载
        if (typeof fabric === 'undefined') {
            console.error('Fabric.js 未加载');
            return;
        }

        // 定义 emptyState，确保使用正确的版本号
        this.emptyState = JSON.stringify({
            version: fabric.version || "5.3.1",
            objects: [],
            background: "#FFFFFF"
        });

        // 清理可能存在的无效状态
        this.cleanInvalidStates();
        
        // 初始化 Fabric Canvas
        this.initializeFabricCanvas();
        
        // 初始化状态
        this.initializeState();
        
        // 设置事件监听
        this.setupEventListeners();

        // 添加插件关闭时的缓存逻辑
        window.addEventListener('beforeunload', () => {
            localStorage.setItem('undoStack', JSON.stringify(this.undoStack));
            localStorage.setItem('redoStack', JSON.stringify(this.redoStack));
        });

        const textRecognitionHandler = new TextRecognitionHandler(this.fabricCanvas);
    }

    // 新增方法：清理无效状态
    cleanInvalidStates() {
        try {
            const undoStack = localStorage.getItem('undoStack');
            const redoStack = localStorage.getItem('redoStack');
            
            if (!undoStack || !this.isValidJsonArray(undoStack)) {
                localStorage.removeItem('undoStack');
            }
            
            if (!redoStack || !this.isValidJsonArray(redoStack)) {
                localStorage.removeItem('redoStack');
            }
        } catch (error) {
            console.warn('清理无效状态时出错:', error);
            localStorage.removeItem('undoStack');
            localStorage.removeItem('redoStack');
        }
    }

    // 新增方法：验证 JSON 数组
    isValidJsonArray(jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    }

    // 新增方法：验证状态对象
    isValidStateObject(stateStr) {
        try {
            if (typeof stateStr !== 'string') return false;
            
            const stateObj = JSON.parse(stateStr);
            return (
                stateObj &&
                typeof stateObj === 'object' &&
                typeof stateObj.version === 'string' &&
                Array.isArray(stateObj.objects) &&
                typeof stateObj.background === 'string'
            );
        } catch {
            return false;
        }
    }

    initializeState() {
        try {
            const savedUndoStack = localStorage.getItem('undoStack');
            
            if (savedUndoStack) {
                try {
                    const parsedStack = JSON.parse(savedUndoStack);
                    
                    // 验证数组格式
                    if (!Array.isArray(parsedStack)) {
                        throw new Error('Undo stack is not an array');
                    }

                    // 过滤掉无效的状态
                    const validStates = parsedStack.filter(state => this.isValidStateObject(state));

                    if (validStates.length === 0) {
                        throw new Error('No valid states found in undo stack');
                    }

                    this.undoStack = validStates;
                    this.loadLatestState();
                } catch (e) {
                    console.warn('存储的状态无效，重置为初始状态:', e);
                    this.resetToEmptyState();
                }
            } else {
                this.resetToEmptyState();
            }

            // 初始化重做栈
            const savedRedoStack = localStorage.getItem('redoStack');
            if (savedRedoStack) {
                try {
                    const parsedRedoStack = JSON.parse(savedRedoStack);
                    if (Array.isArray(parsedRedoStack)) {
                        // 过滤掉无效的状态
                        this.redoStack = parsedRedoStack.filter(state => this.isValidStateObject(state));
                    } else {
                        this.redoStack = [];
                    }
                } catch {
                    this.redoStack = [];
                }
            } else {
                this.redoStack = [];
            }

            // 确保撤销栈至少包含空状态
            if (this.undoStack.length === 0) {
                this.resetToEmptyState();
            }
        } catch (error) {
            console.error('初始化状态时出错:', error);
            this.resetToEmptyState();
        }
    }

    // 新增方法：加载最新状态
    loadLatestState() {
        if (this.undoStack.length === 0) {
            this.resetToEmptyState();
            return;
        }

        try {
            const currentState = this.undoStack[this.undoStack.length - 1];
            const stateObj = JSON.parse(currentState);
            
            this.fabricCanvas.loadFromJSON(stateObj, () => {
                this.fabricCanvas.renderAll();
            });
        } catch (error) {
            console.error('加载最新状态时出错:', error);
            this.resetToEmptyState();
        }
    }

    resetToEmptyState() {
        this.undoStack = [this.emptyState];
        this.redoStack = [];
        localStorage.setItem('undoStack', JSON.stringify(this.undoStack));
        localStorage.setItem('redoStack', JSON.stringify(this.redoStack));
        
        try {
            const emptyStateObj = JSON.parse(this.emptyState);
            this.fabricCanvas.loadFromJSON(emptyStateObj, () => {
                this.fabricCanvas.renderAll();
            });
        } catch (error) {
            console.error('重置为空状态时出错:', error);
            // 如果连空状态都无法加载，则直接清空画布
            this.fabricCanvas.clear();
            this.fabricCanvas.setBackgroundColor('#FFFFFF', this.fabricCanvas.renderAll.bind(this.fabricCanvas));
        }
    }

    initializeFabricCanvas() {
        const oldCanvas = document.getElementById('drawingBoard');
        const container = oldCanvas.parentElement;
        oldCanvas.remove();

        const canvas = document.createElement('canvas');
        canvas.id = 'drawingBoard';
        container.insertBefore(canvas, container.firstChild);

        this.fabricCanvas = new fabric.Canvas('drawingBoard', {
            width: 768,
            height: 520,
            isDrawingMode: true,
            backgroundColor: '#FFFFFF',
            selection: true
        });

        const canvasEl = this.fabricCanvas.getElement();
        canvasEl.style.width = '100%';
        canvasEl.style.height = '100%';
        
        this.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(this.fabricCanvas);
        this.fabricCanvas.freeDrawingBrush.width = 2;
        this.fabricCanvas.freeDrawingBrush.color = '#000000';

        this.fabricCanvas.selection = true;
        this.fabricCanvas.preserveObjectStacking = true;

        // 修改事件监听逻辑
        this.fabricCanvas.on('object:added', (e) => {
            // 仅在非撤销操作且非临时形状时保存状态
            if (!this.isUndoing && !this.tempShape) {
                this.saveState();
            }
        });
        
        this.fabricCanvas.on('object:modified', (e) => {
            if (!this.isUndoing) {
                this.saveState();
            }
        });

        this.fabricCanvas.on('mouse:down', (e) => this.onMouseDown(e));
        this.fabricCanvas.on('mouse:move', (e) => this.onMouseMove(e));
        this.fabricCanvas.on('mouse:up', () => this.onMouseUp());

        fabric.Object.prototype.set({
            borderColor: '#666666',         // 灰色边框
            cornerColor: '#ffffff',         // 白色控制点
            cornerSize: 6,                  // 控制点大小
            cornerStyle: 'circle',          // 圆形控制点
            transparentCorners: false,      // 不透明控制点
            cornerStrokeColor: '#666666',   // 灰色控制点边框
            padding: 0,
            borderScaleFactor: 1            // 边框粗细
        });

        this.fabricCanvas.on('selection:created', (e) => this.updateSelectionStyle(e));
        this.fabricCanvas.on('selection:updated', (e) => this.updateSelectionStyle(e));
    }

    setupEventListeners() {
        document.getElementById('pen').addEventListener('click', () => this.setMode('pen'));
        document.getElementById('eraser').addEventListener('click', () => this.setMode('eraser'));
        document.getElementById('text').addEventListener('click', () => this.setMode('text'));
        document.getElementById('select').addEventListener('click', () => this.setMode('select'));
        document.getElementById('new').addEventListener('click', () => this.clearCanvas());
        document.getElementById('save').addEventListener('click', () => this.saveImage());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('aiRenderButton').addEventListener('click', async () => {
            if (this.isSubmitting) return;
            this.isSubmitting = true;

            const progressBar = showProgressBar();
            
            try {
                const bounds = this.getContentBounds();
                
                const imageData = this.fabricCanvas.toDataURL({
                    format: 'png',
                    quality: 1,
                    left: bounds.x,
                    top: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                });

                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { 
                            type: 'uploadImage', 
                            imageData: imageData 
                        },
                        response => {
                            console.log('后台返回原始数据:', response);
                            
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                                return;
                            }
                            if (!response || !response.success) {
                                reject(new Error(response.error || '上传失败'));
                                return;
                            }
                            resolve(response.data);
                        }
                    );
                });

                console.log('处理后的响应数据:', response);

                if (!response || !response.analysisResult) {
                    throw new Error('服务器返回的数据格式不正确');
                }

                await window.mermaidRenderer.showRenderer(response.analysisResult);

            } catch (error) {
                console.error('AI rendering failed:', error);
                displayResponse(error.message || 'AI 渲染失败，请稍后重试');
            } finally {
                hideProgressBar();
                this.isSubmitting = false;
            }
        });

        this.colorPicker.addEventListener('change', (e) => {
            const color = e.target.value;
            this.fabricCanvas.freeDrawingBrush.color = color;
            if (this.fabricCanvas.getActiveObject()) {
                const activeObject = this.fabricCanvas.getActiveObject();
                if (activeObject.type === 'text') {
                    activeObject.set('fill', color);
                } else {
                    activeObject.set('stroke', color);
                }
                this.fabricCanvas.renderAll();
            }
        });

        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const dropdownItem = e.target.closest('.dropdown-item');
                const shape = dropdownItem.dataset.shape;
                const icon = dropdownItem.querySelector('.material-icons').textContent;
                this.currentShape = shape;
                this.currentShapeIcon = icon;
                this.setMode('shape');
                
                const shapeButton = document.getElementById('shape');
                shapeButton.innerHTML = `<span class="material-icons">${icon}</span>`;
            });
        });

        const textContent = document.getElementById('textContent');
        document.getElementById('confirmText').addEventListener('click', () => {
            const textInput = document.getElementById('textInput');
            const text = textContent.value.trim();
            if (text) {
                this.addText(text, parseInt(textInput.dataset.x), parseInt(textInput.dataset.y));
            }
            textInput.style.display = 'none';
            textContent.value = '';
        });

        document.getElementById('cancelText').addEventListener('click', () => {
            const textInput = document.getElementById('textInput');
            textInput.style.display = 'none';
            document.getElementById('textContent').value = '';
        });

        document.getElementById('imageUpload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file);
            }
            e.target.value = '';
        });
    }

    onMouseDown(e) {
        if (this.mode === 'shape') {
            this.isDrawing = true;
            const pointer = this.fabricCanvas.getPointer(e.e);
            this.startX = pointer.x;
            this.startY = pointer.y;
        } else if (this.mode === 'text') {
            const pointer = this.fabricCanvas.getPointer(e.e);
            const textInput = document.getElementById('textInput');
            const textContent = document.getElementById('textContent');
            
            let left = e.e.offsetX;
            let top = e.e.offsetY;
            
            if (left + 220 > this.fabricCanvas.width) {
                left = this.fabricCanvas.width - 220;
            }
            
            if (top + 160 > this.fabricCanvas.height) {
                top = this.fabricCanvas.height - 160;
            }
            
            left = Math.max(0, left);
            top = Math.max(0, top);
            
            textInput.style.display = 'block';
            textInput.style.left = `${left}px`;
            textInput.style.top = `${top}px`;
            textInput.dataset.x = pointer.x;
            textInput.dataset.y = pointer.y;
            
            textContent.value = '';
            textContent.focus();
        }
    }

    onMouseMove(e) {
        if (!this.isDrawing || this.mode !== 'shape') return;

        const pointer = this.fabricCanvas.getPointer(e.e);
        if (this.tempShape) {
            this.fabricCanvas.remove(this.tempShape);
        }

        const points = {
            x: Math.min(this.startX, pointer.x),
            y: Math.min(this.startY, pointer.y),
            width: Math.abs(pointer.x - this.startX),
            height: Math.abs(pointer.y - this.startY),
            startX: this.startX,
            startY: this.startY,
            endX: pointer.x,
            endY: pointer.y
        };

        this.tempShape = this.createShape(this.currentShape, points);
        if (this.tempShape) {
            // 添加临时形状但不触发状态保存
            this.fabricCanvas.add(this.tempShape);
            this.fabricCanvas.renderAll();
        }
    }

    onMouseUp() {
        if (this.isDrawing && this.mode === 'shape') {
            this.isDrawing = false;
            if (this.tempShape) {
                this.tempShape.setCoords();
                // 在这里手动触发状态保存
                this.saveState();
                this.tempShape = null;
            }
        }
    }

    createShape(type, points) {
        let shape;
        const options = {
            stroke: this.colorPicker.value,
            strokeWidth: 2,
            fill: 'transparent',
            selectable: false,
            evented: false,
            strokeUniform: true
        };

        switch(type) {
            case 'rect':
                shape = new fabric.Rect({
                    ...options,
                    left: points.x,
                    top: points.y,
                    width: points.width,
                    height: points.height
                });
                break;
            case 'circle':
                shape = new fabric.Ellipse({
                    ...options,
                    left: points.x,
                    top: points.y,
                    rx: points.width / 2,
                    ry: points.height / 2
                });
                break;
            case 'arrow':
                const path = [
                    'M', points.startX, points.startY,
                    'L', points.endX, points.endY,
                    'M', points.endX, points.endY
                ];
                
                const angle = Math.atan2(points.endY - points.startY, points.endX - points.startX);
                const headLength = 15;
                
                path.push(
                    'L', points.endX - headLength * Math.cos(angle - Math.PI/6),
                    points.endY - headLength * Math.sin(angle - Math.PI/6),
                    'M', points.endX, points.endY,
                    'L', points.endX - headLength * Math.cos(angle + Math.PI/6),
                    points.endY - headLength * Math.sin(angle + Math.PI/6)
                );
                
                shape = new fabric.Path(path.join(' '), {
                    ...options,
                    strokeUniform: true
                });
                break;
        }
        return shape;
    }

    undo() {
        if (this.undoStack.length <= 1) return; // 保留初始状态

        try {
            this.isUndoing = true;

            // 当前状态保存到 redoStack
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);

            // 获取上一个状态
            const previousState = this.undoStack[this.undoStack.length - 1];

            // 加载上一个状态
            this.fabricCanvas.loadFromJSON(previousState, () => {
                this.fabricCanvas.renderAll();
                this.isUndoing = false;

                // 更新 localStorage
                localStorage.setItem('undoStack', JSON.stringify(this.undoStack));
                localStorage.setItem('redoStack', JSON.stringify(this.redoStack));
            });
        } catch (error) {
            console.error('Undo error:', error);
            this.isUndoing = false;
        }
    }

    redo() {
        if (this.redoStack.length === 0) return;

        try {
            this.isUndoing = true;

            const nextState = this.redoStack.pop();
            this.undoStack.push(nextState);

            // 加载下一个状态
            this.fabricCanvas.loadFromJSON(nextState, () => {
                this.fabricCanvas.renderAll();
                this.isUndoing = false;

                // 更新 localStorage
                localStorage.setItem('undoStack', JSON.stringify(this.undoStack));
                localStorage.setItem('redoStack', JSON.stringify(this.redoStack));
            });
        } catch (error) {
            console.error('Redo error:', error);
            this.isUndoing = false;
        }
    }

    setMode(mode) {
        this.mode = mode;
        
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.style.display = 'none';
            document.getElementById('textContent').value = '';
        }
        
        this.fabricCanvas.discardActiveObject();
        this.fabricCanvas.renderAll();
        
        switch(mode) {
            case 'pen':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush.width = 2;
                this.fabricCanvas.freeDrawingBrush.color = this.colorPicker.value;
                this.fabricCanvas.selection = false;
                this.makeObjectsUnselectable(false);
                this.fabricCanvas.defaultCursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\'%3E%3Cpath d=\'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z\'/%3E%3C/svg%3E") 0 24, auto';
                break;
            case 'select':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = true;
                this.makeObjectsSelectable(true);
                this.fabricCanvas.defaultCursor = 'default';
                break;
            case 'eraser':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush.width = 20;
                this.fabricCanvas.freeDrawingBrush.color = '#FFFFFF';
                this.fabricCanvas.selection = false;
                this.makeObjectsUnselectable(false);
                this.fabricCanvas.defaultCursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\'%3E%3Cpath d=\'M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l11.19-11.19c.79-.78 2.05-.78 2.84 0l-.6.59z\'/%3E%3C/svg%3E") 0 24, auto';
                break;
            case 'shape':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.makeObjectsUnselectable(false);
                this.fabricCanvas.defaultCursor = 'crosshair';
                break;
            case 'text':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.makeObjectsUnselectable(false);
                this.fabricCanvas.defaultCursor = 'text';
                break;
        }

        const buttons = ['pen', 'eraser', 'text', 'select'];
        buttons.forEach(btn => {
            const element = document.getElementById(btn);
            if (element) {
                element.classList.toggle('active', btn === mode);
            }
        });

        const shapeButton = document.getElementById('shape');
        if (mode === 'shape') {
            shapeButton.classList.add('active');
        } else {
            shapeButton.classList.remove('active');
            shapeButton.innerHTML = '<span class="material-icons">category</span>';
        }
    }

    makeObjectsSelectable() {
        this.fabricCanvas.getObjects().forEach(obj => {
            obj.selectable = true;
            obj.evented = true;
        });
    }

    makeObjectsUnselectable() {
        this.fabricCanvas.getObjects().forEach(obj => {
            obj.selectable = false;
            obj.evented = false;
        });
    }

    saveState() {
        if (this.isUndoing) return;

        try {
            const currentState = this.fabricCanvas.toJSON(['selectable', 'evented']);
            
            // 确保状态包含必要的字段
            if (!currentState.version) {
                currentState.version = fabric.version || "5.3.1";
            }
            
            const currentStateStr = JSON.stringify(currentState);

            // 验证新状态
            if (!this.isValidStateObject(currentStateStr)) {
                console.warn('生成的状态无效，忽略此操作');
                return;
            }

            // 检查是否与最后一个状态相同
            const lastState = this.undoStack[this.undoStack.length - 1];
            if (lastState === currentStateStr) {
                return;
            }

            // 保存新状态
            this.undoStack.push(currentStateStr);
            this.redoStack = [];

            // 限制撤销栈大小
            if (this.undoStack.length > 50) {
                this.undoStack.shift();
            }

            // 更新 localStorage
            localStorage.setItem('undoStack', JSON.stringify(this.undoStack));
            localStorage.setItem('redoStack', JSON.stringify(this.redoStack));
        } catch (error) {
            console.error('保存状态时出错:', error);
        }
    }

    loadState() {
        try {
            const savedUndoStack = localStorage.getItem('undoStack');
            const savedRedoStack = localStorage.getItem('redoStack');

            // 验证并加载撤销栈
            if (savedUndoStack) {
                const parsedUndoStack = JSON.parse(savedUndoStack);
                if (Array.isArray(parsedUndoStack) && parsedUndoStack.length > 0) {
                    this.undoStack = parsedUndoStack;
                } else {
                    this.resetToEmptyState();
                    return;
                }
            } else {
                this.resetToEmptyState();
                return;
            }

            // 验证并加载重做栈
            if (savedRedoStack) {
                const parsedRedoStack = JSON.parse(savedRedoStack);
                this.redoStack = Array.isArray(parsedRedoStack) ? parsedRedoStack : [];
            } else {
                this.redoStack = [];
            }

            // 加载当前状态
            const currentState = this.undoStack[this.undoStack.length - 1];
            
            if (!currentState || currentState === 'undefined') {
                console.warn('当前状态无效，使用空状态初始化');
                this.resetToEmptyState();
                return;
            }

            try {
                const stateObj = JSON.parse(currentState);
                this.fabricCanvas.loadFromJSON(stateObj, () => {
                    this.fabricCanvas.renderAll();
                });
            } catch (parseError) {
                console.error('解析当前状态时出错:', parseError);
                this.resetToEmptyState();
            }
        } catch (error) {
            console.error('加载状态时出错:', error);
            this.resetToEmptyState();
        }
    }

    clearCanvas(resetStack = true) {
        this.fabricCanvas.clear();
        this.fabricCanvas.setBackgroundColor('#FFFFFF', this.fabricCanvas.renderAll.bind(this.fabricCanvas));
        
        if (resetStack) {
            this.undoStack = [this.emptyState];
            this.redoStack = [];
            this.isFirstDraw = true;
            
            localStorage.setItem('undoStack', JSON.stringify(this.undoStack));
            localStorage.setItem('redoStack', JSON.stringify(this.redoStack));
        }
    }

    addShape(type, points) {
        let shape;
        
        switch(type) {
            case 'rect':
                shape = new fabric.Rect({
                    left: points.x,
                    top: points.y,
                    width: Math.abs(points.width),
                    height: Math.abs(points.height),
                    fill: 'transparent',
                    stroke: this.colorPicker.value,
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    strokeUniform: true
                });
                break;
            case 'circle':
                shape = new fabric.Ellipse({
                    left: points.x,
                    top: points.y,
                    rx: Math.abs(points.width) / 2,
                    ry: Math.abs(points.height) / 2,
                    fill: 'transparent',
                    stroke: this.colorPicker.value,
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    strokeUniform: true
                });
                break;
            case 'arrow':
                const path = this.createArrowPath([
                    points.startX, points.startY,
                    points.endX, points.endY
                ]);
                shape = new fabric.Path(path, {
                    fill: 'transparent',
                    stroke: this.colorPicker.value,
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    strokeUniform: true
                });
                break;
        }

        if (shape) {
            this.fabricCanvas.add(shape);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    addText(text, x, y) {
        const fabricText = new fabric.Textbox(text, {
            left: x,
            top: y,
            fontSize: 16,
            fill: this.colorPicker.value,
            width: 200,
            breakWords: true,
            selectable: false,
            evented: false
        });
        
        this.fabricCanvas.add(fabricText);
        this.fabricCanvas.renderAll();
        this.saveState();
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                const maxWidth = this.fabricCanvas.width * 0.8;
                const maxHeight = this.fabricCanvas.height * 0.8;
                
                if (img.width > maxWidth || img.height > maxHeight) {
                    const scale = Math.min(
                        maxWidth / img.width,
                        maxHeight / img.height
                    );
                    img.scale(scale);
                }
                
                img.set({
                    originX: 'center', // 设置水平中心点
                    originY: 'center', // 设置垂直中心点
                    left: this.fabricCanvas.width / 2, // 设置水平位置为画布中心
                    top: this.fabricCanvas.height / 2, // 设置垂直位置为画布中心
                });
                
                this.fabricCanvas.add(img);
                this.fabricCanvas.renderAll();
                this.saveState();
            });
        };
        reader.readAsDataURL(file);
    }

    saveImage() {
        const tempCanvas = document.createElement('canvas');
        const scale = 2;
        tempCanvas.width = this.fabricCanvas.width * scale;
        tempCanvas.height = this.fabricCanvas.height * scale;
        
        const tempFabricCanvas = new fabric.Canvas(tempCanvas);
        tempFabricCanvas.setWidth(this.fabricCanvas.width * scale);
        tempFabricCanvas.setHeight(this.fabricCanvas.height * scale);
        
        this.fabricCanvas.getObjects().forEach(obj => {
            const clonedObj = fabric.util.object.clone(obj);
            clonedObj.scaleX = obj.scaleX * scale;
            clonedObj.scaleY = obj.scaleY * scale;
            clonedObj.left = obj.left * scale;
            clonedObj.top = obj.top * scale;
            if (obj.type === 'text' || obj.type === 'textbox') {
                clonedObj.fontSize = obj.fontSize * scale;
            }
            tempFabricCanvas.add(clonedObj);
        });
        
        tempFabricCanvas.setBackgroundColor('#FFFFFF', tempFabricCanvas.renderAll.bind(tempFabricCanvas));
        
        const dataURL = tempFabricCanvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1
        });
        
        tempFabricCanvas.dispose();
        
        const link = document.createElement('a');
        link.download = `drawing-${new Date().toISOString().slice(0,10)}.png`;
        link.href = dataURL;
        link.click();
    }

    updateSelectionStyle(e) {
        const activeObject = e.selected[0];
        if (activeObject) {
            activeObject.set({
                borderColor: '#666666',
                cornerColor: '#ffffff',
                cornerSize: 6,
                cornerStyle: 'circle',
                transparentCorners: false,
                cornerStrokeColor: '#666666',
                padding: 0,
                hasRotatingPoint: false,
                hasControls: true,
                hasBorders: true,
                borderScaleFactor: 1
            });

            activeObject.setControlsVisibility({
                mt: true,
                mb: true,
                ml: true,
                mr: true,
                bl: true,
                br: true,
                tl: true,
                tr: true,
                mtr: true
            });

            this.fabricCanvas.renderAll();
        }
    }

    getContentBounds() {
        const objects = this.fabricCanvas.getObjects();
        if (objects.length === 0) {
            return {
                x: 0,
                y: 0,
                width: this.fabricCanvas.width,
                height: this.fabricCanvas.height
            };
        }

        let minX = this.fabricCanvas.width;
        let minY = this.fabricCanvas.height;
        let maxX = 0;
        let maxY = 0;

        objects.forEach(obj => {
            const bound = obj.getBoundingRect();
            minX = Math.min(minX, bound.left);
            minY = Math.min(minY, bound.top);
            maxX = Math.max(maxX, bound.left + bound.width);
            maxY = Math.max(maxY, bound.top + bound.height);
        });

        const padding = 20;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(this.fabricCanvas.width, maxX + padding);
        maxY = Math.min(this.fabricCanvas.height, maxY + padding);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.drawingBoard = new DrawingBoard();
}); 