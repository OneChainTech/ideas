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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'uploadImage') {
        // 将 base64 转换为 blob
        fetch(request.imageData)
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
                sendResponse({ success: true, data: result });
            })
            .catch(error => {
                console.error('Upload Error:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || '上传失败'
                });
            });
        
        return true; // 保持消息通道开放
    }
}); 