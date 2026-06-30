import '@splidejs/splide/css';

import { initContactForm } from './contact-form';
import { initFinancingTestimonialsSlider } from './financing-testimonials-slider';
import { initFutureEstatesSlider } from './future-estates-slider';

document.addEventListener('DOMContentLoaded', () => {
    initFutureEstatesSlider();
    initFinancingTestimonialsSlider();
    initContactForm();
});
