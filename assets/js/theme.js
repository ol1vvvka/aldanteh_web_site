(() => {
    let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
        const saved = localStorage.getItem('aldanteh-theme');
        if (saved === 'light' || saved === 'dark') theme = saved;
    } catch {}
    document.documentElement.dataset.theme = theme;
})();
