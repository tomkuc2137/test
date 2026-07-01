import '@splidejs/splide/css';

import { initContactForm } from './contact-form';
import { initFinancingContactForm } from './financing-contact-form';
import { initSplideSliders } from './future-estates-slider';

document.addEventListener('DOMContentLoaded', () => {
    initSplideSliders();
    initContactForm();
    initFinancingContactForm();
});
