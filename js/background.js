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
        console.log('后台接收到上传请求');
        
        handleImageUpload(message.imageData)
            .then(response => {
                // console.log('API 返回数据:', response);
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('Background Error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

async function handleImageUpload(imageData) {
    try {
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // 新增：压缩图片
        const compressedBlob = await compressImage(blob);
        
        const formData = new FormData();
        formData.append('file', compressedBlob, 'drawing_compressed.png');

        console.log('准备发送到服务器...');
        
        const apiResponse = await fetch('https://ideasai.onrender.com/upload', {
            method: 'POST',
            body: formData
        });

        if (!apiResponse.ok) {
            throw new Error(`HTTP error! status: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        // console.log('服务器返回数据:', result);
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw new Error('图片处理失败: ' + error.message);
    }
} 

// 新增：压缩图片的函数
async function compressImage(blob) {
    try {
        const imageBitmap = await createImageBitmap(blob);
        const MAX_WIDTH = 800; // 设定最大宽度
        const scaleSize = Math.min(MAX_WIDTH / imageBitmap.width, 1); // 确保不放大图片
        const canvas = new OffscreenCanvas(Math.round(imageBitmap.width * scaleSize), Math.round(imageBitmap.height * scaleSize));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
        
        // 提高压缩质量以平衡速度和图片质量
        const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
        return compressedBlob;
    } catch (error) {
        console.error('压缩图片失败:', error);
        throw new Error('压缩图片失败: ' + error.message);
    }
} 