# Herní grafika

## Moderní barevný režim

[modern-sprites.png](modern-sprites.png) je samostatný atlas 1254 × 1254 pixelů
s průhledným pozadím. Nová grafika vznikla vestavěným nástrojem **imagegen**;
přesný prompt úpravy na krtka je uložen v [modern-mole-prompt.txt](modern-mole-prompt.txt).
PNG je uložený beze změn, včetně alfa kanálu. Nejde o bitmapy z historické hry.

Atlas má 4 × 4 buňky. Jejich pořadí zleva doprava:

| Řádek | Snímky |
| --- | --- |
| 1 | Krtek vlevo postoj / krok, vpravo postoj / krok |
| 2 | Krtek dolů postoj / krok, nahoru postoj / krok |
| 3 | Žába vlevo, vpravo, dolů, nahoru |
| 4 | Duch vlevo, hladké vejce, kámen, houba |

`src/graphics.js` ořízne při načtení pouze průhledné okraje buněk pro vykreslení;
zdrojové PNG nemění. Duch se zrcadlí při pohybu doprava, skoky žáby používají
její směrové snímky a krátké zvednutí. Mrtvolka používá zploštění příslušného
spritu. Krtek s růžovým čumákem a hrabavými tlapkami střídá dva kreslené snímky
pro každý směr; zadní pohled ukazuje záda bez obličeje.
Moderní režim renderuje plochu v rozlišení 960 × 800 se zachováním stejné
herní mřížky a kolizí. Zdivo je kreslené přes Canvas jako červené cihly ve dvou
řadách na buňku, s půlcihlovým posunem svislých spár a světlou horní hranou.

## Původní režimy

`title-screen.png` je původní úvodní obrazovka Flappy od VBG Software (1987),
stažená beze změn ze [souboru Vbg_flappy_3.png na PMD 85 Infoserveru](https://pmd85.borik.net/w/images/b/bc/Vbg_flappy_3.png).
Má rozlišení 288 × 256 pixelů. Zobrazuje se po otevření hry; výzva ke spuštění
je pod obrázkem, aby nezakrývala jeho kresbu ani autorské údaje.
Kliknutí, klepnutí nebo mezerník spustí místnost; do té doby hra i časomíra stojí.

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
10. Rozdrcený duch / žába — původní zploštělé bitmapy 12 × 8 pixelů.
11. Zmáčknutý Flappy — původní bitmapa 12 × 8 pixelů na adrese `0x25db`.

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
