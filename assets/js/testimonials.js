(() => {
    const track = document.querySelector('.testimonial-track');
    if (!track) return;
    const cards = [...track.children];
    const previous = document.querySelector('.testimonial-prev');
    const next = document.querySelector('.testimonial-next');
    const counter = document.querySelector('.testimonial-counter');
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
        index = Math.min(index, lastIndex());
        track.scrollTo({ left: position(index), behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    function update() {
        current = cards.reduce((best, _, index) => Math.abs(position(index) - track.scrollLeft) < Math.abs(position(best) - track.scrollLeft) ? index : best, 0);
        current = Math.min(current, lastIndex());
        previous.disabled = track.scrollLeft < 2;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
        counter.textContent = visibleCount() === 2 ? `${current + 1}–${Math.min(current + 2, cards.length)} / ${cards.length}` : `${current + 1} / ${cards.length}`;
    }
    previous.addEventListener('click', () => select(Math.max(0, current - 1)));
    next.addEventListener('click', () => select(Math.min(cards.length - 1, current + 1)));

    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
        const keys = { ArrowLeft: Math.max(0, current - 1), ArrowRight: Math.min(cards.length - 1, current + 1), Home: 0, End: cards.length - 1 };
        if (!(event.key in keys)) return;
        event.preventDefault();
        select(keys[event.key]);
    });
    new ResizeObserver(update).observe(track);
    update();
})();
