// 使用 self 代替 chrome 以适应 service worker 环境
self.onmessage = (event) => {
    if (event.data.type === 'uploadImage') {
        // 将 base64 转换为 blob
        fetch(event.data.imageData)
            .then(res => res.blob())
            .then(blob => {
                // 创建 FormData
                const formData = new FormData();
                formData.append('file', blob, 'canvas.png');
                
                // 发送请求到服务器
                return fetch('https://ideasai.onrender.com/upload', {
                    method: 'POST',
                    body: formData
                });
            })
            .then(response => response.json())
            .then(result => {
                self.postMessage({ success: true, data: result });
            })
            .catch(error => {
                console.error('Upload Error:', error);
                self.postMessage({ 
                    success: false, 
                    error: error.message || '上传失败'
                });
            });
    }
};

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'uploadImage') {
        handleImageUpload(message.imageData)
            .then(response => {
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('Background Error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    }
});

async function handleImageUpload(imageData) {
    try {
        // 将 blob URL 转换为 blob 数据
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // 创建 FormData
        const formData = new FormData();
        formData.append('file', blob, 'drawing.png');

        // 发送请求到正确的服务器端点
        const apiResponse = await fetch('https://ideasai.onrender.com/upload', {
            method: 'POST',
            body: formData
        });

        if (!apiResponse.ok) {
            throw new Error(`HTTP error! status: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        
        return {
            success: true,
            analysisResult: result.analysisResult || '分析结果为空'  // 假设返回的字段是 result
        };
    } catch (error) {
        console.error('API Error:', error);
        throw new Error('图片处理失败: ' + error.message);
    }
} 