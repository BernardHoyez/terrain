# Terrain — Suivi de circuits en absence totale de réseau

Application web progressive (PWA) pour suivre sur le terrain un circuit de randonnée
photographié et commenté, avec un fond de carte orthophoto IGN embarqué et un marqueur
de position GPS — **sans aucune connexion réseau ni Wi-Fi une fois le circuit
téléchargé**.

Elle est complémentaire de [geotour](https://bernardhoyez.github.io/geotour), qui reste
l'outil de préparation (édition des waypoints, tracé, génération du fond MBtiles). Terrain
ne modifie ni ne remplace geotour : elle consomme les fichiers qu'il produit.

---

## Les deux onglets

### 🧭 Suivi

Écran d'accueil listant les circuits déjà téléchargés sur l'appareil (persistants entre
les sessions, même après fermeture de l'app ou redémarrage du téléphone).

- **Ajouter un circuit** : coller le lien d'un circuit déployé (voir plus bas) et appuyer
  sur *Charger*. Nécessite une connexion réseau **une seule fois**, le temps du
  téléchargement (waypoints, photos, audio/vidéo, fond de carte). Une barre de
  progression indique l'avancement.
- **Ouvrir un circuit** : lance la visionneuse plein écran — carte avec tracé, waypoints
  numérotés et marqueur GPS pulsant en haut ; photo, nom, commentaire (avec lecture
  audio 🔊), audio/vidéo du waypoint en bas ; navigation ◀ Préc. / Suiv. ▶ au clic ou en
  touchant un marqueur sur la carte.
- **Supprimer un circuit** : libère l'espace de stockage occupé par ses fichiers hors-ligne.

Un lien de la forme `…/terrain/?circuit=https://mon-site.tld/mon-circuit/` déclenche le
téléchargement (avec confirmation) puis l'ouverture automatique du circuit — pratique pour
partager un circuit prêt à l'emploi en un seul lien (voir [[falaises-de-craie]] /
[[rollevillerando]] pour ce type de page-portail).

### 🛠️ Générer un circuit

Outil de préparation (à utiliser chez soi, en ligne, avant la sortie) qui assemble un
**paquet de circuit** déployable :

1. **Session KMZ de geotour** — onglet Édition de geotour → *💾 Sauvegarder la session en
   KMZ*. Contient les waypoints, photos, commentaires, audio/vidéo et le tracé.
2. **Fichier .mbtiles** (optionnel) — produit par le générateur MBtiles de geotour (ou
   ign2mbt). Automatiquement découpé en fragments de **≤19 Mo** (marge de sécurité sous la
   limite de 20 Mo par fichier élémentaire).
3. **Titre** du circuit.
4. **Générer le paquet** produit une archive `.zip` prête à déployer.

---

## Déploiement d'un circuit

1. Dézipper l'archive générée dans un dossier dédié, par ex. `mon-circuit/`.
2. Déposer ce dossier sur un hébergement statique (GitHub Pages, Netlify, Cloudflare
   Pages…), à une URL du type `https://mon-site.tld/mon-circuit/`.
3. Dans l'onglet 🧭 Suivi, coller cette URL — ou diffuser directement le lien
   `…/terrain/?circuit=https://mon-site.tld/mon-circuit/`.

### ⚠️ CORS si l'hébergement du circuit diffère de celui de l'app

Si l'app terrain et le paquet d'un circuit sont sur des **domaines différents**,
l'hébergeur du circuit doit envoyer l'en-tête `Access-Control-Allow-Origin` pour que le
téléchargement fonctionne :

- **GitHub Pages** : envoie cet en-tête par défaut, rien à faire.
- **Netlify / Cloudflare Pages** : nécessite une configuration explicite (fichier
  `_headers` avec `Access-Control-Allow-Origin: *` sur le dossier du circuit).

Le plus simple pour éviter toute question : héberger les circuits sous le **même domaine**
que l'app terrain (par ex. des sous-dossiers de `bernardhoyez.github.io`).

---

## Installation sur smartphone

L'app doit être servie en HTTPS (GitHub Pages convient) : le service worker et la
géolocalisation GPS exigent un contexte sécurisé, qu'une adresse locale en `http://` ne
fournit pas sur mobile.

1. Ouvrir l'URL de déploiement dans Chrome (Android) ou Safari (iOS).
2. *Ajouter à l'écran d'accueil* (bannière automatique sur Chrome/Android, ou menu de
   partage sur Safari/iOS).
3. Lancer l'app depuis son icône — elle s'ouvre en plein écran.
4. Charger un circuit en ligne une première fois, puis vérifier en mode avion qu'il reste
   consultable.

---

## Architecture technique

- Fichier unique `index.html` (shell applicatif), `sw.js` (service worker brise-cache),
  `manifest.json`, plus `vendor/` (Leaflet, sql.js, JSZip vendorisés localement — aucune
  dépendance CDN, condition nécessaire à un fonctionnement 100 % hors-ligne).
- **Un paquet de circuit** = `manifest.json`, `waypoints.json`, `track.json`,
  `photos/`/`audio/`/`video/`, et `mbtiles/manifest.json` + `mbtiles/chunk_NNN.bin`
  (fragments bruts du fichier SQLite MBtiles, réassemblés côté client en un seul buffer
  avant d'être ouverts par sql.js — identique au lecteur MBtiles de geotour).
- **Stockage sur l'appareil** : Cache Storage (un cache par circuit, nommé
  `terrain-circuit-<slug>`, contenant tous les fichiers du paquet) + IndexedDB (métadonnées
  des circuits : titre, vignette, date, nombre de waypoints).
- **Point de vigilance délibéré** : contrairement au modèle brise-cache habituel, le
  service worker exclut explicitement les caches `terrain-circuit-*` de la purge effectuée
  à chaque mise à jour de l'app — une mise à jour ne doit jamais effacer un circuit déjà
  téléchargé.
- Marqueur GPS : `navigator.geolocation.watchPosition`, identique au marqueur déjà validé
  dans le diaporama hors-ligne exporté par geotour.

---

## Limites connues

- Les icônes de l'app sont provisoires (reprises de geotour) — à personnaliser.
- Les polices utilisent la police système plutôt que Outfit/Space Mono (pas de dépendance
  CDN).
- La lecture du commentaire (🔊 Lire) utilise la synthèse vocale du navigateur
  (`speechSynthesis`) — la disponibilité et la qualité des voix hors-ligne dépendent de
  l'appareil.
- Le générateur suppose le format exact de la session KMZ exportée par geotour (notamment
  la balise `<n>` — et non `<name>` — pour le nom des Placemarks) ; un KML/KMZ d'une autre
  origine peut ne pas être reconnu correctement.
