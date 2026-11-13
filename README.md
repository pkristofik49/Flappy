# FLAPPY · PMD 85

Webová pocta logické hře Flappy z PMD 85. Vue 3, Canvas 2D a nativní webová API.
Všech 200 scén a bitmapy postav pocházejí z FLAPPY2k. Podrobnosti a rozdíly od
originálu viz [SOURCES.md](SOURCES.md).

## Spuštění

Vyžaduje Node.js 22+ pouze pro lokální server, kontroly a přípravu publikace.
Není potřeba instalovat žádné npm balíčky.

```sh
git clone https://github.com/pkristofik49/Flappy.git
cd Flappy
git config core.hooksPath .githooks
node tools/serve.mjs
```

Otevři http://127.0.0.1:4173/Flappy/. Alternativně lze kořen projektu obsloužit
libovolným statickým HTTP serverem. Přímé otevření `file://` nepodporuje moduly
ani service worker.

## Hraní

- Úvodní obrazovka z původní pásky: klikni, klepni nebo stiskni mezerník pro spuštění hry.
- Šipky / WASD: pohyb. Mezerník: vystřelit nasbíranou houbu.
- P / Escape: pauza. R: opakovat místnost. Enter: pokračovat.
- Na dotykovém zařízení se zobrazí směrový ovladač a tlačítko střelby.
- Dostaň plné bílé vejce na cílovou podložku. Vejce i kameny padají,
  běžné kameny lze rozbít tlakem proti překážce ze strany nebo shora. Padající předměty drtí obludy
  i hráče. Houba nepřítele dočasně uspí.
- 5 životů, 6 minut na scénu. Odehrané scény se odemykají. Místnost i odemčený
  postup se ukládají do localStorage na konkrétním zařízení/prohlížeči.

## PWA a offline

Po prvním úspěšném načtení přes HTTPS / localhost service worker uloží celou
aplikaci včetně Vue. Další hraní funguje bez sítě. Manifest obsahuje PNG ikony
192/512 px a samostatnou maskovatelnou ikonu. Instalaci nabídne tlačítko, pokud
ji prohlížeč podporuje; v Safari použij Sdílet → Přidat na plochu.

Nový service worker čeká na zavření všech oken staré hry; aktualizace
nepřeruší rozehranou místnost. Cache je označena verzí commitu. Pokrok se při
aktualizaci zachová. Nainstalovaná aplikace potřebuje první otevření online.

## GitHub Pages

Cílová adresa: https://pkristofik49.github.io/Flappy/

Workflow `.github/workflows/pages.yml` ověří zdroje i testy, připraví statický
adresář `dist/` a publikuje jej přes GitHub Pages po pushi do `main`.
V repozitáři musí být **Settings → Pages → Source: GitHub Actions**.
Workflow vyžaduje povolené Actions a oprávnění Pages; všechny aplikační cesty
jsou relativní a fungují pod `/Flappy/`.

```sh
node tools/check.mjs
node --test tests/*.test.mjs
node tools/build.mjs
```

GitHub Actions používají oficiální akce GitHubu pro checkout, Node a publikaci.
Nejsou to závislosti běžící ve hře. Hosting žádný Node server nevyžaduje.

## Jazyky a texty

V hlavičce přepínej **CS / EN**. Výchozí jazyk je čeština jako v projektu
[SMG](https://github.com/pkristofik49/SMG); volba se ukládá do `flappy.language`.
Přepnutí zachová místnost i její stav a okamžitě přeloží otevřené hlášky.
Bez dostupného localStorage funguje volba po dobu aktuální relace.

Veškeré texty aplikace jsou v **`src/translations.js`**. Používají stejné
ploché klíče a parametrické řetězce jako SMG, např. `win.scene` a `{scene}`.
`src/i18n.js` poskytuje překladovou funkci a množné tvary pomocí nativního
`Intl.PluralRules`. Vue vkládá text bezpečně jako text, nepoužívá se `v-html`
ani knihovna pro překlady. Překládají se i ARIA popisky, metadata dokumentu
a informace o instalované PWA. Původní kresba úvodní obrazovky zůstává zachovaná.

Po změně překladů obnov generované statické soubory:

```sh
node tools/localize-static.mjs
node tools/check.mjs
```

Generátor vytvoří český a anglický manifest a aktualizuje výchozí metadata
i dvojjazyčný `noscript` v HTML. Tyto kopie neupravuj ručně; jediným zdrojem
textů je slovník. Kontrola a GitHub Actions odhalí zastaralé generované soubory.
Oba jazyky i manifesty se ukládají do offline cache.

## Zvuk

Zapni tlačítko **Zvuk vypnutý / Sound off** pod herní plochou. Volba se ukládá
do `flappy.sound`. Po opětovném otevření se zvuk zapojí až při interakci hráče,
nikoli automatickým přehráváním při načtení stránky.

`src/audio.js` syntetizuje 11 krátkých obdélníkových efektů ve stylu vestavěného
reproduktoru PMD: krok, posun kamene, rozbití, sebrání houby, výstřel, uspání,
dopad, rozdrcení nepřítele, dokončení scény, smrt a start. Jde o novou zvukovou
rekonstrukci, nikoli nahrávky či přesnou emulaci zvukové rutiny originálu.
Web Audio je součástí prohlížeče; další knihovny ani soubory se zvukem nejsou
potřeba. Vypnutí zvuku zastaví i rozeznělé efekty. Při pauze nebo přepnutí okna
se zvuk zastaví. Hra funguje i při nedostupném nebo blokovaném audio rozhraní.

## Verze při commitu

Jednorázově v každém klonu aktivuj hook:

```sh
git config core.hooksPath .githooks
```

První commit má **1.000**. Každý další commit včetně amend zvyšuje číslo o jeden:
1.001, 1.002, …, 1.999, 2.000. Hook odvozuje číslo z `HEAD:VERSION`, aktualizuje
`VERSION` a `version.js` a přidá je do stejného commitu. Neúspěšný pokus o commit
nespotřebuje další číslo. Verze je zobrazena v patičce vedle názvu hry a určuje
offline cache. Pokud v těchto souborech necháš nestagované změny, hook commit
zastaví, aby nepřepsal práci mimo index.

Hook je verzovaný, ale Git z bezpečnostních důvodů neaktivuje hooky automaticky
po klonování. `npm run prepare` je alternativou k příkazu `git config`.
Commit přes web GitHubu / `--no-verify` hook obchází; pro konzistentní verze
commituj lokálně se zapnutým hookem. Při souběžných větvích se může opakovat
číslo verze; výsledný merge commit dostane číslo o jedno vyšší než lokální HEAD.
