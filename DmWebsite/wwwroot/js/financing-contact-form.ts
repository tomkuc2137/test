export function initFinancingContactForm(): void {
    const form = document.getElementById('financing-contact-form') as HTMLFormElement | null;
    if (!form) return;

    const statusEl = document.getElementById('financing-contact-form-status');
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        submitBtn?.setAttribute('disabled', 'true');
        setStatus(statusEl, '', true);

        const formData = new FormData(form);

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            form.reset();
            setStatus(statusEl, 'Dziękujemy! Damian skontaktuje się z Tobą wkrótce.', false, 'success');
        } catch {
            setStatus(
                statusEl,
                'Wystąpił błąd. Spróbuj ponownie lub napisz bezpośrednio na damian.rusanowski@gmail.com.',
                false,
                'error',
            );
        } finally {
            submitBtn?.removeAttribute('disabled');
        }
    });
}

function setStatus(
    el: HTMLElement | null,
    message: string,
    hidden: boolean,
    variant: 'success' | 'error' | '' = '',
): void {
    if (!el) return;

    el.textContent = message;
    el.classList.toggle('hidden', hidden);
    el.classList.remove('text-green-700', 'text-red-600');

    if (variant === 'success') {
        el.classList.add('text-green-700');
    } else if (variant === 'error') {
        el.classList.add('text-red-600');
    }
}
