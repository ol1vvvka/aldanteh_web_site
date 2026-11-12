(() => {
    const root = document.documentElement;
    const themeButton = document.querySelector('.theme-toggle');
    const systemTheme = matchMedia('(prefers-color-scheme: dark)');
    let hasManualTheme = false;
    try {
        hasManualTheme = ['light', 'dark'].includes(localStorage.getItem('aldanteh-theme'));
    } catch {
        hasManualTheme = false;
    }

    function updateTheme(theme) {
        root.dataset.theme = theme;
        themeButton?.setAttribute('aria-pressed', String(theme === 'dark'));
        themeButton?.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141719' : '#f4f4f1');
        document.dispatchEvent(new Event('themechange'));
    }

    updateTheme(root.dataset.theme || 'light');
    themeButton?.addEventListener('click', () => {
        const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        hasManualTheme = true;
        updateTheme(theme);
        try {
            localStorage.setItem('aldanteh-theme', theme);
        } catch {
            hasManualTheme = true;
        }
    });
    systemTheme.addEventListener('change', event => {
        if (!hasManualTheme) updateTheme(event.matches ? 'dark' : 'light');
    });

    const menuButton = document.querySelector('.menu-toggle');
    const menu = document.querySelector('.main-nav');
    const projects = menu?.querySelector('.nav-projects');
    const projectsButton = projects?.querySelector('.projects-toggle');
    const projectsMenu = projects?.querySelector('.projects-menu');
    const hoverNavigation = matchMedia('(min-width: 851px) and (hover: hover)');
    let projectsCloseTimer;

    function setProjectsOpen(open) {
        clearTimeout(projectsCloseTimer);
        if (!projectsMenu) return;
        projectsMenu.hidden = !open;
        projectsButton.setAttribute('aria-expanded', String(open));
    }
    projectsButton?.addEventListener('click', () => setProjectsOpen(projectsMenu.hidden));
    projects?.addEventListener('pointerenter', () => {
        if (hoverNavigation.matches) setProjectsOpen(true);
    });
    projects?.addEventListener('pointerleave', () => {
        if (hoverNavigation.matches && !projects.contains(document.activeElement)) {
            projectsCloseTimer = setTimeout(() => setProjectsOpen(false), 160);
        }
    });
    projects?.addEventListener('focusout', event => {
        if (!projects.contains(event.relatedTarget)) setProjectsOpen(false);
    });
    projects?.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !projectsMenu.hidden) {
            event.stopPropagation();
            setProjectsOpen(false);
            projectsButton.focus();
        } else if (event.key === 'ArrowDown' && event.target === projectsButton) {
            event.preventDefault();
            setProjectsOpen(true);
            projectsMenu.querySelector('a').focus();
        }
    });
    document.addEventListener('click', event => {
        if (!projects?.contains(event.target)) setProjectsOpen(false);
    });

    function closeMenu() {
        setProjectsOpen(false);
        menu?.classList.remove('is-open');
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'Открыть меню');
    }

    menuButton?.addEventListener('click', () => {
        if (!menu) return;
        const isOpen = menu.classList.toggle('is-open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
    });
    menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu?.classList.contains('is-open')) {
            closeMenu();
            menuButton?.focus();
        }
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('.site-header')) closeMenu();
    });
    matchMedia('(min-width: 851px)').addEventListener('change', closeMenu);

    document.querySelectorAll('.service-item').forEach(service => {
        service.addEventListener('toggle', () => {
            if (!service.open) return;
            document.querySelectorAll('.service-item').forEach(other => {
                if (other !== service) other.open = false;
            });
        });
    });

    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
        const tabs = [...tablist.querySelectorAll('[role="tab"]')];
        function selectTab(selected) {
            tabs.forEach(tab => {
                const isSelected = tab === selected;
                tab.setAttribute('aria-selected', String(isSelected));
                tab.tabIndex = isSelected ? 0 : -1;
                document.getElementById(tab.getAttribute('aria-controls')).hidden = !isSelected;
            });
        }
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => selectTab(tab));
            tab.addEventListener('keydown', event => {
                let nextIndex = index;
                if (['ArrowRight', 'ArrowDown'].includes(event.key)) nextIndex = (index + 1) % tabs.length;
                else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) nextIndex = (index - 1 + tabs.length) % tabs.length;
                else if (event.key === 'Home') nextIndex = 0;
                else if (event.key === 'End') nextIndex = tabs.length - 1;
                else return;
                event.preventDefault();
                selectTab(tabs[nextIndex]);
                tabs[nextIndex].focus();
            });
        });
    });

    document.querySelectorAll('[data-year]').forEach(element => element.textContent = new Date().getFullYear());
    document.querySelectorAll('.contact-form').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const fields = new FormData(form);
            const body = `Здравствуйте!\n\n${fields.get('message')}\n\n${fields.get('name')}\nКонтактная почта: ${fields.get('email')}`;
            location.href = `mailto:info@aldanteh.ru?subject=${encodeURIComponent('Задача для АЛДАН ТЕХ')}&body=${encodeURIComponent(body)}`;
            form.querySelector('.form-status').textContent = 'Письмо подготовлено. Если почтовая программа не открылась, напишите на info@aldanteh.ru.';
        });
    });
})();
