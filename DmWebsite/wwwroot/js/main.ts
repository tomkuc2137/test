import '@splidejs/splide/css';

import { initContactForm } from './contact-form';
import { initFutureEstatesSlider } from './future-estates-slider';

document.addEventListener('DOMContentLoaded', () => {
    initFutureEstatesSlider();
    initContactForm();
});
