# Football Value Scanner V15 — Adaptive Player Engine

Dit is de **living-install** versie. Nieuwe code gaat naar `main` in GitHub en wordt bij de volgende start automatisch opgehaald. De lokale map `data/` blijft behouden.

## V15 model

De scanner gebruikt nu per competitie een adaptieve pre-match modellering met:

- Poisson scoremodel
- doorlopende Elo-ratings
- multinomiale logistische regressie
- gradient-boosted decision stumps
- begrensde marktprior van referentiebookmakers (Napoleon wordt niet gebruikt om zijn eigen value te bewijzen)
- out-of-fold / walk-forward training om future leakage te vermijden
- automatische componentgewichten op basis van historische Brier Score
- temperature calibration
- model-disagreement en een onzekerheidsrange
- striktere BET/VOORWAARDELIJK-filter wanneer onzekerheid hoog is
- aparte learned ensembles voor Over/Under 2.5 en BTTS, naast score-distributies voor andere goal- en Asian Handicap-markten

## Spelers en opstellingen

Waar jouw Sportmonks-dekking dit toelaat:

- volledige actuele squad per club
- speler-ID, foto, positie, rugnummer en captain-status
- beschikbare seizoensstatistieken per speler
- aparte spelerprofielen
- selectie-impact per speler
- blessures en schorsingen gekoppeld aan spelerimpact
- verwachte opstelling
- bevestigde opstelling
- voetbalveldweergave van formaties
- lineup-shock wanneer verwachte starters ontbreken
- automatische aanpassing van de modelkans bij relevante afwezigen

Ontbrekende speler-/lineupdata wordt nooit ingevuld of geraden.

## Team intelligence

Per ploeg blijven de bestaande historische features beschikbaar, aangevuld met V15 team ratings:

- Elo
- thuis-/uit-aanval
- thuis-/uit-verdediging
- recente vorm
- goals, ruststanden, shots, SOT, corners, fouls en kaarten
- BTTS/O-U-profielen
- opening/closing odds en CLV-context
- huidige stand

## Model Lab

Het Model Lab toont nu onder meer:

- aantal historische pre-match records
- out-of-fold ML sample
- gewichten van Poisson, Elo, Logistic, Gradient Boosting en Market Prior
- Brier Score per component
- Log Loss
- calibration chart
- ROI, hitrate, max drawdown en CLV van de gekozen backtest
- gebruikte featurelijst

## Eigen modeljournal

Iedere live model-snapshot wordt lokaal opgeslagen in `data/prediction-journal-v15.json`. Dit vormt de basis om later ook prestaties van de eigen live voorspellingen per competitie/markt te analyseren en opnieuw te trainen. Dit bestand blijft lokaal en gaat niet naar GitHub.

## Spelers vooraf synchroniseren

Ga naar **Clubs & Data**, kies een competitie en klik op **♟ Spelers sync**. De server slaat beschikbare squads 12 uur lokaal op. Bij live wedstrijden probeert V15 daarnaast automatisch een beperkt aantal relevante teamprofielen te laden zodat spelerimpact kan worden gebruikt zonder alle clubs handmatig te openen.

## Starten

Dubbelklik op `START_FOOTBALL_VALUE_SCANNER.bat`.

De site opent op `http://localhost:3106`.

## Privacy / API keys

`data/*.json` is uitgesloten van GitHub. Sportmonks- en OddsPapi-keys blijven alleen op de lokale pc in `data/settings.json`.
