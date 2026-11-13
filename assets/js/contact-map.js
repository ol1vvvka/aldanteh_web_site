(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(pointer: fine)');

    document.querySelectorAll('.contact-section').forEach(section => {
        const backdrop = section.querySelector('.contact-map');
        if (!backdrop) return;
        const position = { x: .26, y: .72 };
        const target = { ...position };
        let restY = .72;
        let width = 0;
        let height = 0;
        let frame = 0;
        let previousTime = 0;

        function draw() {
            backdrop.style.setProperty('--map-shift-x', `${(position.x - .26) * width}px`);
            backdrop.style.setProperty('--map-shift-y', `${(position.y - restY) * height}px`);
        }

        function tick(now) {
            const delta = Math.min((now - previousTime) / 1000, .05);
            previousTime = now;
            const blend = 1 - Math.exp(-delta / .18);
            position.x += (target.x - position.x) * blend;
            position.y += (target.y - position.y) * blend;
            draw();
            if (Math.hypot(target.x - position.x, target.y - position.y) > .0001) {
                frame = requestAnimationFrame(tick);
            } else {
                frame = 0;
            }
        }

        function schedule() {
            if (frame || reducedMotion.matches || document.hidden) return;
            previousTime = performance.now();
            frame = requestAnimationFrame(tick);
        }

        function freeze() {
            cancelAnimationFrame(frame);
            frame = 0;
            target.x = position.x;
            target.y = position.y;
        }

        function resize() {
            const firstLayout = width === 0;
            width = section.clientWidth;
            height = section.clientHeight;
            restY = width < 600 ? .24 : .72;
            if (firstLayout) position.y = target.y = restY;
            draw();
        }

        section.addEventListener('pointermove', event => {
            if (reducedMotion.matches || !finePointer.matches) return;
            const bounds = section.getBoundingClientRect();
            target.x = Math.max(.08, Math.min(.92, (event.clientX - bounds.left) / bounds.width));
            target.y = Math.max(.1, Math.min(.9, (event.clientY - bounds.top) / bounds.height));
            schedule();
        });
        section.addEventListener('pointerleave', freeze);
        addEventListener('blur', freeze);
        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(section);
        else addEventListener('resize', resize);
        reducedMotion.addEventListener('change', freeze);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) return;
            freeze();
        });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) return;
                freeze();
            }).observe(section);
        }
        resize();
    });
})();
