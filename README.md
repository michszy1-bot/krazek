# Forma

Osobisty dziennik treningowy na iPhone'a: serie, minutnik przerwy, rekordy, wykresy, animacje ćwiczeń, profil i dziennik wagi.
Bez konta i bez serwera. Wszystkie wpisy są zapisane tylko na telefonie.

## Podgląd na komputerze

```bash
npm start
```

Adres: http://localhost:5173

## Testy

```bash
npm test
```

## Na iPhone'a

Aplikacja musi być dostępna pod adresem `https`, bo inaczej tryb offline na iPhonie nie zadziała.
Po opublikowaniu folderu otwórz adres w Safari i wybierz Udostępnij, a potem „Do ekranu początkowego”.

Publikowany jest tylko kod aplikacji. Treningi nigdzie nie są wysyłane.

## Dane i kopia zapasowa

Usunięcie aplikacji z ekranu początkowego kasuje też jej dane.
Kopię zapisuje się w Ustawieniach i najlepiej trzymać ją poza telefonem, np. w iCloud Drive.

## Animacje

Animacje pochodzą z darmowego ExerciseDB i ładują się z jego serwera, więc wymagają internetu.
Reszta aplikacji działa bez internetu. Spis powiązań jest w `js/animations.js`.

## Aktualizacje

Po zmianie plików podnieś `VERSION` w `sw.js`. Inaczej telefon zostanie przy starej wersji.
