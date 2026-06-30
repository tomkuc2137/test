import Splide from '@splidejs/splide';

const mountSlider = (root: HTMLElement, options: ConstructorParameters<typeof Splide>[1]): void => {
    if (root.dataset.initialized === 'true') {
        return;
    }

    if (!root.querySelector('.splide__slide')) {
        return;
    }

    root.dataset.initialized = 'true';
    new Splide(root, options).mount();
};

export const initFinancingTestimonialsSlider = (): void => {
    document.querySelectorAll<HTMLElement>('.financing-testimonials-slider--desktop').forEach((root) => {
        mountSlider(root, {
            type: 'fade',
            rewind: true,
            speed: 400,
            gap: '30px',
            arrows: true,
            pagination: false,
            drag: true,
            autoplay: false,
            pauseOnHover: false,
            perPage: 1,
            perMove: 1,
        });
    });

    document.querySelectorAll<HTMLElement>('.financing-testimonials-slider--mobile').forEach((root) => {
        mountSlider(root, {
            type: 'fade',
            rewind: true,
            speed: 400,
            gap: '30px',
            arrows: false,
            pagination: true,
            drag: true,
            autoplay: false,
            pauseOnHover: false,
            perPage: 1,
            perMove: 1,
        });
    });
};
