// mermaid 初始化配置
window.addEventListener('load', () => {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis'
        }
    });
}); 