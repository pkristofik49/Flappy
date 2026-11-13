# Původ dat a grafiky

Nový režim **Moderní barevný** používá samostatné AI generované ilustrace
v `assets/modern-sprites.png` (vestavěný imagegen). Přesný prompt a pořadí
snímků jsou v `assets/modern-mole-prompt.txt` a `assets/README.md`. Jde o novou
grafiku tohoto projektu, která nenahrazuje historická data.
Režim **Originál barevný** obarvuje stávající bitmapy paletou zvolenou pro web.
Barevné varianty PMD jsou doložené na [stránce autora FLAPPY2k](https://www.pmd85.cz/?page_id=965);
webové obarvení není emulací konkrétního hardwarového barevného režimu.

Webová implementace vzdává hold hře **Flappy** pro PMD 85 (VBG Software, 1987;
Vlastimil Veselý, Libor Bedrlík a Ladislav Gavar). Původní koncept Flappy:
Shoichi Shibata a Kazuyuki Okujama / dB-SOFT.

Bitmapy postav a všech 200 scén jsou extrahovány z PMD pásky **FLAPPY2k Remaster
Edition** (Libor Lasota, 2019), která zachovává původní PMD grafiku a v některých
scénách používá variantu Sharp MZ. Jde tedy o data remasteru, nikoli tvrzení
o přesné kopii každého bajtu vydání z roku 1987.

- Stránka autora: https://www.pmd85.cz/?page_id=965
- Zdrojová páska: https://www.pmd85.cz/wp-content/uploads/flappy2k.zip
- SHA256 souboru `flappy2k.ptp`:
  `3a4b46736ed194494493f6f433aae0d16f1c19dbcce8a4e180003cd898bfdd1b`
- Další historické podklady: https://pmd85.borik.net/wiki/Download

Reprodukovatelná extrakce: `node tools/extract-assets.mjs cesta/flappy2k.ptp`.
Importují se pouze bitmapy a souřadnice scén, žádný strojový kód. Není přibalen
emulátor ani cizí herní engine. Práva k původnímu dílu zůstávají jeho autorům;
tento projekt nedává původním herním datům novou licenci.

Herní mechanismy jsou nově implementovány: nejde o emulaci instrukcí PMD 85.
Rychlost, AI nepřátel, střelba a okrajové kolize se mohou od originálu lišit.
Zdivo, houby a cílová podložka jsou vykresleny znovu ve stejné pixelové mřížce.
Cílové vejce má zachovaný původní obrys, ale plnou bílou výplň, aby se v
černobílém zobrazení jasně odlišilo od tečkovaných běžných kamenů. Bitmapy
vejce a kamene v remasteru jsou stejné; samotný barevný rozdíl se do ČB nepřenáší.
Chůze vlevo a vpravo střídá původní klidové a rozšířené krokové bitmapy PMD
bez programových úprav nohou. Chůze dolů používá původní čelní snímky a jednu
odvozenou fázi; fáze chůze nahoru jsou odvozené z původní zadní bitmapy.
Animace běží pouze při úspěšném pohybu. Přehled grafiky a jejího uložení
je v `assets/README.md`, obrazový náhled v `assets/sprites.png`.
Žába používá osm původních bitmap: klidový postoj a fázi skoku pro každý ze
čtyř směrů. Rozšířené skokové snímky se vykreslují v původní velikosti
12 × 24 nebo 18 × 16 pixelů; kolizní rozměry zůstávají stejné.
Rozdrcení nepřátelé používají původní zploštělé bitmapy 12 × 8 pixelů:
duch na adrese `0x2731`, žába `0x2952` v paměťovém obrazu FLAPPY2k.
Zůstávají viditelní 600 ms herního času; padající předmět po jejich zmizení
pokračuje dolů. Jde o novou implementaci časování, nikoli emulaci originálu.
Zmáčknutý Flappy používá další původní bitmapu 12 × 8 pixelů na adrese
`0x25db`. Zobrazuje se v dolní polovině postavy po střetu s nepřítelem nebo
pádu kamene či vejce; smrtelný předmět sestoupí nad tělo. Moderní režim zploští
příslušný směrový sprite krtka. Prodleva před dalším životem či koncem hry je
720 ms a zastaví se při pauze. Jde o nové časování webové implementace.
Úvodní obrazovka `assets/title-screen.png` je z původního Flappy od VBG Software
(1987), podle výslovného výběru uživatele. Jde o beze změn uložený obrázek
[Vbg_flappy_3.png z PMD 85 Infoserveru](https://pmd85.borik.net/w/images/b/bc/Vbg_flappy_3.png)
v rozlišení 288 × 256 pixelů. SHA256 PNG:
`338fec4330284911c478b7499b1fe0a4fcd95f66593dbac3950452632b6f9439`.

Rozložení životů, sektoru a času v horním zdivu vychází z uživatelem zadaného
[snímku původní herní plochy](https://pmd85.borik.net/w/images/5/54/Vbg_flappy_2.png).
Ukazatele jsou součástí herního Canvasu, s pixelovým písmem na mřížce 6 × 8
a původními bitmapami postavy. Nástup života otevírá dvě buňky horní stěny,
nechá Flappyho sestoupit z řady a průchod znovu uzavře. Časování je nově
implementované; herní souřadnice a data všech 200 scén se nemění.
Přechod mezi sektory nově napodobuje popsané chování originálu: bliknutí
Flappyho, zaplnění místnosti zdivem a odkrytí další scény. Délky fází a
vykreslování jsou implementovány pro web, nejde o emulaci původní rutiny PMD.

Jediná knihovna aplikace je uživatelem požadované **Vue 3.5.13**, uloženo lokálně
v `vendor/vue.esm-browser.prod.js`. Licence MIT: `vendor/VUE-LICENSE.txt`.
Žádné CDN, fontové služby, analytika ani jiné knihovny nejsou použity.

## Zvukové podklady

[Stránka autora FLAPPY2k](https://www.pmd85.cz/?page_id=965) uvádí podporu hudby
i zvuků přes vestavěný akustický měnič PMD 85. Komentáře autora a testerů
potvrzují herní zvukové efekty; hudební doprovod patří k úvodnímu menu.
Webová verze má nově syntetizované krátké obdélníkové efekty přes nativní
Web Audio (`src/audio.js`). Nejde o vzorky z původní hry ani o shodný výstup
jejího strojového kódu. Hudba z menu remasteru nebyla převzata.
