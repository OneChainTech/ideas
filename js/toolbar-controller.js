document.addEventListener('DOMContentLoaded', function() {
    const toolbar = document.querySelector('.toolbar');
    const toggleButton = document.getElementById('toggleToolbar');
    
    // 初始化工具栏状态
    let isToolbarVisible = true;
    let isMouseOverToolbar = false;
    let isMouseOverToggleButton = false;
    
    // 切换工具栏显示/隐藏
    function toggleToolbar() {
        isToolbarVisible = !isToolbarVisible;
        toolbar.classList.toggle('toolbar-hidden', !isToolbarVisible);
        
        // 保存状态到本地存储
        localStorage.setItem('toolbarVisible', isToolbarVisible);
    }
    
    // 绑定点击事件
    toggleButton.addEventListener('click', toggleToolbar);
    
    // 从本地存储恢复工具栏状态
    const savedState = localStorage.getItem('toolbarVisible');
    if (savedState !== null) {
        isToolbarVisible = savedState === 'true';
        toolbar.classList.toggle('toolbar-hidden', !isToolbarVisible);
    }
    
    // 工具栏鼠标事件
    toolbar.addEventListener('mouseenter', () => {
        isMouseOverToolbar = true;
        clearTimeout(timeoutId);
    });
    
    toolbar.addEventListener('mouseleave', () => {
        isMouseOverToolbar = false;
        if (!isMouseOverToggleButton) {
            startHideTimer();
        }
    });
    
    // 切换按钮鼠标事件
    toggleButton.addEventListener('mouseenter', () => {
        isMouseOverToggleButton = true;
        clearTimeout(timeoutId);
        if (!isToolbarVisible) {
            toolbar.classList.remove('toolbar-hidden');
        }
    });
    
    toggleButton.addEventListener('mouseleave', () => {
        isMouseOverToggleButton = false;
        if (!isMouseOverToolbar) {
            startHideTimer();
        }
    });
    
    let timeoutId;
    function startHideTimer() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (!isMouseOverToolbar && !isMouseOverToggleButton) {
                toolbar.classList.add('toolbar-hidden');
                isToolbarVisible = false;
            }
        }, 1000);
    }
    
    // 移除之前的 mousemove 事件监听器
    // 现在只通过点击按钮或悬停在按钮/工具栏上来控制显示/隐藏
}); 