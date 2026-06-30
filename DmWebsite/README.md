# Forma Development – sekcja „Nasze osiedla”

## Dlaczego slider był niewidoczny

1. **Race condition z CDN** – `future-estates-slider.js` uruchamiał się zanim załadował się globalny `Splide` z CDN → init kończył się cicho (`typeof Splide === 'undefined'`).
2. **Fade przed init** – Splide CSS ukrywa nieaktywne slajdy; bez `mount()` wszystko wyglądało jak pusty blok.
3. **Brak zdjęć w slajdach** – w WP każdy slajd ma kolumnę ze zdjęciem; sama karta tekstowa była mniej widoczna.

## Rozwiązanie

- Splide z **npm** + **TypeScript** (jak `initSliders` w Rytm Natury).
- CSS Splide importowany w `main.ts`.
- Init w `DOMContentLoaded` z bundlera (Vite), **nie** skryptów w partialu.
- Ścieżki przez `Url.Content("~/inc/img/...")` zamiast `bg-[url('/inc/img/...')]` w Tailwind.

## Instalacja

```bash
npm i @splidejs/splide
```

W `main.ts` (lub istniejącym entry point):

```ts
import '@splidejs/splide/css';
import { initFutureEstatesSlider } from './future-estates-slider';

document.addEventListener('DOMContentLoaded', () => {
    initFutureEstatesSlider();
    // initContactForm() itd.
});
```

W `_Layout.cshtml`:

```html
<script type="module" src="~/js/main.js" asp-append-version="true"></script>
```

(budujesz `main.ts` → `wwwroot/js/main.js` przez Vite)

## Assety w `wwwroot/inc/img/`

| Plik | Użycie |
|------|--------|
| `Section_converted.avif` | Tło sekcji + blok mobilny |
| `Icon-Box.png` | Ikona nad H2 |
| `26523.jpg` | Slajdy 1 i 3 |
| `Depositphotos_226242700_L.jpg` | Slajdy 2 i 4 |

Jeśli masz 4 osobne zdjęcia – podmień `src` w partialu.

## Ostrzeżenia IDE „Cannot resolve directory inc”

To **nie błąd runtime** – Rider/VS nie rozumie `~/inc/img/` w Tailwind arbitrary `url()`.  
`Url.Content()` w Razor + `style="background-image: url('...')"` usuwa problem.

## Partial

```cshtml
<partial name="Shared/_FutureEstatesSection" />
```

Bez `<script>` i bez CDN w partialu.
