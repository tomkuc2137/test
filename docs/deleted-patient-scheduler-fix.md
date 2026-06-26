# Obsługa usuniętych pacjentów w harmonogramie lekarzy

## Problem

Po scaleniu pacjenta bez opcji „Przenieś wizyty” profil źródłowy jest oznaczany jako usunięty (`Deleted = true`), ale wizyty nadal wskazują na jego ID. Harmonogram próbuje pobrać dane pacjenta przez `GET /api/patients/{id}`, co kończy się **404** i wywala widok.

## Rozwiązanie

### Backend

Endpoint `GET /api/patients/{id}` obsługuje parametr zapytania `includeDeleted=true`, który włącza `PatientSpecification.AllowDeleted()`. Dzięki temu usunięty pacjent jest zwracany z flagą `deleted: true` zamiast 404.

**Jeśli endpoint już istnieje w projekcie**, dodaj do istniejącego `GetPatientEndpoint`:

```csharp
// W request DTO:
public bool IncludeDeleted { get; set; }

// W ExecuteAsync, przed pobraniem pacjenta:
if (req.IncludeDeleted)
{
    spec.AllowDeleted();
}
```

### Frontend

1. **`patient.service.ts`**
   - `getPatient(id, { includeDeleted: true })` – pobiera także usuniętych pacjentów
   - `getPatientForReference(id)` – używane w harmonogramie; przy 404 zwraca placeholder
   - `PatientService.getPatientDisplayName(patient)` – zwraca „Usunięty pacjent” dla `deleted === true`

2. **`employee-scheduler-cell`**
   - Ładuje pacjentów przez `getPatientForReference` zamiast `getPatient`
   - Wyświetla „Usunięty pacjent” (kursywa, obniżona opacity) zamiast wywalać komponent

## Zastosowanie w docelowym repozytorium VpClinic

Pliki w tym PR są wzorcową implementacją. W pełnym repozytorium:

1. Zmodyfikuj istniejący `GetPatientEndpoint` (nie duplikuj endpointu).
2. Zaktualizuj istniejący `patient.service.ts` – dodaj metody z tego PR.
3. W istniejącym `employee-scheduler-cell.component.ts` zamień wywołania `getPatient` na `getPatientForReference` i użyj `getPatientDisplayName` do wyświetlania nazwy.
