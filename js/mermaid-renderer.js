class MermaidRenderer {
    constructor() {
        this.canvasContainer = document.querySelector('.canvas-container');
        this.drawingBoard = document.getElementById('drawingBoard');
    }

    createRenderContainer() {
        const container = document.createElement('div');
        container.className = 'mermaid-canvas-container';
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
        content.className = 'mermaid-content';
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

        const contentInner = document.createElement('div');
        contentInner.style.cssText = `
            background: #ffffff;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // 创建按钮容器，放在右下角
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
        downloadButton.title = '下载图片';
        downloadButton.onclick = () => this.downloadSvg();

        // 创建关闭按钮
        const closeButton = this.createIconButton('close');
        closeButton.title = '关闭';
        closeButton.onclick = () => this.hideRenderer();

        buttonContainer.appendChild(downloadButton);
        buttonContainer.appendChild(closeButton);
        content.appendChild(contentInner);
        content.appendChild(buttonContainer);

        return { content, contentInner };
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

    async showRenderer(mermaidCode) {
        try {
            this.hideRenderer();

            const container = this.createRenderContainer();
            const { content, contentInner } = this.createContent();

            container.appendChild(content);
            this.canvasContainer.appendChild(container);

            let code = mermaidCode;
            if (code.includes('```mermaid')) {
                code = code.replace(/```mermaid\n([\s\S]*?)```/, '$1');
            }
            code = code.trim();
            if (!code.startsWith('graph') && !code.startsWith('flowchart')) {
                code = 'flowchart TD\n' + code;
            }

            const { svg } = await mermaid.render('mermaid-' + Date.now(), code);
            contentInner.innerHTML = svg;

            const svgElement = contentInner.querySelector('svg');
            if (svgElement) {
                svgElement.style.cssText = `
                    max-width: 90%;
                    max-height: 90%;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                `;
            }

        } catch (error) {
            console.error('Mermaid rendering error:', error);
            this.showError('渲染失败: ' + error.message);
        }
    }

    // 添加下载 SVG 功能
    downloadSvg() {
        const svgElement = document.querySelector('.mermaid-content svg');
        if (svgElement) {
            // 创建一个新的 svg 字符串，包含原始尺寸
            const svgData = svgElement.outerHTML;
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'flowchart.svg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            color: #dc3545;
            padding: 16px;
            text-align: center;
            background: #fff;
            border-radius: 4px;
            border: 1px solid #f8d7da;
            margin: 16px;
            font-size: 14px;
        `;
        errorDiv.textContent = message;
        this.content.innerHTML = '';
        this.content.appendChild(errorDiv);
    }

    hideRenderer() {
        const existingContainer = document.querySelector('.mermaid-canvas-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }
}

window.mermaidRenderer = new MermaidRenderer(); 