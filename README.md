# Gym AI Logboek — eenvoudige MVP

Een kleine webapp waarmee je:

- een door AI gemaakt trainingsplan als JSON importeert;
- lokaal een voorstel voor kracht, calisthenics of cardio maakt en volledig bewerkt;
- oefeningen uit een centrale database zoekt, vervangt, toevoegt en verwijdert;
- sets, herhalingen, gewicht, moeilijkheid en notities registreert;
- cardio-intervallen en extra sets of intervallen registreert;
- iedere wijziging automatisch in de browser opslaat;
- een training na het sluiten van de browser kunt hervatten;
- trainingsresultaten als JSON downloadt;
- een leesbare samenvatting voor AI-feedback kopieert;
- afgeronde trainingen lokaal in een geschiedenis bewaart.

## Snel testen

Open `index.html` direct in een browser. De basis werkt dan meteen.

Voor volledige offline-installatie via de service worker moet de app via een webserver of GitHub Pages worden geopend.

## Op GitHub Pages zetten

1. Maak op GitHub een nieuwe repository, bijvoorbeeld `gym-ai-logboek`.
2. Upload alle bestanden uit deze map naar de hoofdmap van de repository.
3. Open in de repository: **Settings → Pages**.
4. Kies bij de publicatiebron de `main`-branch en de hoofdmap `/root`.
5. Sla dit op en open daarna het webadres dat GitHub toont.

## Google Drive

Google Drive kan de bestanden bewaren, synchroniseren en delen, maar is geen geschikte openbare webhost voor deze app. Je kunt de ZIP wel in Drive opslaan als back-up. Om de app op meerdere apparaten via een link te gebruiken, is GitHub Pages de eenvoudigste gratis optie.

## Belangrijke beperking van deze MVP

De gegevens staan alleen in `localStorage` van de gebruikte browser. Er is nog geen account, database of cloudsynchronisatie. Wis je browsergegevens, dan kunnen de opgeslagen trainingen verdwijnen. Exporteer daarom regelmatig je geschiedenis als JSON.

## Voorbeeld van een AI-plan

```json
{
  "workoutName": "Push Day",
  "date": "2026-07-21",
  "exercises": [
    {
      "name": "Bench Press",
      "trackingType": "strength",
      "plannedSets": 3,
      "plannedRepetitions": 8,
      "plannedWeight": 60
    }
  ]
}
```

Cardio-oefeningen gebruiken `"trackingType": "cardio"` en `plannedMinutes`. Oude plannen zonder `trackingType` en plannen met het oudere `loadType`-veld blijven als krachttraining werken.

## Mogelijke volgende stap

De logische volgende technische uitbreiding is cloudopslag en inloggen. Daarna kan een directe AI-API-koppeling worden toegevoegd.

## AI een importeerbaar plan laten maken

Open `AI_PROMPT.txt`, vul onderaan je doel en trainingsinformatie in en plak de volledige prompt in je AI-chat. De AI hoort daarna alleen de JSON terug te geven die je in de app kunt importeren.
