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

    const processSteps = [...document.querySelectorAll('.home-page .process-list article')];
    if (processSteps.length) {
        let stepFrame = 0;
        function highlightStep() {
            stepFrame = 0;
            const target = innerHeight * .48;
            let nearest = processSteps[0];
            let distance = Infinity;
            processSteps.forEach(step => {
                const bounds = step.getBoundingClientRect();
                const nextDistance = Math.abs(bounds.top + bounds.height / 2 - target);
                if (nextDistance < distance) { nearest = step; distance = nextDistance; }
            });
            processSteps.forEach(step => step.classList.toggle('is-current', step === nearest));
        }
        const scheduleStep = () => {
            if (!stepFrame) stepFrame = requestAnimationFrame(highlightStep);
        };
        addEventListener('scroll', scheduleStep, { passive: true });
        addEventListener('resize', scheduleStep);
        highlightStep();
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

    const revealElements = [...document.querySelectorAll('.section-heading, .product-card, .product-heading, .process-list article, .intro-copy, .intro-visual, .process-copy, .process-visual, .direction-row, .split-section, .step-grid article, .contact-copy, .contact-form')];
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

    const stage = document.querySelector('.service-stage');
    const picker = stage?.querySelector('.service-picker');
    const indicator = picker?.querySelector('.tab-indicator');
    const tabs = picker ? [...picker.querySelectorAll('[role="tab"]')] : [];
    if (stage && picker && indicator && tabs.length) {
        // Критически затухающая пружина, response 0.4 с: индикатор догоняет вкладку без скачка.
        const omega = 2 * Math.PI / 0.4;
        const axes = { x: { value: 0, target: 0, velocity: 0 }, y: { value: 0, target: 0, velocity: 0 } };
        let frame = 0;
        let previous = 0;
        let ready = false;
        const paint = () => {
            indicator.style.transform = `translate3d(${axes.x.value.toFixed(2)}px, ${axes.y.value.toFixed(2)}px, 0)`;
        };
        const snap = () => {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            previous = 0;
            Object.values(axes).forEach(axis => { axis.value = axis.target; axis.velocity = 0; });
            paint();
        };
        const advance = timestamp => {
            const dt = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 1 / 60;
            previous = timestamp;
            let moving = false;
            Object.values(axes).forEach(axis => {
                const delta = axis.value - axis.target;
                const coefficient = axis.velocity + omega * delta;
                const decay = Math.exp(-omega * dt);
                axis.value = axis.target + (delta + coefficient * dt) * decay;
                axis.velocity = (axis.velocity - omega * coefficient * dt) * decay;
                if (Math.abs(axis.value - axis.target) > 0.05 || Math.abs(axis.velocity) > 0.1) moving = true;
            });
            paint();
            frame = moving ? requestAnimationFrame(advance) : 0;
            if (!moving) snap();
        };
        const measure = immediate => {
            const selected = picker.querySelector('[aria-selected="true"]');
            if (!selected?.offsetWidth) return;
            const origin = getComputedStyle(indicator);
            axes.x.target = selected.offsetLeft - parseFloat(origin.left);
            axes.y.target = selected.offsetTop - parseFloat(origin.top);
            indicator.style.width = `${selected.offsetWidth}px`;
            indicator.style.height = `${selected.offsetHeight}px`;
            if (!ready || immediate || reducedMotion.matches || document.hidden) snap();
            else if (!frame) {
                previous = 0;
                frame = requestAnimationFrame(advance);
            }
            ready = true;
            picker.classList.add('indicator-ready');
        };
        const select = (tab, keyboard) => {
            tabs.forEach(item => {
                const on = item === tab;
                item.setAttribute('aria-selected', String(on));
                item.tabIndex = on ? 0 : -1;
                document.getElementById(item.getAttribute('aria-controls'))?.classList.toggle('is-active', on);
            });
            if (keyboard) tab.focus();
            measure(keyboard && reducedMotion.matches);
        };
        stage.classList.add('is-ready');
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => select(tab, false));
            tab.addEventListener('keydown', event => {
                const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
                if (event.key === 'Home' || event.key === 'End') {
                    event.preventDefault();
                    select(tabs[event.key === 'Home' ? 0 : tabs.length - 1], true);
                } else if (next) {
                    event.preventDefault();
                    select(tabs[(index + next + tabs.length) % tabs.length], true);
                }
            });
        });
        if ('ResizeObserver' in window) new ResizeObserver(() => measure(true)).observe(picker);
        else addEventListener('resize', () => measure(true));
        reducedMotion.addEventListener('change', () => measure(true));
        document.fonts?.ready.then(() => measure(true));
        measure(true);
    }
})();

(() => {
    const group = document.querySelector('.partner-grid');
    if (!group) return;
    const viewport = document.createElement('div');
    viewport.className = 'partner-marquee';
    const belt = document.createElement('div');
    belt.className = 'partner-belt';
    group.before(viewport);
    viewport.append(belt);
    belt.append(group);
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    belt.append(copy);
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'partner-pause text-link';
    pause.textContent = 'Приостановить движение';
    pause.setAttribute('aria-pressed', 'false');
    viewport.after(pause);
    pause.addEventListener('click', () => {
        const paused = viewport.classList.toggle('is-paused');
        pause.setAttribute('aria-pressed', String(paused));
        pause.textContent = paused ? 'Продолжить движение' : 'Приостановить движение';
    });
})();
