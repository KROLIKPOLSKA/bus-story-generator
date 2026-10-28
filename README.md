# Bus Video Descriptions

Temat: Aplikacja „Generator Opisów Filmowych dla Miłośników Komunikacji Miejskiej”

​Treść promptu:

​Stwórz nowoczesną, responsywną aplikację jednostronicową (SPA), która generuje opisy do filmów (np. na YouTube lub Facebooka) na podstawie danych wprowadzonych przez użytkownika.

​Funkcje interfejsu (Formularz):

​Data nagrania: Pole typu "date picker".

​Miasto nagrania: Pole tekstowe (wymagane).

​Marka autobusu: Pole tekstowe (opcjonalne).

​Model autobusu: Pole tekstowe (opcjonalne).

​Opis własny: Pole tekstowe wielolinijkowe (textarea, opcjonalne).

​Logika generowania opisu:

​Po kliknięciu przycisku "Generuj opis", aplikacja powinna stworzyć sformatowany tekst według wzoru:

​"Nagranie z dnia: [Data]"

​"Miejsce: [Miasto]"

​"Pojazd: [Marka] [Model]" (wyświetlaj tylko, jeśli pola nie są puste)

​"Dodatkowe informacje: [Opis własny]" (wyświetlaj tylko, jeśli nie jest pusty)

​Funkcjonalność Schowka:

​Pod wygenerowanym opisem dodaj wyraźny przycisk "Kopiuj do schowka".

​Po kliknięciu przycisku system powinien skopiować cały tekst opisu i wyświetlić krótkie powiadomienie (Toast) o treści: "Skopiowano do schowka!".

​Wygląd:

​Czysty, nowoczesny design (możesz użyć Tailwind CSS).

​Stonowana kolorystyka (np. odcienie niebieskiego lub ciemny motyw).

​Aplikacja musi być w pełni po polsku.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bus-story-generator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/847ba940-5d05-4403-85d9-ebe7ae70514c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
