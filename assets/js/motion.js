(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(pointer: fine)');

    document.querySelectorAll('[data-tilt]').forEach(art => {
        art.addEventListener('pointermove', event => {
            if (art.querySelector('.has-fluid')) return;
            if (reducedMotion.matches || !finePointer.matches) return;
            const bounds = art.getBoundingClientRect();
            art.style.setProperty('--tilt-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 18}deg`);
            art.style.setProperty('--tilt-y', `${-((event.clientY - bounds.top) / bounds.height - .5) * 12}deg`);
        });
        const reset = () => {
            if (art.querySelector('.has-fluid')) return;
            art.style.setProperty('--tilt-x', '0deg');
            art.style.setProperty('--tilt-y', '0deg');
        };
        art.addEventListener('pointerleave', reset);
        reducedMotion.addEventListener('change', reset);
    });

    const readingHeadings = [...document.querySelectorAll('[data-reading]')];
    const desktopMotion = matchMedia('(min-width: 851px)');
    const parallaxLayers = [...document.querySelectorAll('[data-parallax], [data-parallax-scene]')].map(element => ({
        element,
        anchor: element.hasAttribute('data-parallax') ? element.parentElement : element,
        speed: Number(element.dataset.parallax || .08),
    }));
    readingHeadings.forEach(heading => {
        const words = heading.textContent.trim().split(/\s+/);
        heading.textContent = '';
        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'reading-word';
            span.textContent = word;
            heading.append(span);
            if (index < words.length - 1) heading.append(' ');
        });
    });

    let scrollFrame = 0;
    function updateReading() {
        readingHeadings.forEach(heading => {
            const bounds = heading.getBoundingClientRect();
            const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .9 - bounds.top) / (innerHeight * .45)));
            const words = [...heading.querySelectorAll('.reading-word')];
            words.forEach((word, index) => word.classList.toggle('is-read', index / words.length < progress));
        });
        parallaxLayers.forEach(layer => {
            if (reducedMotion.matches || !desktopMotion.matches) {
                layer.element.style.setProperty('--parallax-y', '0px');
                return;
            }
            const bounds = layer.anchor.getBoundingClientRect();
            if (bounds.bottom < -100 || bounds.top > innerHeight + 100) return;
            const offset = (innerHeight / 2 - bounds.top - bounds.height / 2) * layer.speed;
            layer.element.style.setProperty('--parallax-y', `${Math.max(-32, Math.min(32, offset)).toFixed(2)}px`);
        });
        scrollFrame = 0;
    }
    function scheduleReading() {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReading);
    }
    if (readingHeadings.length || parallaxLayers.length) {
        addEventListener('scroll', scheduleReading, { passive: true });
        addEventListener('resize', scheduleReading);
        reducedMotion.addEventListener('change', scheduleReading);
        desktopMotion.addEventListener('change', scheduleReading);
        scheduleReading();
    }

    const symbols = '01<>/{}_+';
    const stopScrambles = new Set();
    const headingObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            headingObserver.unobserve(entry.target);
            animateHeading(entry.target);
        });
    }, { threshold: .15, rootMargin: '0px 0px -5% 0px' }) : null;

    function animateHeading(heading) {
        if (reducedMotion.matches) return;
        const original = document.createElement('span');
        original.className = 'heading-original';
        original.append(...heading.childNodes);
        const visual = original.cloneNode(true);
        visual.className = 'heading-scramble';
        visual.setAttribute('aria-hidden', 'true');
        visual.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        heading.append(original, visual);
        heading.classList.add('is-scrambling');
        const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
        const fragments = [];
        while (walker.nextNode()) fragments.push({ node: walker.currentNode, text: walker.currentNode.textContent });
        let frame = 0;
        let lastStep = -1;
        const start = performance.now();
        const stop = () => {
            cancelAnimationFrame(frame);
            visual.remove();
            original.replaceWith(...original.childNodes);
            heading.classList.remove('is-scrambling');
            stopScrambles.delete(stop);
        };
        stopScrambles.add(stop);
        function animate(now) {
            const progress = Math.min(1, (now - start) / 520);
            const step = Math.floor((now - start) / 40);
            if (step !== lastStep) {
                fragments.forEach(({ node, text }) => {
                    const letters = [...text];
                    node.textContent = letters.map((letter, index) => /\s/.test(letter) || index / letters.length < progress ? letter : symbols[Math.floor(Math.random() * symbols.length)]).join('');
                });
                lastStep = step;
            }
            if (progress < 1) frame = requestAnimationFrame(animate);
            else stop();
        }
        frame = requestAnimationFrame(animate);
    }
    document.querySelectorAll('[data-scramble]').forEach(label => label.removeAttribute('data-scramble'));
    document.querySelectorAll('main h1').forEach(heading => headingObserver?.observe(heading));
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) [...stopScrambles].forEach(stop => stop());
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) [...stopScrambles].forEach(stop => stop());
    });

    const revealElements = [...document.querySelectorAll('.section-heading, .project-card, .process-list article')];
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: .12 });
        revealElements.forEach(element => {
            if (element.getBoundingClientRect().top < innerHeight || reducedMotion.matches) return;
            element.classList.add('reveal-pending');
            observer.observe(element);
        });
    }
})();
