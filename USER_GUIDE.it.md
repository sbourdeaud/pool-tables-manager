# Pool Tables Manager - Guida utente

## Benvenuti in Pool Tables Manager

Pool Tables Manager è una soluzione completa per gestire le attività di una sala biliardo. Questa guida ti aiuterà a conoscere e utilizzare tutte le funzionalità disponibili nell’applicazione.

---

## Per iniziare

### Accedere all’applicazione

Apri il browser e vai a `http://localhost:3000` (o all’indirizzo del tuo server).

Al primo accesso ti verrà chiesto di definire la password dell’amministratore locale (oppure di accedere se è già configurata una password o OIDC). Dopo l’accesso, la dashboard mostra tutti i tavoli organizzati per tipo.

### Menu principale

L’intestazione contiene tre voci, oltre al selettore del tema e al pulsante per uscire:

- **Dashboard** - Tavoli, sessioni e ordini in sospeso in tempo reale
- **Admin** - Menù, inventario dei tavoli, abbonamenti, report e impostazioni
- **Stato pubblico** - Apre in una nuova scheda il pannello di disponibilità visibile ai clienti (non serve accedere)
- **Aiuto** - Guida utente integrata (questo documento) con indice; include un link al riferimento API
- **Selettore della lingua** - Disponibile nell’intestazione (desktop), in Impostazioni → Localizzazione e prezzi, nella pagina del tavolo per i giocatori e nel pannello di stato pubblico. La scelta viene ricordata sul dispositivo; i nomi delle bevande seguono le traduzioni del menù (attualmente inglese/francese)
- **Esci** (in alto a destra) - Termina la sessione amministrativa. Se OIDC è abilitato, termina anche la sessione del provider di identità, quando supportato; verrai riportato alla pagina di accesso

---

## Panoramica della Dashboard

La dashboard è il centro di controllo per la gestione di tutti i tavoli.

### Visualizzazione dei tavoli

I tavoli sono raggruppati per tipo (americano, pool, snooker, francese, …), con bandierine e riquadri colorati:
- **Riquadri verdi** = Tavoli disponibili
- **Riquadri rossi** = Sessioni attive
- I tavoli in manutenzione sono nascosti dalla dashboard (gestiscili in Admin → Tipi di tavolo e inventario)

Sono disponibili due layout (da scegliere in **Impostazioni → Layout dashboard**):

- **Sezioni** (predefinito) — tutti i tipi sono mostrati in gruppi comprimibili. Una fila di **bandierine in alto** permette di raggiungere (ed espandere) un tipo; usa la freccia sul gruppo per comprimerlo. Lo stato compresso viene ricordato su questo dispositivo.
- **Schede** — un tipo di tavolo per scheda; trascina la **maniglia di trascinamento** accanto a una scheda per riordinare le schede.

In entrambi i layout puoi riordinare i gruppi dei tipi di tavolo: in modalità Sezioni trascina la **maniglia ⋮⋮** a sinistra dell’intestazione del gruppo. L’ordine viene salvato per tutti i dispositivi del personale ed è utilizzato anche dal pannello di stato pubblico.

### Informazioni sui tavoli

Ogni riquadro mostra:
- Numero e tipo del tavolo
- PIN della sessione (quando attiva) - mostrato accanto al numero del tavolo, ad es. «#5 (1234)»
- Durata della sessione in corso
- Numero attuale di giocatori
- Totale del conto (addebiti progressivi)
- Pulsanti di azione rapida

### Azioni rapide

**Tavoli disponibili:**
- **Avvia sessione** - Inizia una nuova sessione
- **Manutenzione** - Metti il tavolo fuori servizio (azzera il contatore di utilizzo quando lo rimetti in servizio)

**Tavoli attivi:**
- **Bevanda** - Aggiungi bevande al conto (raggruppate per categoria del menù)
- **Trasferisci** - Sposta la sessione su un altro tavolo
- **Incassa** - Applica uno sconto, stampa il riepilogo del conto, completa il pagamento e stampa la fattura
- **−** accanto al numero di giocatori - Saldo del giocatore (un giocatore paga la propria quota e se ne va)
- **+** - Aggiungi un giocatore — chiede se è abbonato (influisce sullo sconto)
- **Miniatura QR** - Ingrandisce il codice QR per i giocatori

---

## Avviare una sessione

1. Fai clic su **▶ Avvia** su un tavolo disponibile
2. Imposta il numero di giocatori (predefinito: 1)
3. (Facoltativo) Seleziona gli abbonati dall’elenco
   - Gli abbonati ricevono sconti quando giocano; sono ammesse **sessioni con soli abbonati** (0 non abbonati), con tempo tavolo gratuito
   - È richiesto almeno un giocatore, abbonato o meno
4. Fai clic su **Avvia sessione**

**Cosa succede:**
- Viene generato un PIN univoco di 4 cifre per la sessione
- Il tavolo viene contrassegnato come occupato
- Gli addebiti iniziano ad accumularsi in base al tempo trascorso
- Il PIN viene mostrato sul riquadro del tavolo, così i giocatori possono accedere al conto

---

## Gestire le sessioni attive

### Aggiornamenti in tempo reale

Le sessioni attive mostrano:
- **Durata** - Si aggiorna ogni secondo (ad es. «1h 23m 45s»)
- **Ore addebitate** - Arrotondate per eccesso all’ora successiva
- **Totale del conto** - Costo del tavolo + addebiti degli articoli

### Addebiti dei tavoli

Gli addebiti sono calcolati a ore in base al tipo di tavolo:
- **Pool americano:** €30/ora
- **Pool:** €25/ora
- **Snooker:** €40/ora
- **Biliardo francese:** €35/ora

Il tempo viene sempre arrotondato per eccesso all’ora successiva (ad es. 1 ora e 1 minuto = 2 ore addebitate).

### Sconti per abbonati

Quando gli abbonati giocano con persone non abbonate:
- **Predefinito:** sconto del 50% sul costo del tavolo
- **Tutti abbonati:** nessun addebito
- **Nessun abbonato:** prezzo intero

*La percentuale di sconto può essere modificata in Impostazioni.*

---

## Aggiungere articoli ai conti

### Aggiungere rapidamente bevande

1. Fai clic su **Bevanda** nel riquadro di un tavolo attivo
2. Sfoglia il menù delle bevande — usa le **etichette delle categorie** (Fredde / Calde / Alcoliche) e la **casella di ricerca** per trovare rapidamente gli articoli
3. Usa i pulsanti **+** e **-** per selezionare le quantità
4. Fai clic su **Aggiungi al conto**

### Addebiti personalizzati

Dai dettagli della sessione:
1. Fai clic sul tavolo attivo per visualizzare i dettagli
2. Scorri fino a «Aggiungi addebito personalizzato»
3. Inserisci la descrizione e l’importo
4. Fai clic su **Aggiungi addebito**

**Casi d’uso:**
- Alimenti
- Noleggio attrezzatura
- Costi speciali
- Servizi aggiuntivi

---

## Ordini in sospeso (self-service per i giocatori)

I giocatori possono ordinare da soli le bevande dal [pannello del tavolo pubblico](#public-table-view) sul proprio telefono, senza che il personale debba raggiungerli per raccogliere l’ordine.

### Come funziona

1. Un giocatore apre la pagina specifica del tavolo, inserisce il **PIN** del tavolo e seleziona le bevande dal menù.
2. L’ordine viene inviato e appare immediatamente sulla dashboard principale, in una nuova sezione **«Ordini in sospeso»** in cima alla schermata, sopra la griglia dei tavoli.
3. Ogni volta che arriva un nuovo ordine, sulla dashboard amministrativa viene riprodotto un segnale acustico («Triangolo brillante»), così il personale non deve controllare continuamente lo schermo.
4. Ogni ordine in sospeso mostra il numero del tavolo, gli articoli ordinati e il totale.
5. Il personale controlla l’ordine e fa clic su **✓ Servito** dopo aver consegnato le bevande.
6. Al momento della conferma, gli articoli dell’ordine vengono aggiunti automaticamente al conto del tavolo: non serve reinserirli manualmente.

**Sicurezza:** il PIN impedisce ad altri giocatori, o a chi non è al tavolo, di effettuare ordini sul conto.

**Segnali audio:** il segnale acustico all’arrivo di un ordine rispetta l’impostazione **Segnali audio** nella pagina Impostazioni.

---

## Saldi dei giocatori

Quando un giocatore vuole andare via mentre gli altri continuano a giocare:

1. Fai clic su **🧾 Salda** nel riquadro del tavolo
2. Controlla il conto attuale e il costo del tavolo
3. **Seleziona l’opzione per il costo del tavolo:**
   - **Quota del giocatore** - Divisione equa tra i giocatori iniziali
   - **Costo intero del tavolo** - Il giocatore paga l’intero costo del tavolo
   - **Salta il costo del tavolo** - Paga solo gli articoli

4. **Seleziona gli articoli:**
   - Usa i selettori della quantità per scegliere gli articoli consumati dal giocatore
   - Puoi saldare quantità parziali (ad es. 1 birra su 3)

5. Fai clic su **💰 Salda**

**Cosa succede:**
- Gli articoli selezionati vengono rimossi dal conto o la relativa quantità viene ridotta
- Il numero di giocatori diminuisce di 1
- La schermata dei giocatori rimasti si aggiorna automaticamente
- È possibile stampare una ricevuta

**Importante:** gli importi del saldo si basano sul costo *originario* del tavolo, prima di eventuali saldi precedenti.

---

## Terminare le sessioni (incasso)

Quando tutti i giocatori hanno finito:

1. Fai clic su **✓ Incassa** nel riquadro del tavolo
2. Controlla gli addebiti finali:
   - Costo del tavolo (in base alla durata totale)
   - Tutti gli articoli sul conto
   - Eventuali saldi precedenti (indicati come detrazioni)
3. **Facoltativo:** fai clic su **🖨 Stampa ricevuta** per una copia cartacea
4. Fai clic su **Termina sessione** per completare

**Cosa succede:**
- Viene calcolato il totale finale
- La sessione viene contrassegnata come completata
- Il tavolo diventa disponibile per la sessione successiva
- I dati vengono salvati per i report

---

## Abbonamenti

### Cosa sono gli abbonamenti?

Gli abbonamenti sono tessere prepagate che offrono sconti sul costo dei tavoli.

### Visualizzare gli abbonamenti

1. Apri il menu (☰)
2. Fai clic su **Abbonamenti**
3. Visualizza tutti gli abbonamenti attivi con:
   - Nome del giocatore
   - Data di inizio
   - Data di scadenza
   - Stato attuale

### Usare gli abbonamenti

Quando avvii una sessione:
1. Imposta il numero di giocatori
2. Seleziona le caselle accanto ai nomi degli abbonati
3. Il sistema applica automaticamente lo sconto

**Vantaggi:**
- Costi dei tavoli ridotti o azzerati
- Utilizzo tracciato per le analisi
- Incentivo per i clienti abituali

---

## Pannello pubblico del tavolo

I giocatori possono vedere il proprio conto in tempo reale da qualsiasi dispositivo e ordinare autonomamente le bevande.

### Accedere alla pagina del tavolo

**Formato URL:** `http://[server]/table.html?number=[table_number]`

Esempio: `http://localhost:3000/table.html?number=5`

### Primo accesso

1. Il giocatore apre l’URL
2. Inserisce il PIN di 4 cifre (visualizzato sulla dashboard)
3. Il PIN viene salvato per la sessione

### Cosa vedono i giocatori

- Numero e tipo del tavolo
- Durata attuale
- Numero di giocatori
- Tutti gli articoli sul conto, con quantità e prezzi
- Costo del tavolo (ore e importo)
- Totale progressivo
- Un menù di bevande da cui ordinare direttamente (è richiesto il PIN) — vedi [Ordini in sospeso](#pending-orders-player-self-service)

**Aggiornamento automatico:** la schermata si aggiorna automaticamente (circa ogni 10 secondi e subito quando si torna alla scheda), così gli ordini serviti e le modifiche al conto vengono visualizzati rapidamente.

### Codici QR

Ogni riquadro di un tavolo attivo sulla dashboard mostra un **codice QR** che rimanda direttamente alla pagina del tavolo con il PIN già inserito. In questo modo il giocatore può scansionarlo con la fotocamera del telefono per controllare la sessione, senza dover digitare manualmente URL o PIN. Fai clic sul codice QR nella dashboard per ingrandirlo (utile per stamparlo o mostrarlo al tavolo).

**Impostare il nome host usato nei codici QR:** per impostazione predefinita, i codici QR puntano all’indirizzo utilizzato dal browser per aprire la dashboard amministrativa (ad es. `http://localhost:3000`), che funziona solo sullo stesso computer. Per rendere i codici QR scansionabili dai telefoni dei giocatori, imposta **URL base pubblica** in Admin → Impostazioni con il nome host/IP o FQDN raggiungibile dai loro telefoni, ad esempio `http://[IP_ADDRESS]:3000` oppure `https://pool.example.com`. Lascialo vuoto per utilizzare l’indirizzo attuale del browser.

---

## Funzionalità Admin

Accedi da menu (☰) → **Pannello Admin**

### Tipi di tavolo e inventario

**Gestire i tipi di tavolo:**
- Aggiungi nuovi tipi di tavolo (ad es. «Biliardo», «Carambola»)
- Imposta le tariffe orarie nella valuta desiderata
- Imposta l’**aliquota IVA** applicata al tempo di utilizzo di quel tipo di tavolo (20%, 10% o 0% — vedi [Report IVA (TVA)](#vat-tva-reporting--france))
- Modifica o elimina i tipi esistenti

**Gestire i tavoli:**
- **Aggiungi tavoli:** specifica una quantità per crearne più di uno alla volta (numerazione progressiva automatica)
- **Rinumera:** fai clic sulla **matita** accanto al numero di un tavolo, digita il nuovo numero e premi Invio (se il numero è già utilizzato viene rifiutato con un messaggio esplicativo)
- **Elimina tavoli:** rimuovi i tavoli inutilizzati
- **Attiva la modalità manutenzione:** disabilita temporaneamente i tavoli; quando un tavolo torna in servizio, il contatore di utilizzo dall’ultima manutenzione viene azzerato
- **Riordina i tipi:** usa i pulsanti **↑/↓** su ogni tipo per modificare l’ordine nella dashboard, nelle schede/navigazione con bandierine della dashboard e nel pannello di stato pubblico

**Operazioni in blocco:**
- Aggiungi più tavoli dello stesso tipo (da 1 a 50 alla volta)
- Ai tavoli vengono assegnati automaticamente i numeri disponibili successivi

### Gestione del menù delle bevande

1. Fai clic su **Menù bevande**
2. **Aggiungi un nuovo articolo:**
   - Nome
   - Prezzo
   - Aliquota IVA (20% standard, 10% ridotta o 0% esente — vedi [Report IVA (TVA)](#vat-tva-reporting--france))
   - **Categoria** — Fredde, Calde, Alcoliche, Altro (o nessuna). Le categorie raggruppano il menù nella schermata d’ordine dei giocatori e nella finestra «Aggiungi bevanda» della dashboard.
3. **Modifica/Elimina:** usa i pulsanti con la matita e il cestino accanto a ogni articolo

**Supporto multilingue:**
- Gli articoli possono avere nomi in inglese e francese
- La lingua di visualizzazione può essere modificata in Impostazioni

### Cassa e pagamenti (POS facoltativo)

I pagamenti sono **disattivati per impostazione predefinita**. Attivali in **Impostazioni → Generale → «Pagamenti (POS)»** (per i terminali di pagamento con carta, vedi anche [Configurare i pagamenti con carta](#setting-up-card-payments-administrator)).

Una volta attivati:

- **Incasso**: il pagamento viene riscosso prima dell’emissione della fattura:
  - **Contanti:** inserisci l’importo ricevuto e fai clic su **Aggiungi pagamento** (il resto viene mostrato). Usa **Importo esatto** per pagare esattamente il saldo rimanente.
  - **Carta (terminale):** fai clic su **Carta (terminale) — €X**. Viene mostrato il messaggio «Presentare la carta sul terminale…»; il cliente avvicina o inserisce la carta e il pagamento viene aggiunto automaticamente. **Annulla** interrompe l’operazione sul terminale.
  - **Pagamenti misti:** aggiungi più pagamenti (in contanti e/o con carta) finché il saldo rimanente non è zero. **Completa incasso** è disponibile solo quando il conto è interamente pagato.
  - Gli sconti vengono bloccati dopo l’aggiunta di un pagamento (per evitare variazioni degli importi).
- **Ricevute** (a schermo e sulla fattura stampata): indicano il metodo o i metodi di pagamento e l’eventuale resto dovuto.
- **Admin → Cassa e pagamenti** (visibile solo quando la funzione è attiva):
  - **Turno di cassa:** apri un turno con un fondo cassa iniziale all’inizio della giornata; alla chiusura inserisci il contante contato — il totale atteso (fondo iniziale + contanti netti) e la **differenza** vengono calcolati. Se la differenza non è zero, viene inviata un’email all’indirizzo di manutenzione configurato (se SMTP è impostato).
  - **Rimborsi:** per ogni pagamento, con importo (sono ammessi rimborsi parziali) e motivo facoltativo. Il rimborso di un pagamento fatturato genera una **nota di credito (avoir)** numerata; il messaggio mostra il numero.
  - **Note di credito:** sono elencate con un pulsante **Stampa** (aggiunge il riferimento alla ricevuta originale e il dettaglio IVA; salvale come PDF dalla finestra di stampa).
  - **Chiusura giornata e riconciliazione:** scegli una data per visualizzare i pagamenti per metodo, le note di credito e il contante atteso/contato/differenza; **Esporta CSV** scarica il registro dei pagamenti; **Chiudi giornata** blocca la giornata (l’operazione viene rifiutata se è aperto un turno di cassa).
- **Report → Finanziario** mostra le righe **Pagato in contanti/con carta** e **Rimborsi (note di credito)** (anche nelle esportazioni PDF ed Excel). Il report **IVA / TVA** sottrae le note di credito e mostra la categoria *Rimborsi (note di credito)*.

### Impostazioni

Accedi da menu (☰) → **Impostazioni**

**Impostazioni disponibili:**

- **Nome applicazione:** nome visualizzato nell’intestazione (ad es. «Sala biliardo di Joe»)
- **URL base pubblica:** nome host/IP o FQDN usato per generare i codici QR dei tavoli (vedi [Codici QR](#qr-codes)); lascia vuoto per usare l’indirizzo da cui stai navigando
- **Layout dashboard:** Sezioni (gruppi comprimibili + navigazione con bandierine) oppure Schede (un tipo per scheda)
- **Lingua:** English, Français, Deutsch, Español o Italiano — cambia l’interfaccia su questo dispositivo (selezionabile anche dall’intestazione, dalla pagina del tavolo per i giocatori e dal pannello di stato pubblico)
- **Valuta:** $ (USD), € (EUR) o £ (GBP)
- **Sconto abbonati:** percentuale di sconto (0-100%)
- **Segnali audio:** attiva o disattiva i suoni dei clic nell’interfaccia e il segnale acustico dei nuovi ordini
- **Informazioni fiscali / legali:** ragione sociale, SIRET, SIREN, numero IVA intracomunitario, sede legale, regime IVA e periodicità della dichiarazione — utilizzate nel report IVA e conservate per i tuoi archivi (vedi [Report IVA (TVA)](#vat-tva-reporting--france))

**Zona pericolosa:**
- **Cancella tutto lo storico delle sessioni:** elimina definitivamente le sessioni completate
  - Richiede una doppia conferma
  - Le sessioni attive NON sono interessate
  - Anche le sessioni comprese in un **periodo IVA chiuso** sono protette e non verranno eliminate

---

## Configurare i pagamenti con carta (amministratore)

### Cosa serve

- L’applicazione in esecuzione (Docker) su una macchina con accesso a Internet.
- Un **account Stripe** (dati aziendali verificati). Inizia in **modalità di test**.
- Un **lettore Stripe Terminal** (ad es. WisePOS E) associato al Wi‑Fi del locale — oppure, per i test, un **lettore simulato** Stripe.
- **Stripe deve poter raggiungere** il server all’indirizzo `https://<your-domain>/api/webhooks/stripe` (HTTPS pubblico, reverse proxy o tunnel durante la fase pilota). L’applicazione può rimanere su HTTP all’interno della LAN.
- I locali che accettano solo contanti non hanno bisogno di nulla di tutto questo: basta attivare Pagamenti e usare i contanti.

### Procedura

1. **Stripe (modalità di test)**
   - Associa/registra il lettore (Dashboard → Terminal → Readers); annota il suo ID (`tmr_…`).
   - Developers → Webhooks → aggiungi `https://<your-domain>/api/webhooks/stripe` con gli eventi `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`; copia il segreto di firma (`whsec_…`).
2. **Configurazione del server** (ambiente compose / `.env`), poi riavvia (`docker compose up -d`):
   - `STRIPE_SECRET_KEY=sk_test_…` (in seguito la chiave live)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true` quando l’app è servita tramite HTTPS
3. **Impostazioni dell’app**
   - Attiva **Impostazioni → Generale → «Pagamenti (POS)»**.
   - La valuta deve essere `€`, `$` o `£` (inviata a Stripe come eur/usd/gbp).
   - Imposta il nome dell’applicazione e le informazioni fiscali/legali (utilizzate nei report e nei tuoi archivi).
   - Facoltativo: impostazioni SMTP e indirizzo email per gli avvisi di manutenzione in caso di differenze di cassa.
4. **Test senza acquistare hardware**
   - Imposta `PAYMENT_PROVIDER=fake` nell’ambiente: i pagamenti vengono acquisiti immediatamente (senza terminale né rete) — ideale per formazione e test dell’interfaccia.
   - Oppure usa Stripe in modalità di test con un **lettore simulato** per provare il flusso reale di pagamento con carta.
5. **Lista di controllo prima di avviare la fase pilota**
   - Vendita in contanti con pagamento misto e resto; vendita con carta; carta rifiutata e nuovo tentativo; annullamento sul terminale; rimborso parziale (stampa la nota di credito); chiusura del turno; chiusura della giornata ed esportazione del CSV.
   - Passa alle chiavi live di Stripe solo dopo aver superato la fase pilota.

### Risoluzione dei problemi e operazioni

- **Il webhook non arriva** (il terminale indica il pagamento come effettuato, ma l’app continua a mostrare «presentazione»): controlla l’URL dell’endpoint, il segreto di firma e le sottoscrizioni agli eventi; l’app controlla anche lo stato del pagamento e sincronizza di nuovo i pagamenti con carta non aggiornati ogni volta che viene caricata la pagina Cassa. Se il pagamento è stato abbandonato, fai clic su **Annulla** accanto al pagamento in Admin → Cassa e pagamenti.
- **I totali del terminale e dell’app non coincidono** nel riquadro di chiusura giornata: la riga «Terminale (Stripe)» proviene dalle transazioni del saldo Stripe (lordo meno rimborsi, più le commissioni indicate). Controlla le commissioni visualizzate, i rimborsi nella dashboard Stripe e che il limite della giornata corrisponda al giorno contabile. La riga è visibile solo quando i dati di liquidazione Stripe sono disponibili.
- **Disattivare rapidamente i pagamenti:** disattiva **Impostazioni → Generale → «Pagamenti (POS)»** — l’incasso torna al comportamento precedente al POS, le opzioni carta scompaiono e la pagina Cassa viene nascosta. Le ricevute, le note di credito e lo storico esistenti restano invariati.
- **Cambiare chiavi/lettore:** aggiorna `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` / `STRIPE_WEBHOOK_SECRET` nell’ambiente e riavvia (`docker compose up -d`). Smetti di usare il vecchio lettore nella dashboard Stripe.
- **Passaggio alla modalità live:** sostituisci le chiavi e i segreti di test con quelli live, poi ripeti la lista di controllo della fase pilota con un piccolo pagamento reale prima di annunciare i pagamenti con carta.
- **Locali che accettano solo contanti:** non serve configurare Stripe; attiva Pagamenti e usa i contanti. Turni, rimborsi, note di credito, chiusura giornata e CSV funzionano anche senza terminale.

### Informazioni importanti

- **Un lettore per installazione:** l’ID del lettore è configurato nell’ambiente. Per più casse sarebbe necessario selezionare il lettore (funzione non implementata).
- **Dipendenza da Internet:** i pagamenti con carta richiedono una connessione; se viene interrotta durante il pagamento, questo può rimanere nello stato «presentazione» — annullalo o rimborsalo dalla pagina Cassa. I contanti funzionano sempre.
- **Un solo accesso del personale:** attualmente l’app ha un solo accesso amministrativo; i pagamenti e le note di credito registrano quell’utente.
- **NF525 (Francia):** l’app registra vendite e pagamenti con ricevute numerate in sequenza, righe immutabili, note di credito e chiusure di periodo — ma la certificazione è una procedura di attestazione legale. Consulta il tuo expert-comptable prima di dichiarare la conformità o abilitare i pagamenti con carta in produzione.
- Questa integrazione riguarda i **pagamenti**, non un POS esterno per il bar (sincronizzazione di menù/ordini) né l’autopagamento del cliente dal telefono.

## Report

Accedi da **Admin → Report**. La pagina ha due schede: **Finanziario** e **IVA / TVA**.

### Report finanziari

Genera report dettagliati sui ricavi per qualsiasi intervallo di tempo.

**Tipi di periodo:**
- **Giorno:** data specifica con dettagli delle sessioni
- **Settimana:** periodo di 7 giorni a partire dal lunedì
- **Mese:** mese di calendario completo
- **Trimestre:** T1, T2, T3 o T4
- **Anno:** riepilogo annuale

**Contenuto del report:**

1. **Ricavi totali** - Tutte le fonti sommate

2. **Ricavi per tipo di tavolo**
   - Pool americano: €X
   - Pool: €X
   - Snooker: €X
   - Francese: €X

3. **Ricavi di bevande/articoli** - Vendite di alimenti e bevande

4. **Ricavi degli abbonamenti** - Abbonamenti attivi nel periodo

5. **Analisi delle serie temporali** (report settimanali/mensili/trimestrali/annuali)
   - Andamento dei ricavi nel tempo
   - Analisi per giorno della settimana
   - Individuazione delle ore di punta

6. **Dettagli giornalieri** (solo report giornalieri)
   - Dettaglio delle singole sessioni
   - Utilizzo dei tavoli per sessione
   - Dettagli dei singoli articoli
   - Possibilità di modificare/eliminare gli addebiti

### Interpretare i report

**Cosa includono:**
- Addebiti dei tavoli per le sessioni completate
- Tutti gli articoli del menù e gli addebiti personalizzati
- Ricavi degli abbonamenti

**Cosa escludono:**
- Sessioni attive (in corso)
- Movimenti contabili dei saldi (sono rettifiche interne)
- Tavoli in manutenzione o in pausa

**Caricamento automatico:** il report del giorno corrente viene generato automaticamente quando apri la pagina Report.

---

## Report IVA (TVA) — Francia

> ⚠️ **Non costituisce consulenza legale o fiscale.** Consulta il tuo *expert-comptable* per verificare che questi importi e procedure siano conformi al regime IVA specifico della tua attività prima di presentare la dichiarazione. Consulta [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md) per le note complete sulla conformità.

La scheda **IVA / TVA** della pagina Report prepara la dichiarazione IVA periodica (CA3/CA12).

### Generare un report IVA

1. Scegli un **tipo di periodo** (mese, trimestre, anno o giorno) e il periodo specifico.
2. Fai clic su **Carica report IVA** per visualizzare il dettaglio per aliquota IVA:
   - Totale HT (al netto dell’IVA)
   - TVA (importo IVA)
   - Totale TTC (IVA inclusa)
3. Sotto la tabella viene mostrato il dettaglio per categoria (tempo tavolo, bevande, sconti, altro).

### Chiudere un periodo

Dopo aver presentato la dichiarazione relativa a un periodo alle autorità fiscali, fai clic su **Chiudi periodo**. Questa operazione:
- Salva un’istantanea dei totali del periodo per i tuoi archivi.
- Impedisce che **Cancella tutto lo storico delle sessioni** elimini in futuro le vendite comprese in quel periodo, così gli importi dichiarati rimangono sempre tracciabili nel database.

I periodi chiusi appaiono in un elenco storico sotto il report, con il periodo, i totali e il nome di chi ha effettuato la chiusura.

### Esportare i dati per il commercialista

Fai clic su **Esporta registro CSV** per scaricare ogni singola riga di vendita del periodo selezionato (data, tavolo/sessione, descrizione, quantità, prezzo unitario, aliquota IVA, importo IVA, importo HT) — utile da inviare al commercialista o per l’archiviazione a lungo termine.

### Mantenere accurati i report IVA

- Imposta correttamente in Admin l’aliquota IVA di ogni bevanda e tipo di tavolo (vedi [Gestione del menù delle bevande](#drink-menu-management) e [Tipi di tavolo e inventario](#table-types--inventory)).
- **Usa sempre «✓ Incassa» → Completa pagamento** per terminare le sessioni che hanno generato ricavi — così viene registrato l’addebito del tempo tavolo e viene emessa una ricevuta numerata progressivamente. Se termini una sessione in un altro modo, l’addebito del tempo tavolo non sarà incluso nel report IVA.
- Inserisci le **Informazioni fiscali / legali** in Impostazioni (SIRET, numero IVA, regime IVA, ecc.) per averle a disposizione al momento della dichiarazione.

---

## Suggerimenti e buone pratiche

### Per la gestione quotidiana

1. **Inizio giornata:**
   - Controlla se ci sono tavoli «occupati» rimasti tali per errore
   - Controlla il report del giorno precedente
   - Verifica che tutti i tavoli siano impostati come «disponibili»

2. **Durante il servizio:**
   - Usa i pulsanti rapidi delle bevande per velocizzare le operazioni
   - Verifica il PIN con i giocatori quando devono accedere al conto
   - Tieni d’occhio le sessioni di lunga durata

3. **Fine giornata:**
   - Incassa tutte le sessioni ancora aperte
   - Genera il report giornaliero
   - Controlla eventuali problemi o rettifiche

### Per i saldi

- Verifica sempre il numero di giocatori prima di effettuare un saldo
- Stampa le ricevute per gli archivi dei clienti
- Controlla che gli articoli selezionati corrispondano a quelli consumati dal giocatore

### Per la precisione

- Aggiungi subito gli articoli ai conti (non aspettare l’incasso)
- Usa gli addebiti personalizzati per gli articoli non presenti nel menù
- Verifica che il numero di giocatori sia corretto all’inizio della sessione

### Per il servizio clienti

- Condividi gli URL dei tavoli con i giocatori all’inizio della sessione
- Metti i codici QR vicino ai tavoli per facilitarne l’accesso
- Spiega i vantaggi dell’abbonamento per incoraggiare le iscrizioni

---

## Scorciatoie da tastiera

Attualmente l’applicazione si usa con mouse o touchscreen e non dispone di scorciatoie da tastiera. Per tutte le azioni è necessario fare clic sui pulsanti.

---

## Accesso da dispositivi mobili

L’applicazione è completamente adattabile e funziona su:
- Browser desktop
- Tablet
- Smartphone

**Consigliato per:**
- Personale: desktop/tablet per la dashboard
- Giocatori: smartphone per la pagina del tavolo

---

## Risoluzione dei problemi

### Problemi comuni

**«Impossibile avviare la sessione»**
- Controlla che il tavolo sia effettivamente disponibile
- Verifica che il numero di abbonati non sia superiore al numero totale di giocatori
- Aggiorna la pagina e riprova
- Se il problema persiste, contatta l’amministratore

**Il PIN non funziona**
- Verifica che il PIN corrisponda a quello mostrato sulla dashboard
- Controlla che il numero del tavolo sia corretto
- Il PIN scade al termine della sessione

**Gli articoli non appaiono sul conto**
- Verifica che l’articolo sia stato aggiunto (controlla la presenza del messaggio di conferma)
- Attendi circa 10 secondi per l’aggiornamento automatico (pagina pubblica), oppure torna alla scheda per aggiornarla subito
- Aggiorna manualmente la dashboard

**Gli importi visualizzati non sono corretti**
- Verifica che sia impostata la valuta corretta
- Controlla se sono stati applicati dei saldi
- Esamina le singole voci nei dettagli della sessione

### Ottenere assistenza

Se il problema persiste:
1. Annota il numero del tavolo e l’ora
2. Se possibile, fai uno screenshot
3. Contatta l’amministratore di sistema
4. Controlla i log Docker (per gli amministratori)

---

## Domande frequenti

**D: Posso modificare una sessione dopo averla avviata?**
R: Sì, durante la sessione puoi aggiungere/rimuovere articoli e modificare il numero di giocatori.

**D: Cosa succede se termino una sessione per errore?**
R: Le sessioni terminate non possono essere riaperte. Dovrai avviarne una nuova.

**D: I giocatori possono aggiungere articoli da soli?**
R: No, solo il personale può aggiungere articoli. I giocatori possono soltanto visualizzare il conto.

**D: Come gestisco le sessioni gratuite (offerte)?**
R: Avvia una sessione con 1 giocatore, aggiungi gli articoli, poi procedi all’incasso senza addebitare il pagamento.

**D: Posso modificare la tariffa oraria durante una sessione?**
R: No, le modifiche alla tariffa si applicano solo alle nuove sessioni. Le sessioni attive mantengono la tariffa originaria.

**D: Cosa succede se Internet non funziona?**
R: Il sistema richiede l’accesso alla rete. Le sessioni attive rimangono in corso, ma gli aggiornamenti si interrompono finché la connessione non viene ripristinata.

**D: Posso esportare i dati dei report?**
R: Al momento i report sono solo consultabili. Per conservarli, usa la funzione di stampa/esportazione PDF del browser.

**D: Quanto indietro posso consultare i report?**
R: Finché lo storico delle sessioni viene conservato (fino a quando non viene cancellato manualmente da Impostazioni).

---

## Riepilogo delle funzionalità

### Funzionalità principali
✓ Monitoraggio delle sessioni in tempo reale
✓ Addebito automatico in base al tempo
✓ Supporto per più giocatori con saldi
✓ Pagine dei giocatori protette da PIN
✓ Gestione di bevande e articoli
✓ Supporto per addebiti personalizzati
✓ Trasferimento dei tavoli
✓ Stampa delle ricevute
✓ Ordini di bevande self-service per i giocatori, con coda degli ordini in sospeso e avvisi audio
✓ Codici QR per accedere ai tavoli con un tocco dal telefono del giocatore

### Funzionalità Admin
✓ Gestione dei tipi di tavolo e dell’inventario
✓ Creazione di tavoli in blocco
✓ Configurazione del menù delle bevande con aliquote IVA
✓ Gestione degli abbonamenti
✓ Report finanziari (più periodi)
✓ Report IVA (TVA), esportazione CSV e chiusura dei periodi per la conformità francese
✓ Supporto per più valute
✓ Sistema di sconti per abbonati
✓ Gestione dello storico delle sessioni
✓ URL base pubblica configurabile per i codici QR
✓ Informazioni fiscali/legali dell’attività

### Funzionalità per i giocatori
✓ Visualizzazione del conto in tempo reale
✓ Schermata aggiornata automaticamente
✓ Interfaccia adatta ai dispositivi mobili
✓ Accesso protetto da PIN
✓ Ordini self-service di bevande tramite codice QR

---

## Supporto

Per assistenza tecnica o richieste di funzionalità, contatta l’amministratore di sistema.

---

**Versione:** 1.0  
**Ultimo aggiornamento:** Dicembre 2025

---

Grazie per aver scelto Pool Tables Manager! Ci auguriamo che questa guida ti aiuti a sfruttare al meglio l’applicazione. Per la documentazione tecnica, gli sviluppatori possono consultare `DEVELOPER_README.md`.
