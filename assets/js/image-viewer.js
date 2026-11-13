(() => {
    const links = document.querySelectorAll('[data-image-preview]');
    if (!links.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'image-viewer';
    dialog.setAttribute('aria-labelledby', 'image-viewer-caption');
    dialog.innerHTML = `<div class="image-viewer-bar"><p id="image-viewer-caption"></p><button type="button" class="image-viewer-close" aria-label="Закрыть изображение">×</button></div><img class="image-viewer-image" alt="">`;
    document.body.append(dialog);
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('p');
    let trigger;
    links.forEach(link => link.addEventListener('click', event => {
        event.preventDefault();
        trigger = link;
        const original = link.closest('figure').querySelector('img');
        image.src = link.href;
        image.alt = original.alt;
        caption.textContent = original.alt;
        dialog.showModal();
        document.documentElement.classList.add('image-viewer-open');
    }));
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('image-viewer-open');
        trigger?.focus({ preventScroll: true });
    });
})();
