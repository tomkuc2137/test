interface GalleryConfig {
    modalId: string;
    gallerySelector: string;
    paginationClass?: string;
    thumbnailsClass?: string;
}

interface GalleryImage {
    src: string;
    alt: string;
}

class GalleryLightbox {
    private modal: HTMLElement | null = null;
    private gallerySelector: string = '';
    private modalImage: HTMLImageElement | null = null;
    private pagination: HTMLElement | null = null;
    private thumbnailsEl: HTMLElement | null = null;
    private images: GalleryImage[] = [];
    private currentIndex: number = 0;
    private isDragging: boolean = false;
    private startX: number = 0;
    private touchEndX: number = 0;

    constructor({ modalId, gallerySelector, paginationClass, thumbnailsClass }: GalleryConfig) {
        this.modal = document.getElementById(modalId);

        if (!this.modal) {
            return;
        }

        this.gallerySelector = gallerySelector;
        this.modalImage = this.modal.querySelector<HTMLImageElement>('.modal-image');
        this.pagination = paginationClass ? this.modal.querySelector<HTMLElement>('.' + paginationClass) : null;
        this.thumbnailsEl = thumbnailsClass ? this.modal.querySelector<HTMLElement>('.' + thumbnailsClass) : null;

        this.setupEventListeners();
    }

    private collectImages(): void {
        const seen = new Set<string>();
        const items = document.querySelectorAll<HTMLElement>(
            `${this.gallerySelector} .gallery-item[data-full-src]`
        );

        this.images = Array.from(items)
            .filter(item => {
                const list = item.closest('ul');
                return !list || list.offsetParent !== null;
            })
            .map(item => ({
                src: item.dataset.fullSrc || '',
                alt: item.querySelector('img')?.alt || ''
            }))
            .filter(({ src }) => src && !seen.has(src) && !!seen.add(src));
    }

    private buildPagination(): void {
        if (!this.pagination) {
            return;
        }

        this.pagination.innerHTML = '';
        this.images.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `w-2 h-2 rounded-full bg-white ${i === 0 ? '' : 'opacity-20'}`;
            this.pagination!.appendChild(dot);
        });
    }

    private updatePagination(): void {
        if (!this.pagination) {
            return;
        }

        Array.from(this.pagination.children).forEach((dot, i) => {
            dot.className = `w-2 h-2 rounded-full bg-white ${i === this.currentIndex ? '' : 'opacity-20'}`;
        });
    }

    private buildThumbnails(): void {
        if (!this.thumbnailsEl) {
            return;
        }

        this.thumbnailsEl.innerHTML = '';
        this.images.forEach(({ src, alt }, index) => {
            const btn = document.createElement('button');
            btn.className = 'cursor-pointer group overflow-hidden relative rounded-md shrink-0 focus:outline-none h-14 w-20 lg:h-16 lg:w-24 block';
            btn.setAttribute('aria-label', `Zdjęcie ${index + 1}`);

            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 z-10 duration-300 bg-black/20 group-hover:bg-transparent';

            const img = document.createElement('img');
            img.src = src;
            img.alt = alt;
            img.className = 'h-full w-full object-cover block';
            img.loading = 'lazy';

            btn.appendChild(overlay);
            btn.appendChild(img);
            btn.addEventListener('click', () => this.goTo(index));
            this.thumbnailsEl!.appendChild(btn);
        });

        this.updateThumbnails();
    }

    private updateThumbnails(): void {
        if (!this.thumbnailsEl) {
            return;
        }

        Array.from(this.thumbnailsEl.children).forEach((btn, i) => {
            const active = i === this.currentIndex;
            const overlay = btn.querySelector('div');

            if (overlay) {
                overlay.classList.toggle('bg-black/20', !active);
                overlay.classList.toggle('bg-transparent', active);
            }

            if (active) {
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    private goTo(index: number): void {
        this.currentIndex = index;

        if (this.modalImage) {
            this.modalImage.src = this.images[index].src;
            this.modalImage.alt = this.images[index].alt;
        }

        this.updatePagination();
        this.updateThumbnails();
    }

    private showNext(): void {
        this.goTo((this.currentIndex + 1) % this.images.length);
    }

    private showPrev(): void {
        this.goTo((this.currentIndex - 1 + this.images.length) % this.images.length);
    }

    private handleSwipe(): void {
        const diff = this.touchEndX - this.startX;
        if (Math.abs(diff) > 40) {
            diff > 0 ? this.showPrev() : this.showNext();
        }
    }

    private openModal(index: number): void {
        this.collectImages();
        this.buildPagination();
        this.buildThumbnails();
        this.goTo(index);
        this.modal?.classList.remove('hidden');
        this.modal?.classList.add('flex');
        this.modal?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    private closeModal(): void {
        this.modal?.classList.remove('flex');
        this.modal?.classList.add('hidden');
        this.modal?.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    private setupEventListeners(): void {
        document.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const item = target.closest<HTMLElement>('.gallery-item[data-full-src]');
            if (!item || !item.closest(this.gallerySelector)) {
                return;
            }

            this.collectImages();
            const index = this.images.findIndex(img => img.src === item.dataset.fullSrc);
            if (index !== -1) {
                this.openModal(index);
            }
        });

        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const item = (e.target as HTMLElement).closest<HTMLElement>('.gallery-item[data-full-src]');
            if (!item || !item.closest(this.gallerySelector) || e.key !== 'Enter' && e.key !== ' ') {
                return;
            }

            e.preventDefault();
            this.collectImages();
            const index = this.images.findIndex(img => img.src === item.dataset.fullSrc);
            if (index !== -1) {
                this.openModal(index);
            }
        });

        this.modal?.querySelector<HTMLElement>('.close-modal')?.addEventListener('click', () => this.closeModal());

        this.modal?.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const isInteractiveElement = target.closest('.modal-image') ||
                target.closest('.lightbox-thumbnails') ||
                target.closest('button');

            if (!isInteractiveElement) {
                this.closeModal();
            }
        });

        this.modal?.querySelector<HTMLElement>('.prev-btn')?.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            this.showPrev();
        });

        this.modal?.querySelector<HTMLElement>('.next-btn')?.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            this.showNext();
        });

        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (this.modal?.classList.contains('hidden')) {
                return;
            }

            if (e.key === 'Escape') {
                this.closeModal();
            }

            if (e.key === 'ArrowLeft') {
                this.showPrev();
            }

            if (e.key === 'ArrowRight') {
                this.showNext();
            }
        });

        const imgEl = this.modalImage;
        if (!imgEl) {
            return;
        }

        imgEl.addEventListener('touchstart', (e: TouchEvent) => {
            this.startX = e.touches[0].clientX;
            this.isDragging = true;
        });

        imgEl.addEventListener('mousedown', (e: MouseEvent) => {
            this.startX = e.clientX;
            this.isDragging = true;
        });

        const handleEnd = (endX: number) => {
            if (!this.isDragging) {
                return;
            }

            this.isDragging = false;
            this.touchEndX = endX;
            this.handleSwipe();
        };

        imgEl.addEventListener('touchend', (e: TouchEvent) => handleEnd(e.changedTouches[0].clientX));
        document.addEventListener('mouseup', (e: MouseEvent) => handleEnd(e.clientX));
    }
}

export const initModalGallery = (): void => {
    if (document.getElementById('modal-main')) {
        new GalleryLightbox({
            modalId: 'modal-main',
            gallerySelector: '.autoSlider',
            paginationClass: 'lightbox-pagination',
        });
    }

    if (document.getElementById('customize-space-gallery-modal')) {
        new GalleryLightbox({
            modalId: 'customize-space-gallery-modal',
            gallerySelector: '#realizations-gallery',
            paginationClass: 'lightbox-pagination',
        });
    }

    if (document.getElementById('modal-tabs')) {
        new GalleryLightbox({
            modalId: 'modal-tabs',
            gallerySelector: '#galleryContainer',
            thumbnailsClass: 'lightbox-thumbnails',
        });
    }

    if (document.getElementById('clientZoneInteriorModal')) {
        new GalleryLightbox({
            modalId: 'clientZoneInteriorModal',
            gallerySelector: '#clientZoneInteriorGallery',
            paginationClass: 'client-zone-lightbox-pagination',
        });
    }
};
