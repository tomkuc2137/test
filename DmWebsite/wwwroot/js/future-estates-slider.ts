import Splide from '@splidejs/splide';

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) {
        return fallback;
    }

    return value !== 'false';
};

export const initSplideSliders = (): void => {
    document.querySelectorAll<HTMLElement>('.splide-slider').forEach((root) => {
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
            speed: Number(root.dataset.splideSpeed ?? 400),
            gap: root.dataset.splideGap ?? '30px',
            arrows: parseBool(root.dataset.splideArrows, true),
            pagination: parseBool(root.dataset.splidePagination, true),
            drag: parseBool(root.dataset.splideDrag, true),
            autoplay: false,
            pauseOnHover: false,
            perPage: 1,
            perMove: 1,
        }).mount();
    });
};

/** Alias – ta sama funkcja co initSplideSliders */
export const initFutureEstatesSlider = initSplideSliders;
