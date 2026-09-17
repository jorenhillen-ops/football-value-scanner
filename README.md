# Football Value Scanner — Live Update Channel

Dit is de vaste GitHub-updatebron voor de Football Value Scanner van `jorenhillen-ops`.

## Geen nieuwe ZIPs meer nodig

Je bestaande V14.1-installatie blijft de basis op je pc. Bij iedere start controleert `START_FOOTBALL_VALUE_SCANNER.bat` automatisch de `main` branch. Bestanden die in GitHub nieuw of gewijzigd zijn, worden over je bestaande installatie heen bijgewerkt.

De map `data/` wordt **nooit overschreven**. Daardoor blijven lokaal behouden:

- Sportmonks-token
- OddsPapi-key
- lokale historische caches
- odds history
- settlement cache
- team/logo caches

Bankroll en gespeelde bets staan in de browser/localStorage en blijven eveneens behouden.

## Starten

Dubbelklik op `START_FOOTBALL_VALUE_SCANNER.bat`.

De site draait standaard op `http://localhost:3106`.

## Handmatig code bijwerken

Dubbelklik op `CHECK_UPDATE.bat`.

## Data verversen

De server start bij het openen een achtergrondrefresh en gebruikt daarna de refresh-interval uit `data/settings.json`. Code-updates en voetbaldata-updates zijn bewust van elkaar gescheiden.

## Veiligheid

`data/*.json`, `node_modules/` en logbestanden staan in `.gitignore`. API-sleutels en lokale gebruikersdata horen niet in GitHub.
