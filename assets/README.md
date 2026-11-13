# Herní grafika

`title-screen.png` je původní úvodní obrazovka FLAPPY2k, dekódovaná z pásky
v rozlišení 288 × 256 pixelů. Zobrazuje se po otevření hry. Kliknutí, klepnutí
nebo mezerník spustí místnost; do té doby hra i časomíra stojí.
Obnovení obrázku: `node tools/extract-title.mjs cesta/flappy2k.ptp`.

Grafika je uložená v `game-data.js` jako pole čísel `sprites`, nikoli jako jednotlivé PNG.
Každý bajt obsahuje šest vodorovných pixelů, od nejnižšího bitu doleva doprava.
Snímky mají obvykle 12 × 16 pixelů (32 bajtů). Boční kroky mají 18 × 16 pixelů
(48 bajtů); svislé skoky žáby 12 × 24 pixelů (48 bajtů).

`src/render.js` tyto bitmapy kreslí na Canvas. Boční chůze Flappyho nyní používá
přímo původní snímky; jejich nohy se programově nepřekreslují.

## Obrazový přehled

Otevři [sprites.png](sprites.png). Zobrazuje skutečné animační fáze používané hrou,
zvětšené čtyřikrát bez vyhlazování. Řádky shora:

1. Flappy vlevo — čtyři fáze cyklu, dvě původní bitmapy.
2. Flappy vpravo — čtyři fáze cyklu, dvě původní bitmapy.
3. Flappy nahoru.
4. Flappy dolů.
5. Žába vlevo — postoj / skok.
6. Žába vpravo — postoj / skok.
7. Žába nahoru — postoj / skok.
8. Žába dolů — postoj / skok.
9. Duch vlevo / vpravo.

Přehled je pouze náhled pro prohlížení; hra vykresluje přímo pole bitmap.
Po úpravě snímků ho obnov příkazem `node tools/sprite-sheet.mjs`.

## Extrakce

`tools/extract-assets.mjs` načítá původní bitmapy z pásky FLAPPY2k. Původ a hash
zdroje jsou v [SOURCES.md](../SOURCES.md). Boční Flappy používá tyto adresy
v původním paměťovém obrazu (pixelová data bez předcházejícího atributu barvy):

| Směr | Postoj | Krok |
| --- | --- | --- |
| Vlevo | `0x2534` | `0x2503` |
| Vpravo | `0x244e` | `0x241d` |
