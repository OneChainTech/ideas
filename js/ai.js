class AIHelper {
    constructor() {
        this.apiKey = '您的OpenAI API密钥'; // 替换为您的实际API密钥
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('generateText').addEventListener('click', this.generateText.bind(this));
        document.getElementById('generateImage').addEventListener('click', this.generateImage.bind(this));
    }

    async generateText() {
        const prompt = document.getElementById('prompt').value;
        try {
            const response = await fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    prompt: prompt,
                    max_tokens: 150
                })
            });
            const data = await response.json();
            // 处理返回的文本
        } catch (error) {
            console.error('生成文本失败:', error);
        }
    }

    async generateImage() {
        const prompt = document.getElementById('prompt').value;
        try {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const data = await response.json();
            // 处理返回的图片URL
        } catch (error) {
            console.error('生成图片失败:', error);
        }
    }
}

// 初始化AI助手
document.addEventListener('DOMContentLoaded', () => {
    const aiHelper = new AIHelper();
}); 