(() => {
    const form = document.querySelector('[data-estimator]');
    if (!form) return;
    const specialist = form.elements.specialist;
    const hours = form.elements.hours;
    const range = form.querySelector('#estimate-range');
    const total = form.querySelector('#estimate-total');
    const breakdown = form.querySelector('#estimate-breakdown');
    const submit = form.querySelector('button[type="submit"]');
    const money = value => new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
    }).format(value);

    function update() {
        const valid = hours.validity.valid;
        const count = hours.valueAsNumber;
        const rate = Number(specialist.value);
        total.textContent = valid ? money(count * rate) : '—';
        breakdown.textContent = valid ? `${count} ч × ${money(rate)} / час` : 'Укажите целое количество часов от 1 до 160.';
        submit.disabled = !valid;
        if (valid) range.value = hours.value;
    }
    range.addEventListener('input', () => {
        hours.value = range.value;
        update();
    });
    hours.addEventListener('input', update);
    specialist.addEventListener('change', update);
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const level = specialist.selectedOptions[0].textContent;
        const body = `Здравствуйте!\n\nХочу обсудить работы по 1С.\nСпециалист: ${level}\nКоличество часов: ${hours.value}\nПредварительная стоимость: ${total.textContent}\n\nОписание задачи:\n`;
        location.href = `mailto:info@aldanteh.ru?subject=${encodeURIComponent('Оценка задачи по 1С')}&body=${encodeURIComponent(body)}`;
    });
    update();
})();
