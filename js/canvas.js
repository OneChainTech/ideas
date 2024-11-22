// 在 DrawingBoard 类之前添加这些辅助函数

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

async function renderMermaidDiagram(mermaidCode) {
    // 创建一个新的 div 元素来渲染 mermaid 图表
    const element = document.createElement('div');
    element.className = 'mermaid';
    element.innerHTML = mermaidCode;

    // 将新元素添加到画布容器中
    document.querySelector('.canvas-container').appendChild(element);

    // 渲染 mermaid 图表
    await mermaid.init();
    mermaid.render('mermaidDiagram', mermaidCode, (svgCode) => {
        element.innerHTML = svgCode;
    });
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
        
        this.initializeFabricCanvas();
        this.setupEventListeners();
        this.loadState();
        
        // 添加初始空白状态
        this.emptyState = JSON.stringify({
            version: "5.3.1",
            objects: [],
            background: "#FFFFFF"
        });
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

        this.fabricCanvas.on('object:added', () => {
            this.saveState();
        });

        this.fabricCanvas.on('object:modified', () => {
            this.saveState();
        });

        this.fabricCanvas.on('mouse:down', (e) => this.onMouseDown(e));
        this.fabricCanvas.on('mouse:move', (e) => this.onMouseMove(e));
        this.fabricCanvas.on('mouse:up', () => this.onMouseUp());

        // 设置选中对象的控制点默认样式
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

        // 自定义选中时的样式
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
                // 获取画布内容的边界
                const bounds = this.getContentBounds();
                
                // 创建临时画布来存储裁剪的内容
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = bounds.width;
                tempCanvas.height = bounds.height;
                const tempCtx = tempCanvas.getContext('2d');

                // 复制内容区域
                const imageData = this.fabricCanvas.toDataURL({
                    format: 'png',
                    quality: 1,
                    left: bounds.x,
                    top: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                });

                // 创建 FormData 并上传
                const formData = new FormData();
                const blob = await (await fetch(imageData)).blob();
                formData.append('file', blob, 'drawing.png');

                // 调用 API
                const response = await fetch('https://ideasai.onrender.com/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                // 从返回的文本中提取 mermaid 代码
                const mermaidMatch = result.analysisResult.match(/```mermaid\n([\s\S]*?)```/);
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
        // 移除文本输入的回车键监听
        /*
        textContent.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('confirmText').click();
            }
        });
        */

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
            
            // 计算文本输入框位置，确保不会超出画布边界
            let left = e.e.offsetX;
            let top = e.e.offsetY;
            
            // 如太靠右边，向左偏移
            if (left + 220 > this.fabricCanvas.width) {  // 增加一些边距
                left = this.fabricCanvas.width - 220;
            }
            
            // 如果太靠下边，向上偏移
            if (top + 160 > this.fabricCanvas.height) {  // 增加一些边距
                top = this.fabricCanvas.height - 160;
            }
            
            // 确保位置不会为负值
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
            this.fabricCanvas.add(this.tempShape);
            this.fabricCanvas.renderAll();
        }
    }

    onMouseUp() {
        if (this.isDrawing && this.mode === 'shape') {
            this.isDrawing = false;
            if (this.tempShape) {
                this.tempShape.setCoords();
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
            evented: false
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
                
                shape = new fabric.Path(path.join(' '), options);
                break;
        }
        return shape;
    }

    undo() {
        if (this.undoStack.length > 1) {  // 确保有多于一个状态
            try {
                // 将当前状态移到重做栈
                const currentState = this.undoStack.pop();
                if (currentState) {
                    this.redoStack.push(currentState);
                }

                // 获取上一个状态
                const previousState = this.undoStack[this.undoStack.length - 1];
                if (!previousState) {
                    console.error('No previous state found');
                    return;
                }

                // 解析并加载状态
                const stateObj = JSON.parse(previousState);
                this.fabricCanvas.loadFromJSON(stateObj, () => {
                    this.fabricCanvas.renderAll();
                    localStorage.setItem('drawingBoardState', previousState);
                });
            } catch (error) {
                console.error('Error during undo:', error);
                // 出错时恢复状态
                if (this.redoStack.length > 0) {
                    const state = this.redoStack.pop();
                    if (state) {
                        this.undoStack.push(state);
                    }
                }
            }
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const nextState = this.redoStack.pop();
            this.undoStack.push(nextState);

            try {
                const stateObj = JSON.parse(nextState);
                this.fabricCanvas.loadFromJSON(stateObj, () => {
                    this.fabricCanvas.renderAll();
                    localStorage.setItem('drawingBoardState', nextState);
                });
            } catch (error) {
                console.error('Error during redo:', error);
                this.undoStack.pop();
                this.redoStack.push(nextState);
            }
        }
    }

    setMode(mode) {
        this.mode = mode;
        
        // 隐藏文本输入框
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.style.display = 'none';
            document.getElementById('textContent').value = '';
        }
        
        // 先清除所有选中的对象
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

        // 更新工具栏按钮状态
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

    // 添加新方法：使所有对象可选择
    makeObjectsSelectable() {
        this.fabricCanvas.getObjects().forEach(obj => {
            obj.selectable = true;
            obj.evented = true;
        });
    }

    // 添加新方法：使所有对象不可选择
    makeObjectsUnselectable() {
        this.fabricCanvas.getObjects().forEach(obj => {
            obj.selectable = false;
            obj.evented = false;
        });
    }

    saveState() {
        try {
            // 获取当前画布状态
            const currentState = this.fabricCanvas.toJSON(['selectable', 'evented']);
            const currentStateStr = JSON.stringify(currentState);

            // 如果是第一次操作，确保有初始空白状态
            if (this.undoStack.length === 0) {
                const emptyState = {
                    version: "5.3.1",
                    objects: [],
                    background: "#FFFFFF"
                };
                this.undoStack.push(JSON.stringify(emptyState));
            }

            // 检查新状态是否与当前状态相同
            const lastState = this.undoStack[this.undoStack.length - 1];
            if (lastState === currentStateStr) {
                return;
            }

            // 添加新状态
            this.undoStack.push(currentStateStr);
            this.redoStack = [];  // 清空重做栈

            // 限制撤销栈大小
            if (this.undoStack.length > 50) {
                this.undoStack.shift();
            }

            // 保存到 localStorage
            localStorage.setItem('drawingBoardState', currentStateStr);
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    loadState() {
        try {
            const savedState = localStorage.getItem('drawingBoardState');
            if (savedState && savedState !== 'undefined') {
                const stateObj = JSON.parse(savedState);
                
                this.fabricCanvas.loadFromJSON(stateObj, () => {
                    this.fabricCanvas.renderAll();
                    
                    // 初始化状态栈，确保包含初始空白状态
                    this.undoStack = [this.emptyState];
                    if (savedState !== this.emptyState) {
                        this.undoStack.push(savedState);
                    }
                    this.redoStack = [];
                });
            } else {
                this.clearCanvas();
            }
        } catch (error) {
            console.error('Error loading state:', error);
            this.clearCanvas();
        }
    }

    clearCanvas(resetStack = true) {
        this.fabricCanvas.clear();
        this.fabricCanvas.setBackgroundColor('#FFFFFF', this.fabricCanvas.renderAll.bind(this.fabricCanvas));
        
        if (resetStack) {
            this.undoStack = [this.emptyState];
            this.redoStack = [];
            this.isFirstDraw = true;
            localStorage.setItem('drawingBoardState', this.emptyState);
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
                    evented: false
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
                    evented: false
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
                    evented: false
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
        // 处理多行文本
        const fabricText = new fabric.Textbox(text, {
            left: x,
            top: y,
            fontSize: 16,
            fill: this.colorPicker.value,
            width: 200,  // 设置文本框宽度
            breakWords: true,  // 允许单词换行
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
                
                img.center();
                
                this.fabricCanvas.add(img);
                this.fabricCanvas.renderAll();
                this.saveState();
            });
        };
        reader.readAsDataURL(file);
    }

    saveImage() {
        // 创建一个临时画布，尺寸是原画布的2倍
        const tempCanvas = document.createElement('canvas');
        const scale = 2;  // 缩放比例
        tempCanvas.width = this.fabricCanvas.width * scale;
        tempCanvas.height = this.fabricCanvas.height * scale;
        
        // 创建临时的 fabric canvas
        const tempFabricCanvas = new fabric.Canvas(tempCanvas);
        tempFabricCanvas.setWidth(this.fabricCanvas.width * scale);
        tempFabricCanvas.setHeight(this.fabricCanvas.height * scale);
        
        // 复制原画布的内容并缩放
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
        
        // 设置背景色
        tempFabricCanvas.setBackgroundColor('#FFFFFF', tempFabricCanvas.renderAll.bind(tempFabricCanvas));
        
        // 导出高分辨率图片
        const dataURL = tempFabricCanvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1
        });
        
        // 清理时画布
        tempFabricCanvas.dispose();
        
        // 下载图片
        const link = document.createElement('a');
        link.download = `drawing-${new Date().toISOString().slice(0,10)}.png`;
        link.href = dataURL;
        link.click();
    }

    // 添加新方法：更新选中对象的样式
    updateSelectionStyle(e) {
        const activeObject = e.selected[0];
        if (activeObject) {
            // 设置选中对象的特定样式
            activeObject.set({
                borderColor: '#666666',         // 改为灰色边框
                cornerColor: '#ffffff',         // 白色控制点
                cornerSize: 6,                  // 控制点大小
                cornerStyle: 'circle',          // 圆形控制点
                transparentCorners: false,      // 不透明控制点
                cornerStrokeColor: '#666666',   // 灰色控制点边框
                padding: 0,
                hasRotatingPoint: false,        // 隐藏旋转控制点
                hasControls: true,
                hasBorders: true,
                borderScaleFactor: 1            // 边框粗细
            });

            // 设置只显示角落的控制点
            activeObject.setControlsVisibility({
                mt: false,     // 中上
                mb: false,     // 中下
                ml: false,     // 中左
                mr: false      // 中右
            });

            this.fabricCanvas.renderAll();
        }
    }

    // 添加 getContentBounds 方法
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

        // 获取所有对象的边界
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

        // 添加边距
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