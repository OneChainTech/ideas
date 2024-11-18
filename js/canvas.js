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
        this.initializeCanvas();
        this.setupEventListeners();
        this.loadState();
        this.lastDrawTime = 0;
        this.drawRequestId = null;
        this.lastState = null;
        this.currentShape = null;
        this.backgroundImage = null;
    }

    initializeCanvas() {
        this.canvas.width = 768;
        this.canvas.height = 520;
        this.tempCanvas.width = 768;
        this.tempCanvas.height = 520;
        
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        
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
        colorPicker.addEventListener('change', (e) => {
            this.ctx.strokeStyle = e.target.value;
            this.ctx.fillStyle = e.target.value;
            colorPreview.style.backgroundColor = e.target.value;
        });

        document.getElementById('imageUpload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        document.getElementById('textContent').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {  // 允许Shift+Enter换行
                e.preventDefault();  // 阻止默认的换行行为
                this.addText();     // 提交文本
            }
            if (e.key === 'Escape') {  // 添加ESC键关闭功能
                const textInput = document.getElementById('textInput');
                textInput.style.display = 'none';
                document.getElementById('textContent').value = '';
            }
        });
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
}

document.addEventListener('DOMContentLoaded', () => {
    const drawingBoard = new DrawingBoard();
}); 