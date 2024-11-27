class ProductIntro {
    constructor() {
        this.steps = [
            {
                element: '#pen',
                title: '画笔工具',
                content: '使用画笔工具在画布上自由绘画。'
            },
            {
                element: '#eraser',
                title: '橡皮擦工具',
                content: '使用橡皮擦清除画布上的内容。'
            },
            {
                element: '#text',
                title: '文本工具',
                content: '点击画布添加文本内容。'
            },
            {
                element: '#select',
                title: '选择工具',
                content: '选择并移动画布上的元素。'
            },
            {
                element: 'label[for="imageUpload"]',
                title: '上传图片',
                content: '从本地上传图片到画布。'
            },
            {
                element: '#shape',
                title: '形状工具',
                content: '在画布上添加各种形状，包括方形、圆形和箭头。'
            },
            {
                element: '#undo',
                title: '撤销',
                content: '撤销上一步操作。'
            },
            {
                element: '#aiRenderButton',
                title: '图片渲染',
                content: '将手绘流程图渲染成规范的流程图，让您的图表更加专业。'
            },
            {
                element: '#textRecognition',
                title: '文本识别',
                content: '识别画布中的手写文字，自动转换为可编辑的文本内容。'
            },
            {
                element: '.color-picker-wrapper',
                title: '颜色选择器',
                content: '选择画笔和形状的颜色。'
            },
            {
                element: '#new',
                title: '新建画布',
                content: '清空当前画布，开始新的创作。'
            },
            {
                element: '#save',
                title: '保存',
                content: '将画布内容保存为图片。'
            }
        ];
        
        this.currentStep = 0;
        this.tooltip = null;
        
        this.setupEventListeners();
    }

    createIntroContainer() {
        const container = document.createElement('div');
        container.className = 'intro-container';
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
        return container;
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'intro-content';
        content.style.cssText = `
            flex: 1;
            padding: 20px 24px;
            background: #ffffff;
            position: relative;
            font-size: 14px;
            line-height: 2;
            color: #333;
        `;

        // 更新产品说明内容，包括图片渲染和文本识别
        content.innerHTML = `
            <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">小黑板</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">一个简单易用的绘图工具，支持手绘、图形绘制、图片渲染和文本识别功能。</p>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">edit</span>
                    画笔工具：自由绘制线条，支持手写和鼠标绘制
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">auto_fix_normal</span>
                    橡皮擦：精确擦除画布内容，可调整大小
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">text_fields</span>
                    文本工具：在画布上添加文字说明
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">near_me</span>
                    选择工具：选择和移动画布中的元素
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">image</span>
                    图片上传：导入本地图片到画布
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">category</span>
                    形状工具：插入方形、圆形、箭头等基础图形
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">undo</span>
                    撤销操作：返回上一步操作状态
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">auto_awesome</span>
                    图片渲染：将手绘图形转换为标准流程图
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">document_scanner</span>
                    文本识别：识别画布中的手写文字，转换为可编辑文本
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">palette</span>
                    颜色选择：自定义绘图和文字颜色
                </div>
                <div style="margin-bottom: 10px; color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">description</span>
                    新建画布：清空当前画布内容
                </div>
                <div style="color: #555;">
                    <span class="material-icons" style="font-size: 19px; vertical-align: middle; margin-right: 10px; color: #666;">save</span>
                    保存画布：将当前画布保存为图片
                </div>
            </div>
        `;

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

        // 创建关闭按钮
        const closeButton = this.createIconButton('close');
        closeButton.title = '关闭';
        closeButton.onclick = () => this.hideIntro();

        buttonContainer.appendChild(closeButton);
        content.appendChild(buttonContainer);

        return content;
    }

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

    showIntro() {
        this.hideIntro();

        const container = this.createIntroContainer();
        const content = this.createContent();

        container.appendChild(content);
        document.querySelector('.canvas-container').appendChild(container);
    }

    hideIntro() {
        const existingContainer = document.querySelector('.intro-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }

    setupEventListeners() {
        document.getElementById('help').addEventListener('click', () => {
            this.showIntro();
        });
    }
}

window.productIntro = new ProductIntro(); 