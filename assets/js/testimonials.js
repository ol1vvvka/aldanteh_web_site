(() => {
    const track = document.querySelector('.testimonial-track');
    if (!track) return;
    const cards = [...track.children];
    const previous = document.querySelector('.testimonial-prev');
    const next = document.querySelector('.testimonial-next');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    function position(index) {
        return cards[index].getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - 4;
    }
    function visibleCount() {
        return matchMedia('(min-width: 900px)').matches ? 2 : 1;
    }
    function lastIndex() {
        return cards.length - visibleCount();
    }
    function select(index) {
        index = (index + lastIndex() + 1) % (lastIndex() + 1);
        track.scrollTo({ left: position(index), behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    function update() {
        current = cards.reduce((best, _, index) => Math.abs(position(index) - track.scrollLeft) < Math.abs(position(best) - track.scrollLeft) ? index : best, 0);
        current = Math.min(current, lastIndex());

    }
    previous.addEventListener('click', () => select(current - 1));
    next.addEventListener('click', () => select(current + 1));

    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
        const keys = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: lastIndex() };
        if (!(event.key in keys)) return;
        event.preventDefault();
        select(keys[event.key]);
    });
    new ResizeObserver(update).observe(track);
    update();
})();
