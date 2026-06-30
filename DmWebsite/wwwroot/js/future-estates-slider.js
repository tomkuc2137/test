(function () {
    function initFutureEstatesSlider() {
        var root = document.querySelector('.future-estates-slider');
        if (!root || typeof Splide === 'undefined') {
            return;
        }

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFutureEstatesSlider);
    } else {
        initFutureEstatesSlider();
    }
})();
