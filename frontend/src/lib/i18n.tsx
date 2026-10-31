import * as React from 'react'
import { Languages } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { settingsFr } from './i18n-settings-fr'
import { settingsDe } from './i18n-settings-de'
import { settingsEs } from './i18n-settings-es'
import { settingsIt } from './i18n-settings-it'

export type Language = 'en' | 'fr' | 'de' | 'es' | 'it'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
]

// Dictionaries are keyed by the English source string, so missing entries fall
// back to English automatically as screens are translated incrementally.
export type Dict = Record<string, string>

const fr: Dict = {
  Dashboard: 'Tableau de bord', Admin: 'Admin', Help: 'Aide', 'Public Status': 'Statut public',
  'Log out': 'Se déconnecter', 'Toggle theme': 'Changer de thème', Language: 'Langue', Save: 'Enregistrer',
  Cancel: 'Annuler', Close: 'Fermer', Delete: 'Supprimer', Add: 'Ajouter', Back: 'Retour',
  'Loading…': 'Chargement…', Search: 'Rechercher', All: 'Tout', Total: 'Total',
  'Admin Login': 'Connexion admin', 'Initial Admin Setup': 'Configuration initiale de l’admin',
  'Enter the local admin password to manage the venue.': 'Saisissez le mot de passe admin local pour gérer l’établissement.',
  'Define a local admin password (username: admin). Keep it secure.': 'Définissez un mot de passe admin local (utilisateur : admin). Gardez-le confidentiel.',
  'Admin password': 'Mot de passe admin', 'New admin password': 'Nouveau mot de passe admin',
  'Confirm password': 'Confirmer le mot de passe', 'Log in': 'Se connecter',
  'Save password & continue': 'Enregistrer et continuer', 'Please wait…': 'Veuillez patienter…',
  'Enter your admin password': 'Saisissez votre mot de passe admin',
  'Password must be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
  'Passwords do not match': 'Les mots de passe ne correspondent pas',
  'Public status board': 'Tableau de statut public', 'Something went wrong': 'Une erreur est survenue',
  Tables: 'Tables', 'Live view of sessions, tabs and pending drink orders.': 'Vue en direct des sessions, additions et commandes en attente.',
  'No tables configured yet. Add table types and tables under Admin → Table Types & Inventory.': 'Aucune table configurée. Ajoutez des types de tables et des tables via Admin → Types de tables et inventaire.',
  'Pending Orders ({count})': 'Commandes en attente ({count})', 'Table #{number}': 'Table n°{number}',
  Fulfilled: 'Servie', Available: 'Disponible', Occupied: 'Occupée', Maintenance: 'Maintenance',
  '{count} player': '{count} joueur', '{count} players': '{count} joueurs', 'Open tab': 'Addition ouverte',
  'Scan to track your time & tab': 'Scannez pour suivre votre temps et votre addition',
  'Start Session': 'Démarrer la session', Drink: 'Boisson', Transfer: 'Transférer', Checkout: 'Encaisser',
  'Settle player': 'Régler un joueur', 'Remove player': 'Retirer un joueur', 'Add player': 'Ajouter un joueur',
  'Maintenance due — {used}h / {max}h used': 'Maintenance requise — {used} h / {max} h utilisées',
  'Drag to reorder': 'Glisser pour réordonner', 'Jump to {name}': 'Aller à {name}',
  'Collapse section': 'Replier la section', 'Expand section': 'Déplier la section',
  'Reorder table type': 'Réordonner le type de table',
  'Start Session — Table #{number}': 'Démarrer la session — Table n°{number}',
  'How many players are playing?': 'Combien de joueurs jouent ?',
  'Subscribers (free table time)': 'Abonnés (temps de table offert)', 'Non-subscribers': 'Non-abonnés',
  'Total players: {count}': 'Joueurs au total : {count}',
  'Add at least one player to start the session.': 'Ajoutez au moins un joueur pour démarrer la session.',
  'Starting…': 'Démarrage…', 'Session started': 'Session démarrée',
  'Is the new player a subscriber?': 'Le nouveau joueur est-il abonné ?',
  'The session now has {count} player(s). Is the new player a subscriber?': 'La session compte {count} joueur(s). Le nouveau joueur est-il abonné ?',
  'Subscriber — free table time': 'Abonné — temps de table offert',
  'Non-subscriber — pays their share': 'Non-abonné — paie sa part',
  'Subscriber added': 'Abonné ajouté', 'Non-subscriber added': 'Non-abonné ajouté',
  'Failed to add player': 'Échec de l’ajout du joueur',
  'Add Drinks': 'Ajouter des boissons', 'Add items to the open tab.': 'Ajoutez des articles à l’addition ouverte.',
  'On this tab': 'Sur cette addition', Menu: 'Carte', 'No drinks configured.': 'Aucune boisson configurée.',
  'Nothing matches that search.': 'Aucun résultat.', 'Search the menu…': 'Rechercher dans la carte…',
  'Add to tab': 'Ajouter à l’addition', 'Adding…': 'Ajout…', 'Items added to tab': 'Articles ajoutés',
  'Failed to add item': 'Échec de l’ajout', 'Failed to remove item': 'Échec de la suppression',
  'Transfer to Table': 'Transférer vers une table', 'Choose an available table for this session.': 'Choisissez une table disponible.',
  'No other tables are available.': 'Aucune autre table disponible.', 'Failed to transfer': 'Échec du transfert',
  'Session transferred': 'Session transférée', 'Scan to View Tab — Table #{number}': 'Scanner pour voir l’addition — Table n°{number}',
  'Review the tab, apply a discount if needed and complete payment.': 'Vérifiez l’addition, appliquez une remise si besoin et encaissez.',
  'Table Time': 'Temps de table', '{hours}h charged': '{hours} h facturées', 'Discount type': 'Type de remise',
  'Percent (%)': 'Pourcentage (%)', 'Fixed ({currency})': 'Montant fixe ({currency})', 'Discount %': 'Remise %',
  'Discount ({currency})': 'Remise ({currency})', 'Subtotal (TTC)': 'Sous-total (TTC)', Discount: 'Remise',
  'TOTAL (TTC)': 'TOTAL (TTC)', '{count} players · {amount} per person': '{count} joueurs · {amount} par personne',
  'Payments (cash)': 'Paiements (espèces)', 'Fully paid': 'Entièrement payé', 'Remaining {amount}': 'Reste {amount}',
  'Cash received ({currency})': 'Espèces reçues ({currency})', 'Add payment': 'Ajouter un paiement',
  'Exact {amount}': 'Montant exact {amount}', 'Card terminal integration arrives in a later phase.': 'L’intégration du terminal bancaire arrivera ultérieurement.',
  'Present card on the terminal…': 'Présentez la carte sur le terminal…', 'Cancel card payment': 'Annuler le paiement carte',
  'Print estimate': 'Imprimer l’estimation', 'Complete checkout': 'Finaliser l’encaissement',
  'Processing…': 'Traitement…', 'Invoice created': 'Facture créée', 'Checkout failed': 'Échec de l’encaissement',
  'Session ended': 'Session terminée', 'Paid ({method})': 'Payé ({method})', 'Change due': 'À rendre',
  'Print invoice': 'Imprimer la facture', Done: 'Terminé', 'Card payment failed': 'Paiement carte échoué',
  'Card payment canceled': 'Paiement carte annulé', 'Card payment captured': 'Paiement carte validé',
  'No card terminal is configured on the server.': 'Aucun terminal bancaire n’est configuré.',
  'Player Settlement': 'Règlement d’un joueur', 'This player is a subscriber': 'Ce joueur est abonné',
  'Do not settle table time': 'Ne pas régler le temps de table', 'Items to settle': 'Articles à régler',
  'Settlement total': 'Total du règlement', 'Print receipt': 'Imprimer le reçu', 'Settling…': 'Règlement…',
  'Player settled': 'Joueur réglé', 'Settlement failed': 'Échec du règlement',
  Started: 'Début', Duration: 'Durée', Players: 'Joueurs', Items: 'Articles', 'Total Due': 'Total dû',
  'Your Orders (Pending)': 'Vos commandes (en attente)', 'Being prepared — {amount}': 'En préparation — {amount}',
  'Order Drinks': 'Commander des boissons', 'Your order': 'Votre commande', 'Place Order': 'Commander',
  'Placing…': 'Envoi…', 'Order sent! A staff member will bring it shortly.': 'Commande envoyée ! Un membre du personnel l’apportera bientôt.',
  'Could not place order. Please try again or ask staff for help.': 'Impossible d’envoyer la commande. Réessayez ou demandez de l’aide.',
  'Menu unavailable.': 'Carte indisponible.', 'No active session': 'Aucune session active',
  'Enter PIN Code': 'Saisir le code PIN', 'Please enter the 4-digit PIN to view this table': 'Saisissez le code PIN à 4 chiffres pour voir cette table',
  'View Table': 'Voir la table', 'Invalid PIN. Please try again.': 'Code PIN invalide. Réessayez.',
  'Table not found': 'Table introuvable', 'Error loading table information': 'Erreur de chargement des informations',
  'Invalid table URL': 'URL de table invalide', 'Table Status': 'Statut des tables',
  'Live availability — updates automatically': 'Disponibilité en direct — mise à jour automatique',
  Live: 'Direct', 'Reconnecting…': 'Reconnexion…', 'No tables configured': 'Aucune table configurée',
  'Manage the venue configuration and inventory.': 'Gérez la configuration et l’inventaire de l’établissement.',
  'Drinks Menu': 'Carte des boissons', 'Add, edit or remove drinks': 'Ajouter, modifier ou supprimer des boissons',
  'Table Types & Inventory': 'Types de tables et inventaire', 'Manage table types and add/remove tables': 'Gérer les types de tables et ajouter/supprimer des tables',
  Subscriptions: 'Abonnements', 'Create and remove subscriptions': 'Créer et supprimer des abonnements',
  Reports: 'Rapports', 'Generate financial reports': 'Générer des rapports financiers',
  Settings: 'Paramètres', 'Configure app, fiscal, email and security settings': 'Configurer l’application, la fiscalité, les e-mails et la sécurité',
  'Cash & Payments': 'Caisse et paiements', 'Cash-shift reconciliation and recorded payments': 'Rapprochement de caisse et paiements enregistrés',
  'Database Backup': 'Sauvegarde de la base', 'Download a compressed backup or restore one': 'Télécharger une sauvegarde compressée ou en restaurer une',
  'Stored on this device': 'Enregistré sur cet appareil', 'Localization & Pricing': 'Localisation et tarification',
}

const de: Dict = {
  Dashboard: 'Übersicht', Admin: 'Admin', Help: 'Hilfe', 'Public Status': 'Öffentlicher Status',
  'Log out': 'Abmelden', 'Toggle theme': 'Design wechseln', Language: 'Sprache', Save: 'Speichern',
  Cancel: 'Abbrechen', Close: 'Schließen', Delete: 'Löschen', Add: 'Hinzufügen', Back: 'Zurück',
  'Loading…': 'Wird geladen…', Search: 'Suchen', All: 'Alle', Total: 'Gesamt',
  'Admin Login': 'Admin-Anmeldung', 'Initial Admin Setup': 'Ersteinrichtung des Admins',
  'Enter the local admin password to manage the venue.': 'Geben Sie das lokale Admin-Passwort ein, um den Betrieb zu verwalten.',
  'Define a local admin password (username: admin). Keep it secure.': 'Legen Sie ein lokales Admin-Passwort fest (Benutzer: admin). Bewahren Sie es sicher auf.',
  'Admin password': 'Admin-Passwort', 'New admin password': 'Neues Admin-Passwort',
  'Confirm password': 'Passwort bestätigen', 'Log in': 'Anmelden', 'Save password & continue': 'Speichern und fortfahren',
  'Please wait…': 'Bitte warten…', 'Enter your admin password': 'Admin-Passwort eingeben',
  'Password must be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen haben',
  'Passwords do not match': 'Passwörter stimmen nicht überein', 'Public status board': 'Öffentliche Statusseite',
  'Something went wrong': 'Etwas ist schiefgelaufen', Tables: 'Tische',
  'Live view of sessions, tabs and pending drink orders.': 'Live-Ansicht von Sitzungen, Rechnungen und offenen Getränkebestellungen.',
  'No tables configured yet. Add table types and tables under Admin → Table Types & Inventory.': 'Noch keine Tische konfiguriert. Fügen Sie Tischtypen und Tische unter Admin → Tischtypen & Inventar hinzu.',
  'Pending Orders ({count})': 'Offene Bestellungen ({count})', 'Table #{number}': 'Tisch Nr. {number}',
  Fulfilled: 'Erledigt', Available: 'Verfügbar', Occupied: 'Besetzt', Maintenance: 'Wartung',
  '{count} player': '{count} Spieler', '{count} players': '{count} Spieler', 'Open tab': 'Offene Rechnung',
  'Scan to track your time & tab': 'Scannen, um Zeit und Rechnung zu verfolgen', 'Start Session': 'Sitzung starten',
  Drink: 'Getränk', Transfer: 'Umziehen', Checkout: 'Kassieren', 'Settle player': 'Spieler abrechnen',
  'Remove player': 'Spieler entfernen', 'Add player': 'Spieler hinzufügen',
  'Maintenance due — {used}h / {max}h used': 'Wartung fällig — {used} h / {max} h genutzt',
  'Drag to reorder': 'Zum Sortieren ziehen', 'Jump to {name}': 'Zu {name} springen',
  'Collapse section': 'Abschnitt einklappen', 'Expand section': 'Abschnitt ausklappen',
  'Reorder table type': 'Tischtyp neu anordnen', 'Start Session — Table #{number}': 'Sitzung starten — Tisch Nr. {number}',
  'How many players are playing?': 'Wie viele Spieler spielen?', 'Subscribers (free table time)': 'Abonnenten (freie Tischzeit)',
  'Non-subscribers': 'Nicht-Abonnenten', 'Total players: {count}': 'Spieler insgesamt: {count}',
  'Add at least one player to start the session.': 'Fügen Sie mindestens einen Spieler hinzu.',
  'Starting…': 'Startet…', 'Session started': 'Sitzung gestartet',
  'Is the new player a subscriber?': 'Ist der neue Spieler Abonnent?',
  'The session now has {count} player(s). Is the new player a subscriber?': 'Die Sitzung hat {count} Spieler. Ist der neue Spieler Abonnent?',
  'Subscriber — free table time': 'Abonnent — freie Tischzeit', 'Non-subscriber — pays their share': 'Nicht-Abonnent — zahlt seinen Anteil',
  'Subscriber added': 'Abonnent hinzugefügt', 'Non-subscriber added': 'Nicht-Abonnent hinzugefügt',
  'Failed to add player': 'Spieler konnte nicht hinzugefügt werden', 'Add Drinks': 'Getränke hinzufügen',
  'Add items to the open tab.': 'Artikel zur offenen Rechnung hinzufügen.', 'On this tab': 'Auf dieser Rechnung',
  Menu: 'Karte', 'No drinks configured.': 'Keine Getränke konfiguriert.', 'Nothing matches that search.': 'Keine Treffer.',
  'Search the menu…': 'Karte durchsuchen…', 'Add to tab': 'Zur Rechnung', 'Adding…': 'Wird hinzugefügt…',
  'Items added to tab': 'Artikel hinzugefügt', 'Failed to add item': 'Artikel konnte nicht hinzugefügt werden',
  'Failed to remove item': 'Artikel konnte nicht entfernt werden', 'Transfer to Table': 'An Tisch umziehen',
  'Choose an available table for this session.': 'Wählen Sie einen verfügbaren Tisch.',
  'No other tables are available.': 'Keine anderen Tische verfügbar.', 'Failed to transfer': 'Umzug fehlgeschlagen',
  'Session transferred': 'Sitzung umgezogen', 'Scan to View Tab — Table #{number}': 'Scannen für Rechnung — Tisch Nr. {number}',
  'Review the tab, apply a discount if needed and complete payment.': 'Rechnung prüfen, ggf. Rabatt anwenden und Zahlung abschließen.',
  'Table Time': 'Tischzeit', '{hours}h charged': '{hours} h berechnet', 'Discount type': 'Rabattart',
  'Percent (%)': 'Prozent (%)', 'Fixed ({currency})': 'Fest ({currency})', 'Discount %': 'Rabatt %',
  'Discount ({currency})': 'Rabatt ({currency})', 'Subtotal (TTC)': 'Zwischensumme (brutto)', Discount: 'Rabatt',
  'TOTAL (TTC)': 'GESAMT (brutto)', '{count} players · {amount} per person': '{count} Spieler · {amount} pro Person',
  'Payments (cash)': 'Zahlungen (Bar)', 'Fully paid': 'Vollständig bezahlt', 'Remaining {amount}': 'Offen {amount}',
  'Cash received ({currency})': 'Bargeld erhalten ({currency})', 'Add payment': 'Zahlung hinzufügen',
  'Exact {amount}': 'Genau {amount}', 'Card terminal integration arrives in a later phase.': 'Kartenterminal folgt in einer späteren Phase.',
  'Present card on the terminal…': 'Karte am Terminal vorhalten…', 'Cancel card payment': 'Kartenzahlung abbrechen',
  'Print estimate': 'Schätzung drucken', 'Complete checkout': 'Kasse abschließen', 'Processing…': 'Verarbeitung…',
  'Invoice created': 'Rechnung erstellt', 'Checkout failed': 'Kassieren fehlgeschlagen', 'Session ended': 'Sitzung beendet',
  'Paid ({method})': 'Bezahlt ({method})', 'Change due': 'Rückgeld', 'Print invoice': 'Rechnung drucken', Done: 'Fertig',
  'Card payment failed': 'Kartenzahlung fehlgeschlagen', 'Card payment canceled': 'Kartenzahlung abgebrochen',
  'Card payment captured': 'Kartenzahlung erfasst', 'No card terminal is configured on the server.': 'Kein Kartenterminal konfiguriert.',
  'Player Settlement': 'Spielerabrechnung', 'This player is a subscriber': 'Dieser Spieler ist Abonnent',
  'Do not settle table time': 'Tischzeit nicht abrechnen', 'Items to settle': 'Abzurechnende Artikel',
  'Settlement total': 'Abrechnungssumme', 'Print receipt': 'Beleg drucken', 'Settling…': 'Abrechnung…',
  'Player settled': 'Spieler abgerechnet', 'Settlement failed': 'Abrechnung fehlgeschlagen',
  Started: 'Start', Duration: 'Dauer', Players: 'Spieler', Items: 'Artikel', 'Total Due': 'Gesamtbetrag',
  'Your Orders (Pending)': 'Ihre Bestellungen (offen)', 'Being prepared — {amount}': 'In Zubereitung — {amount}',
  'Order Drinks': 'Getränke bestellen', 'Your order': 'Ihre Bestellung', 'Place Order': 'Bestellen',
  'Placing…': 'Wird gesendet…', 'Order sent! A staff member will bring it shortly.': 'Bestellung gesendet! Das Personal bringt sie gleich.',
  'Could not place order. Please try again or ask staff for help.': 'Bestellung fehlgeschlagen. Bitte erneut versuchen oder Personal fragen.',
  'Menu unavailable.': 'Karte nicht verfügbar.', 'No active session': 'Keine aktive Sitzung',
  'Enter PIN Code': 'PIN eingeben', 'Please enter the 4-digit PIN to view this table': 'Geben Sie die 4-stellige PIN ein',
  'View Table': 'Tisch anzeigen', 'Invalid PIN. Please try again.': 'Ungültige PIN. Bitte erneut versuchen.',
  'Table not found': 'Tisch nicht gefunden', 'Error loading table information': 'Fehler beim Laden',
  'Invalid table URL': 'Ungültige Tisch-URL', 'Table Status': 'Tischstatus',
  'Live availability — updates automatically': 'Live-Verfügbarkeit — aktualisiert automatisch',
  Live: 'Live', 'Reconnecting…': 'Neuverbindung…', 'No tables configured': 'Keine Tische konfiguriert',
  'Manage the venue configuration and inventory.': 'Konfiguration und Inventar verwalten.', 'Drinks Menu': 'Getränkekarte',
  'Add, edit or remove drinks': 'Getränke hinzufügen, bearbeiten oder entfernen', 'Table Types & Inventory': 'Tischtypen & Inventar',
  'Manage table types and add/remove tables': 'Tischtypen verwalten und Tische hinzufügen/entfernen',
  Subscriptions: 'Abonnements', 'Create and remove subscriptions': 'Abonnements erstellen und entfernen',
  Reports: 'Berichte', 'Generate financial reports': 'Finanzberichte erstellen', Settings: 'Einstellungen',
  'Configure app, fiscal, email and security settings': 'App-, Steuer-, E-Mail- und Sicherheitseinstellungen',
  'Cash & Payments': 'Kasse & Zahlungen', 'Cash-shift reconciliation and recorded payments': 'Kassenabrechnung und erfasste Zahlungen',
  'Database Backup': 'Datenbanksicherung', 'Download a compressed backup or restore one': 'Komprimierte Sicherung laden oder wiederherstellen',
  'Stored on this device': 'Auf diesem Gerät gespeichert', 'Localization & Pricing': 'Lokalisierung & Preise',
}

const es: Dict = {
  Dashboard: 'Panel', Admin: 'Admin', Help: 'Ayuda', 'Public Status': 'Estado público',
  'Log out': 'Cerrar sesión', 'Toggle theme': 'Cambiar tema', Language: 'Idioma', Save: 'Guardar',
  Cancel: 'Cancelar', Close: 'Cerrar', Delete: 'Eliminar', Add: 'Añadir', Back: 'Volver',
  'Loading…': 'Cargando…', Search: 'Buscar', All: 'Todo', Total: 'Total',
  'Admin Login': 'Acceso administrador', 'Initial Admin Setup': 'Configuración inicial del administrador',
  'Enter the local admin password to manage the venue.': 'Introduce la contraseña de administrador local para gestionar el local.',
  'Define a local admin password (username: admin). Keep it secure.': 'Define una contraseña de administrador local (usuario: admin). Mantenla segura.',
  'Admin password': 'Contraseña de administrador', 'New admin password': 'Nueva contraseña de administrador',
  'Confirm password': 'Confirmar contraseña', 'Log in': 'Entrar', 'Save password & continue': 'Guardar y continuar',
  'Please wait…': 'Espera…', 'Enter your admin password': 'Introduce tu contraseña de administrador',
  'Password must be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  'Passwords do not match': 'Las contraseñas no coinciden', 'Public status board': 'Panel de estado público',
  'Something went wrong': 'Algo ha salido mal', Tables: 'Mesas',
  'Live view of sessions, tabs and pending drink orders.': 'Vista en directo de sesiones, cuentas y pedidos pendientes.',
  'No tables configured yet. Add table types and tables under Admin → Table Types & Inventory.': 'Aún no hay mesas configuradas. Añade tipos y mesas en Admin → Tipos de mesa e inventario.',
  'Pending Orders ({count})': 'Pedidos pendientes ({count})', 'Table #{number}': 'Mesa n.º {number}',
  Fulfilled: 'Servido', Available: 'Disponible', Occupied: 'Ocupada', Maintenance: 'Mantenimiento',
  '{count} player': '{count} jugador', '{count} players': '{count} jugadores', 'Open tab': 'Cuenta abierta',
  'Scan to track your time & tab': 'Escanea para seguir tu tiempo y tu cuenta', 'Start Session': 'Iniciar sesión',
  Drink: 'Bebida', Transfer: 'Transferir', Checkout: 'Cobrar', 'Settle player': 'Liquidar jugador',
  'Remove player': 'Quitar jugador', 'Add player': 'Añadir jugador',
  'Maintenance due — {used}h / {max}h used': 'Mantenimiento pendiente — {used} h / {max} h usadas',
  'Drag to reorder': 'Arrastra para reordenar', 'Jump to {name}': 'Ir a {name}', 'Collapse section': 'Contraer sección',
  'Expand section': 'Expandir sección', 'Reorder table type': 'Reordenar tipo de mesa',
  'Start Session — Table #{number}': 'Iniciar sesión — Mesa n.º {number}', 'How many players are playing?': '¿Cuántos jugadores juegan?',
  'Subscribers (free table time)': 'Abonados (tiempo de mesa gratis)', 'Non-subscribers': 'No abonados',
  'Total players: {count}': 'Jugadores totales: {count}', 'Add at least one player to start the session.': 'Añade al menos un jugador para iniciar.',
  'Starting…': 'Iniciando…', 'Session started': 'Sesión iniciada', 'Is the new player a subscriber?': '¿El nuevo jugador es abonado?',
  'The session now has {count} player(s). Is the new player a subscriber?': 'La sesión tiene {count} jugador(es). ¿El nuevo jugador es abonado?',
  'Subscriber — free table time': 'Abonado — tiempo de mesa gratis', 'Non-subscriber — pays their share': 'No abonado — paga su parte',
  'Subscriber added': 'Abonado añadido', 'Non-subscriber added': 'No abonado añadido', 'Failed to add player': 'No se pudo añadir el jugador',
  'Add Drinks': 'Añadir bebidas', 'Add items to the open tab.': 'Añade artículos a la cuenta abierta.', 'On this tab': 'En esta cuenta',
  Menu: 'Carta', 'No drinks configured.': 'No hay bebidas configuradas.', 'Nothing matches that search.': 'Sin resultados.',
  'Search the menu…': 'Buscar en la carta…', 'Add to tab': 'Añadir a la cuenta', 'Adding…': 'Añadiendo…',
  'Items added to tab': 'Artículos añadidos', 'Failed to add item': 'No se pudo añadir el artículo',
  'Failed to remove item': 'No se pudo quitar el artículo', 'Transfer to Table': 'Transferir a mesa',
  'Choose an available table for this session.': 'Elige una mesa disponible.', 'No other tables are available.': 'No hay otras mesas disponibles.',
  'Failed to transfer': 'Transferencia fallida', 'Session transferred': 'Sesión transferida',
  'Scan to View Tab — Table #{number}': 'Escanea para ver la cuenta — Mesa n.º {number}',
  'Review the tab, apply a discount if needed and complete payment.': 'Revisa la cuenta, aplica un descuento si hace falta y cobra.',
  'Table Time': 'Tiempo de mesa', '{hours}h charged': '{hours} h cobradas', 'Discount type': 'Tipo de descuento',
  'Percent (%)': 'Porcentaje (%)', 'Fixed ({currency})': 'Importe fijo ({currency})', 'Discount %': 'Descuento %',
  'Discount ({currency})': 'Descuento ({currency})', 'Subtotal (TTC)': 'Subtotal (con IVA)', Discount: 'Descuento',
  'TOTAL (TTC)': 'TOTAL (con IVA)', '{count} players · {amount} per person': '{count} jugadores · {amount} por persona',
  'Payments (cash)': 'Pagos (efectivo)', 'Fully paid': 'Pagado por completo', 'Remaining {amount}': 'Pendiente {amount}',
  'Cash received ({currency})': 'Efectivo recibido ({currency})', 'Add payment': 'Añadir pago', 'Exact {amount}': 'Exacto {amount}',
  'Card terminal integration arrives in a later phase.': 'El terminal de tarjeta llegará en una fase posterior.',
  'Present card on the terminal…': 'Presenta la tarjeta en el terminal…', 'Cancel card payment': 'Cancelar pago con tarjeta',
  'Print estimate': 'Imprimir estimación', 'Complete checkout': 'Finalizar cobro', 'Processing…': 'Procesando…',
  'Invoice created': 'Factura creada', 'Checkout failed': 'Cobro fallido', 'Session ended': 'Sesión finalizada',
  'Paid ({method})': 'Pagado ({method})', 'Change due': 'Cambio', 'Print invoice': 'Imprimir factura', Done: 'Hecho',
  'Card payment failed': 'Pago con tarjeta fallido', 'Card payment canceled': 'Pago con tarjeta cancelado',
  'Card payment captured': 'Pago con tarjeta capturado', 'No card terminal is configured on the server.': 'No hay terminal configurado.',
  'Player Settlement': 'Liquidación de jugador', 'This player is a subscriber': 'Este jugador es abonado',
  'Do not settle table time': 'No liquidar tiempo de mesa', 'Items to settle': 'Artículos a liquidar',
  'Settlement total': 'Total de liquidación', 'Print receipt': 'Imprimir recibo', 'Settling…': 'Liquidando…',
  'Player settled': 'Jugador liquidado', 'Settlement failed': 'Liquidación fallida',
  Started: 'Inicio', Duration: 'Duración', Players: 'Jugadores', Items: 'Artículos', 'Total Due': 'Total a pagar',
  'Your Orders (Pending)': 'Tus pedidos (pendientes)', 'Being prepared — {amount}': 'En preparación — {amount}',
  'Order Drinks': 'Pedir bebidas', 'Your order': 'Tu pedido', 'Place Order': 'Hacer pedido', 'Placing…': 'Enviando…',
  'Order sent! A staff member will bring it shortly.': '¡Pedido enviado! El personal lo traerá en breve.',
  'Could not place order. Please try again or ask staff for help.': 'No se pudo enviar el pedido. Inténtalo de nuevo o pide ayuda.',
  'Menu unavailable.': 'Carta no disponible.', 'No active session': 'Sin sesión activa', 'Enter PIN Code': 'Introduce el PIN',
  'Please enter the 4-digit PIN to view this table': 'Introduce el PIN de 4 dígitos para ver esta mesa', 'View Table': 'Ver mesa',
  'Invalid PIN. Please try again.': 'PIN no válido. Inténtalo de nuevo.', 'Table not found': 'Mesa no encontrada',
  'Error loading table information': 'Error al cargar la mesa', 'Invalid table URL': 'URL de mesa no válida',
  'Table Status': 'Estado de las mesas', 'Live availability — updates automatically': 'Disponibilidad en directo — se actualiza sola',
  Live: 'En directo', 'Reconnecting…': 'Reconectando…', 'No tables configured': 'No hay mesas configuradas',
  'Manage the venue configuration and inventory.': 'Gestiona la configuración y el inventario.', 'Drinks Menu': 'Carta de bebidas',
  'Add, edit or remove drinks': 'Añadir, editar o eliminar bebidas', 'Table Types & Inventory': 'Tipos de mesa e inventario',
  'Manage table types and add/remove tables': 'Gestionar tipos de mesa y añadir/quitar mesas', Subscriptions: 'Suscripciones',
  'Create and remove subscriptions': 'Crear y eliminar suscripciones', Reports: 'Informes', 'Generate financial reports': 'Generar informes financieros',
  Settings: 'Ajustes', 'Configure app, fiscal, email and security settings': 'Configura la app, fiscalidad, correo y seguridad',
  'Cash & Payments': 'Caja y pagos', 'Cash-shift reconciliation and recorded payments': 'Arqueo de caja y pagos registrados',
  'Database Backup': 'Copia de seguridad', 'Download a compressed backup or restore one': 'Descargar una copia comprimida o restaurarla',
  'Stored on this device': 'Guardado en este dispositivo', 'Localization & Pricing': 'Idioma y precios',
}

const it: Dict = {
  Dashboard: 'Dashboard', Admin: 'Admin', Help: 'Aiuto', 'Public Status': 'Stato pubblico',
  'Log out': 'Esci', 'Toggle theme': 'Cambia tema', Language: 'Lingua', Save: 'Salva', Cancel: 'Annulla',
  Close: 'Chiudi', Delete: 'Elimina', Add: 'Aggiungi', Back: 'Indietro', 'Loading…': 'Caricamento…',
  Search: 'Cerca', All: 'Tutto', Total: 'Totale', 'Admin Login': 'Accesso amministratore',
  'Initial Admin Setup': 'Configurazione iniziale amministratore',
  'Enter the local admin password to manage the venue.': 'Inserisci la password amministratore locale per gestire il locale.',
  'Define a local admin password (username: admin). Keep it secure.': 'Definisci una password amministratore locale (utente: admin). Tienila al sicuro.',
  'Admin password': 'Password amministratore', 'New admin password': 'Nuova password amministratore',
  'Confirm password': 'Conferma password', 'Log in': 'Accedi', 'Save password & continue': 'Salva e continua',
  'Please wait…': 'Attendere…', 'Enter your admin password': 'Inserisci la password amministratore',
  'Password must be at least 6 characters': 'La password deve avere almeno 6 caratteri',
  'Passwords do not match': 'Le password non coincidono', 'Public status board': 'Pannello stato pubblico',
  'Something went wrong': 'Si è verificato un errore', Tables: 'Tavoli',
  'Live view of sessions, tabs and pending drink orders.': 'Vista live di sessioni, conti e ordini in sospeso.',
  'No tables configured yet. Add table types and tables under Admin → Table Types & Inventory.': 'Nessun tavolo configurato. Aggiungi tipi di tavolo e tavoli in Admin → Tipi di tavolo e inventario.',
  'Pending Orders ({count})': 'Ordini in sospeso ({count})', 'Table #{number}': 'Tavolo n. {number}',
  Fulfilled: 'Servito', Available: 'Disponibile', Occupied: 'Occupato', Maintenance: 'Manutenzione',
  '{count} player': '{count} giocatore', '{count} players': '{count} giocatori', 'Open tab': 'Conto aperto',
  'Scan to track your time & tab': 'Scansiona per seguire tempo e conto', 'Start Session': 'Avvia sessione',
  Drink: 'Bevanda', Transfer: 'Trasferisci', Checkout: 'Incassa', 'Settle player': 'Salda giocatore',
  'Remove player': 'Rimuovi giocatore', 'Add player': 'Aggiungi giocatore',
  'Maintenance due — {used}h / {max}h used': 'Manutenzione necessaria — {used} h / {max} h usate',
  'Drag to reorder': 'Trascina per riordinare', 'Jump to {name}': 'Vai a {name}', 'Collapse section': 'Comprimi sezione',
  'Expand section': 'Espandi sezione', 'Reorder table type': 'Riordina tipo di tavolo',
  'Start Session — Table #{number}': 'Avvia sessione — Tavolo n. {number}', 'How many players are playing?': 'Quanti giocatori giocano?',
  'Subscribers (free table time)': 'Abbonati (tempo tavolo gratis)', 'Non-subscribers': 'Non abbonati',
  'Total players: {count}': 'Giocatori totali: {count}', 'Add at least one player to start the session.': 'Aggiungi almeno un giocatore per iniziare.',
  'Starting…': 'Avvio…', 'Session started': 'Sessione avviata', 'Is the new player a subscriber?': 'Il nuovo giocatore è abbonato?',
  'The session now has {count} player(s). Is the new player a subscriber?': 'La sessione ha {count} giocatore/i. Il nuovo giocatore è abbonato?',
  'Subscriber — free table time': 'Abbonato — tempo tavolo gratis', 'Non-subscriber — pays their share': 'Non abbonato — paga la sua parte',
  'Subscriber added': 'Abbonato aggiunto', 'Non-subscriber added': 'Non abbonato aggiunto', 'Failed to add player': 'Impossibile aggiungere il giocatore',
  'Add Drinks': 'Aggiungi bevande', 'Add items to the open tab.': 'Aggiungi articoli al conto aperto.', 'On this tab': 'Su questo conto',
  Menu: 'Menù', 'No drinks configured.': 'Nessuna bevanda configurata.', 'Nothing matches that search.': 'Nessun risultato.',
  'Search the menu…': 'Cerca nel menù…', 'Add to tab': 'Aggiungi al conto', 'Adding…': 'Aggiunta…',
  'Items added to tab': 'Articoli aggiunti', 'Failed to add item': 'Impossibile aggiungere l’articolo',
  'Failed to remove item': 'Impossibile rimuovere l’articolo', 'Transfer to Table': 'Trasferisci al tavolo',
  'Choose an available table for this session.': 'Scegli un tavolo disponibile.', 'No other tables are available.': 'Nessun altro tavolo disponibile.',
  'Failed to transfer': 'Trasferimento non riuscito', 'Session transferred': 'Sessione trasferita',
  'Scan to View Tab — Table #{number}': 'Scansiona per vedere il conto — Tavolo n. {number}',
  'Review the tab, apply a discount if needed and complete payment.': 'Controlla il conto, applica uno sconto se necessario e incassa.',
  'Table Time': 'Tempo tavolo', '{hours}h charged': '{hours} h addebitate', 'Discount type': 'Tipo di sconto',
  'Percent (%)': 'Percentuale (%)', 'Fixed ({currency})': 'Importo fisso ({currency})', 'Discount %': 'Sconto %',
  'Discount ({currency})': 'Sconto ({currency})', 'Subtotal (TTC)': 'Subtotale (IVA incl.)', Discount: 'Sconto',
  'TOTAL (TTC)': 'TOTALE (IVA incl.)', '{count} players · {amount} per person': '{count} giocatori · {amount} a persona',
  'Payments (cash)': 'Pagamenti (contanti)', 'Fully paid': 'Pagato per intero', 'Remaining {amount}': 'Rimanente {amount}',
  'Cash received ({currency})': 'Contanti ricevuti ({currency})', 'Add payment': 'Aggiungi pagamento', 'Exact {amount}': 'Esatto {amount}',
  'Card terminal integration arrives in a later phase.': 'Il terminale carte arriverà in una fase successiva.',
  'Present card on the terminal…': 'Presenta la carta sul terminale…', 'Cancel card payment': 'Annulla pagamento carta',
  'Print estimate': 'Stampa preventivo', 'Complete checkout': 'Completa incasso', 'Processing…': 'Elaborazione…',
  'Invoice created': 'Fattura creata', 'Checkout failed': 'Incasso non riuscito', 'Session ended': 'Sessione terminata',
  'Paid ({method})': 'Pagato ({method})', 'Change due': 'Resto', 'Print invoice': 'Stampa fattura', Done: 'Fatto',
  'Card payment failed': 'Pagamento carta non riuscito', 'Card payment canceled': 'Pagamento carta annullato',
  'Card payment captured': 'Pagamento carta acquisito', 'No card terminal is configured on the server.': 'Nessun terminale configurato.',
  'Player Settlement': 'Saldo giocatore', 'This player is a subscriber': 'Questo giocatore è abbonato',
  'Do not settle table time': 'Non saldare il tempo tavolo', 'Items to settle': 'Articoli da saldare',
  'Settlement total': 'Totale saldo', 'Print receipt': 'Stampa ricevuta', 'Settling…': 'Saldo…',
  'Player settled': 'Giocatore saldato', 'Settlement failed': 'Saldo non riuscito',
  Started: 'Inizio', Duration: 'Durata', Players: 'Giocatori', Items: 'Articoli', 'Total Due': 'Totale dovuto',
  'Your Orders (Pending)': 'I tuoi ordini (in sospeso)', 'Being prepared — {amount}': 'In preparazione — {amount}',
  'Order Drinks': 'Ordina bevande', 'Your order': 'Il tuo ordine', 'Place Order': 'Invia ordine', 'Placing…': 'Invio…',
  'Order sent! A staff member will bring it shortly.': 'Ordine inviato! Il personale lo porterà a breve.',
  'Could not place order. Please try again or ask staff for help.': 'Impossibile inviare l’ordine. Riprova o chiedi aiuto al personale.',
  'Menu unavailable.': 'Menù non disponibile.', 'No active session': 'Nessuna sessione attiva', 'Enter PIN Code': 'Inserisci il PIN',
  'Please enter the 4-digit PIN to view this table': 'Inserisci il PIN di 4 cifre per vedere questo tavolo', 'View Table': 'Vedi tavolo',
  'Invalid PIN. Please try again.': 'PIN non valido. Riprova.', 'Table not found': 'Tavolo non trovato',
  'Error loading table information': 'Errore nel caricamento', 'Invalid table URL': 'URL tavolo non valido',
  'Table Status': 'Stato tavoli', 'Live availability — updates automatically': 'Disponibilità live — aggiornamento automatico',
  Live: 'Live', 'Reconnecting…': 'Riconnessione…', 'No tables configured': 'Nessun tavolo configurato',
  'Manage the venue configuration and inventory.': 'Gestisci configurazione e inventario.', 'Drinks Menu': 'Menù bevande',
  'Add, edit or remove drinks': 'Aggiungi, modifica o rimuovi bevande', 'Table Types & Inventory': 'Tipi di tavolo e inventario',
  'Manage table types and add/remove tables': 'Gestisci tipi di tavolo e aggiungi/rimuovi tavoli', Subscriptions: 'Abbonamenti',
  'Create and remove subscriptions': 'Crea e rimuovi abbonamenti', Reports: 'Report', 'Generate financial reports': 'Genera report finanziari',
  Settings: 'Impostazioni', 'Configure app, fiscal, email and security settings': 'Configura app, fisco, email e sicurezza',
  'Cash & Payments': 'Cassa e pagamenti', 'Cash-shift reconciliation and recorded payments': 'Riconciliazione di cassa e pagamenti registrati',
  'Database Backup': 'Backup database', 'Download a compressed backup or restore one': 'Scarica un backup compresso o ripristinalo',
  'Stored on this device': 'Salvato su questo dispositivo', 'Localization & Pricing': 'Lingua e prezzi',
}

const extra: Record<Language, Dict> = {
  en: {},
  fr: {
    'Cold drinks': 'Boissons fraîches', 'Hot drinks': 'Boissons chaudes', 'Alcoholic drinks': 'Boissons alcoolisées',
    Other: 'Autres', Cold: 'Froid', Hot: 'Chaud', Alcoholic: 'Alcoolisé',
    table: 'table', tables: 'tables', player: 'joueur', players: 'joueurs',
    'Player share ({amount})': 'Part du joueur ({amount})', 'Full table charge ({amount})': 'Frais de table complets ({amount})',
    'Card (terminal)': 'Carte (terminal)', Payments: 'Paiements', 'This tab is empty.': 'Cette addition est vide.',
    'Payment complete. The session has ended.': 'Paiement terminé. La session est close.',
    'Complete payment and end session?': 'Finaliser le paiement et terminer la session ?',
  },
  de: {
    'Cold drinks': 'Kaltgetränke', 'Hot drinks': 'Heißgetränke', 'Alcoholic drinks': 'Alkoholische Getränke',
    Other: 'Sonstiges', Cold: 'Kalt', Hot: 'Heiß', Alcoholic: 'Alkoholisch',
    table: 'Tisch', tables: 'Tische', player: 'Spieler', players: 'Spieler',
    'Player share ({amount})': 'Anteil des Spielers ({amount})', 'Full table charge ({amount})': 'Volle Tischgebühr ({amount})',
    'Card (terminal)': 'Karte (Terminal)', Payments: 'Zahlungen', 'This tab is empty.': 'Diese Rechnung ist leer.',
    'Payment complete. The session has ended.': 'Zahlung abgeschlossen. Die Sitzung ist beendet.',
    'Complete payment and end session?': 'Zahlung abschließen und Sitzung beenden?',
  },
  es: {
    'Cold drinks': 'Bebidas frías', 'Hot drinks': 'Bebidas calientes', 'Alcoholic drinks': 'Bebidas alcohólicas',
    Other: 'Otros', Cold: 'Frío', Hot: 'Caliente', Alcoholic: 'Alcohólico',
    table: 'mesa', tables: 'mesas', player: 'jugador', players: 'jugadores',
    'Player share ({amount})': 'Parte del jugador ({amount})', 'Full table charge ({amount})': 'Cargo completo de mesa ({amount})',
    'Card (terminal)': 'Tarjeta (terminal)', Payments: 'Pagos', 'This tab is empty.': 'Esta cuenta está vacía.',
    'Payment complete. The session has ended.': 'Pago completado. La sesión ha finalizado.',
    'Complete payment and end session?': '¿Completar el pago y finalizar la sesión?',
  },
  it: {
    'Cold drinks': 'Bevande fredde', 'Hot drinks': 'Bevande calde', 'Alcoholic drinks': 'Bevande alcoliche',
    Other: 'Altro', Cold: 'Freddo', Hot: 'Caldo', Alcoholic: 'Alcolico',
    table: 'tavolo', tables: 'tavoli', player: 'giocatore', players: 'giocatori',
    'Player share ({amount})': 'Quota del giocatore ({amount})', 'Full table charge ({amount})': 'Addebito completo tavolo ({amount})',
    'Card (terminal)': 'Carta (terminale)', Payments: 'Pagamenti', 'This tab is empty.': 'Questo conto è vuoto.',
    'Payment complete. The session has ended.': 'Pagamento completato. La sessione è terminata.',
    'Complete payment and end session?': 'Completare il pagamento e terminare la sessione?',
  },
}

const dictionaries: Record<Language, Dict> = {
  en: {},
  fr: { ...fr, ...extra.fr, ...settingsFr },
  de: { ...de, ...extra.de, ...settingsDe },
  es: { ...es, ...extra.es, ...settingsEs },
  it: { ...it, ...extra.it, ...settingsIt },
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? String(vars[key]) : match))
}

interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

function readLanguage(): Language {
  const stored = localStorage.getItem('lang')
  return LANGUAGES.some((entry) => entry.value === stored) ? (stored as Language) : 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(readLanguage)

  React.useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = React.useCallback((next: Language) => {
    setLanguageState(next)
    localStorage.setItem('lang', next)
  }, [])

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[language] || {}
      return interpolate(dict[key] || key, vars)
    },
    [language],
  )

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

/** Language picker used in the header, Settings, the player view and status board. */
export function LanguageSelect({ className }: { className?: string }) {
  const { language, setLanguage } = useI18n()
  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger className={cn('h-8 w-auto gap-2 border-0 bg-transparent px-2 shadow-none', className)} aria-label="Language">
        <Languages className="h-4 w-4 shrink-0 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((entry) => (
          <SelectItem key={entry.value} value={entry.value}>
            {entry.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
