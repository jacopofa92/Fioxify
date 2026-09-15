# App Android (APK)

L'app Android è un guscio **Capacitor**: una WebView nativa che carica
`https://jacopofa92.github.io/Fioxify/`, come già fatto per YuGiOh Duel Arena.
Non contiene una copia del sito, quindi **ogni push su GitHub Pages aggiorna anche
l'app**, senza ricompilare né reinstallare nulla.

Essendo una WebView normale e non una Custom Tab di Chrome, **non mostra alcuna
barra degli indirizzi** e non serve nessuna verifica Digital Asset Links.

## Dove sta il progetto

Il progetto vive **fuori da questo repo**, in `C:\AndroidDev\FioxifyAndroidProd`.
Deve restare fuori perché questo repo è pubblicato su GitHub Pages: la chiave di
firma sarebbe scaricabile da chiunque.

| Cosa | Dove |
| --- | --- |
| Progetto Capacitor | `C:\AndroidDev\FioxifyAndroidProd` |
| APK firmato | `android\app\build\outputs\apk\release\app-release.apk` |
| Chiave di firma | `fioxify.keystore` nella root del progetto (alias `fioxify`) |
| URL caricato | `capacitor.config.json` → `server.url` |

**La chiave di firma va conservata e salvata altrove.** Se la perdi non puoi più
pubblicare aggiornamenti della stessa app: Android li rifiuterebbe come app diversa.
Password e alias sono già scritti in `android\app\build.gradle` (il progetto è
locale, non finisce online).

## Ricompilare

```powershell
cd C:\AndroidDev\FioxifyAndroidProd\android
$env:JAVA_HOME = "C:\AndroidDev\jdk21"
.\gradlew.bat assembleRelease
```

Serve solo per cambiare icona, nome, URL o versione: per le modifiche al sito
basta il push.

Per pubblicare un aggiornamento sul Play Store va alzato `versionCode` in
`android\app\build.gradle` (e di solito anche `versionName`).

## Pulsante "Esci"

Nel browser `window.close()` è consentita solo sulle finestre aperte via script,
quindi il pulsante può solo suggerire di chiudere la scheda a mano. Dentro l'APK
invece l'app si può chiudere davvero, tramite il plugin `@capacitor/app`.

Funziona anche caricando il sito remoto: Capacitor intercetta le risposte HTML
(`handleProxyRequest` in `WebViewLocalServer`) e vi inietta il bridge nativo,
quindi `window.Capacitor.Plugins.App` esiste anche se la pagina arriva da
GitHub Pages. `app.js` prova quella strada e, se non c'è, ricade sul
comportamento da browser.

Attenzione: la parte nativa sta nell'APK, ma il codice che la usa sta in
`app.js`, cioè **online**. Finché il sito non viene aggiornato, il pulsante
continua a comportarsi come nel browser anche dentro l'app.

## Icone

`icons/icon-512.png` ha gli **angoli bianchi opachi** (non trasparenti). Va bene
come icona normale, ma non come icona *maskable*: Android 8+ ritaglia l'icona a
cerchio o squircle, e quel bianco spunta tutt'attorno al logo.

Per questo esiste `icons/icon-maskable-512.png`: stesso logo, ma con il fondo
scuro esteso a tutto campo e il logo dentro la "zona di sicurezza" (il 66%
centrale, l'unica parte che ogni launcher garantisce di non tagliare). È quella
che il manifest del sito dichiara come `purpose: maskable`.

Nel progetto Android le icone sono state rigenerate dalla stessa immagine
(`mipmap-*/ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`)
e il colore `ic_launcher_background` è stato portato da `#FFFFFF` a `#0A0C10`.
`npx cap sync` non le tocca, ma un `npx cap add android` rifatto da zero sì.

## Nota sulla riproduzione in background

Sotto c'è una WebView, non Chrome: l'audio continua quando l'app va in secondo
piano, ma non ci sono di serie i controlli su schermata di blocco e notifica, e
senza un servizio in foreground il sistema può chiudere l'app sotto pressione di
memoria. Si risolve lato sito, dichiarando i metadati del brano con l'API
`navigator.mediaSession` (supportata anche in WebView): Android mostra allora i
controlli media e tratta l'app come riproduzione attiva.
