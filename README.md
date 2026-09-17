# Football Value Scanner — Living Install

Dit is de vaste broncode voor de Football Value Scanner van `jorenhillen-ops`.

## Geen nieuwe ZIPs meer nodig

De Windows-installatie controleert bij iedere start automatisch `main` op GitHub. Wanneer er nieuwe code staat, worden alleen de programmabestanden bijgewerkt.

De map `data/` wordt **niet overschreven**. Daardoor blijven lokaal behouden:

- Sportmonks-token
- OddsPapi-key
- bankroll en gespeelde bets in de browser
- lokale historische caches
- odds history
- settlement cache
- team/logo caches

## Starten

Dubbelklik op `START_FOOTBALL_VALUE_SCANNER.bat`.

De site draait standaard op:

`http://localhost:3106`

## Handmatig code bijwerken

Dubbelklik op `CHECK_UPDATE.bat`.

## Data verversen

De server start bij het openen een achtergrondrefresh en gebruikt daarna de refresh-interval uit `data/settings.json`. De code-updater en de voetbaldata-refresh zijn bewust van elkaar gescheiden.

## Veiligheid

`data/*.json`, `node_modules/` en logbestanden staan in `.gitignore`. API-sleutels en lokale gebruikersdata horen dus niet in GitHub.
