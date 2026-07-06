import Splide from '@splidejs/splide';

export const initFutureEstatesSlider = (): void => {
    document.querySelectorAll<HTMLElement>('.future-estates-slider').forEach((root) => {
        if (root.dataset.initialized === 'true') {
            return;
        }

        if (!root.querySelector('.splide__slide')) {
            return;
        }

        root.dataset.initialized = 'true';

        new Splide(root, {
            type: 'fade',
            rewind: true,
            speed: 400,
            gap: '30px',
            arrows: true,
            pagination: true,
            drag: true,
            autoplay: false,
            pauseOnHover: false,
            perPage: 1,
            perMove: 1,
        }).mount();
    });
};
