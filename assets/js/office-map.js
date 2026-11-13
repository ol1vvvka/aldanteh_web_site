(() => {
    const wrapper = document.querySelector('[data-office-map]');
    if (!wrapper || !wrapper.dataset.apiKey) return;
    const fallback = wrapper.querySelector('iframe');
    const target = wrapper.querySelector('.office-map-target');
    const status = wrapper.querySelector('.office-map-status');
    const scriptBase = [...document.scripts].find(item => item.src.includes('office-map'))?.src || './';
    const mapPinHref = new URL('../icons/map-pin.svg', scriptBase).href;

    function showFallback() {
        target.hidden = true;
        fallback.hidden = false;
        status.textContent = 'Если карта не загрузилась, откройте адрес в Яндекс Картах по ссылке ниже.';
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${encodeURIComponent(wrapper.dataset.apiKey)}`;
    script.async = true;
    script.onerror = showFallback;
    script.onload = () => {
        if (!window.ymaps) { showFallback(); return; }
        window.ymaps.ready(() => {
            try {
                target.hidden = false;
                const map = new window.ymaps.Map(target, {
                    center: [56.8323, 60.6543], zoom: 17, controls: [], behaviors: [],
                });
                const pin = new window.ymaps.Placemark([56.8322, 60.6536], {}, {
                    iconLayout: 'default#image',
                    iconImageHref: mapPinHref,
                    iconImageSize: [44, 54],
                    iconImageOffset: [-22, -50.5],
                    hasBalloon: false,
                    hasHint: false,
                    openBalloonOnClick: false,
                    openHintOnHover: false,
                    interactivityModel: 'default#silent',
                });
                map.geoObjects.add(pin);
                fallback.hidden = true;
            } catch {
                showFallback();
            }
        }, showFallback);
    };
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            document.head.append(script);
        }, { rootMargin: '200px' });
        observer.observe(wrapper);
    } else document.head.append(script);
})();
