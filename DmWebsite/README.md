# Forma Development – migracja WP → Razor

Fragmenty strony głównej (`Index.cshtml`) przeniesione z WordPress/Kadence na ASP.NET Razor Pages + Tailwind.

## Sekcja „Nasze osiedla”

### Pliki

| Plik | Opis |
|------|------|
| `Pages/Shared/_FutureEstatesSection.cshtml` | Partial z tekstem + sliderem Splide |
| `wwwroot/js/future-estates-slider.js` | Inicjalizacja slidera (fade, strzałki, kropki) |
| `Pages/Index.cshtml` | Przykład użycia po sekcji oferty |

### W `Index.cshtml` dodaj:

```cshtml
<partial name="Shared/_FutureEstatesSection" />
```

(bezpośrednio po sekcji „Zobacz co możemy zaoferować”)

### Assety do skopiowania z WP

Umieść w `wwwroot/inc/img/`:

- `Icon-Box.png` (72×72, dekoracja nad nagłówkiem)
- `Image-8.png` (zdjęcie w bloku mobilnym, min. wys. ~466px)
- opcjonalnie `future-estates-bg.jpg` – tło sekcji (ciemne zdjęcie osiedla); bez pliku sekcja ma jednolite tło `#151515`

### Tailwind – tokeny używane w sekcji

Upewnij się, że w `tailwind.config` masz m.in.:

```js
colors: {
  main: '#ba9e60',
  dark: '#151515',
},
fontFamily: {
  barlow: ['Barlow', 'sans-serif'],
},
```

### Splide

Partial ładuje Splide 4 z CDN (jak w Kadence). Jeśli wolisz lokalnie: `npm i @splidejs/splide` i podmień linki w partialu.
