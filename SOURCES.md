# Původ dat a grafiky

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

Jediná knihovna aplikace je uživatelem požadované **Vue 3.5.13**, uloženo lokálně
v `vendor/vue.esm-browser.prod.js`. Licence MIT: `vendor/VUE-LICENSE.txt`.
Žádné CDN, fontové služby, analytika ani jiné knihovny nejsou použity.
