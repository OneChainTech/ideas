class ProductIntro {
    constructor() {
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

        // 菜单功能介绍内容
        content.innerHTML = `
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
                    AI 渲染：将手绘图形转换为标准流程图
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