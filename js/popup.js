function saveImage() {
    const canvas = document.getElementById('yourCanvasId'); // 替换为您的画布ID
    const context = canvas.getContext('2d');

    // 设置白色背景
    context.fillStyle = '#FFFFFF'; // 白色
    context.fillRect(0, 0, canvas.width, canvas.height); // 填充背景

    // 在这里绘制其他内容
    // 例如，绘制图形
    // context.drawImage(...); // 示例绘制代码

    // 保存图像
    const imageData = canvas.toDataURL('image/png'); // 确保使用PNG格式
    const link = document.createElement('a');
    link.href = imageData;
    link.download = 'image.png'; // 设置下载文件名
    link.click();
} 