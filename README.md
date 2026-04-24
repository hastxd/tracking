# Suivi de commande AllCars — Guide d'installation

## Ce que tu as dans ce dossier

- `api/track.js` → le serveur Vercel (l'intermédiaire avec Shopify)
- `vercel.json` → config Vercel
- `shopify/page.tracking.liquid` → la page à coller dans ton thème Shopify

---

## ÉTAPE 1 — Mettre le code sur GitHub

1. Va sur github.com → crée un compte si tu n'en as pas
2. Clique sur "New repository" → nomme-le "allcars-tracking" → Public → Create
3. Clique sur "uploading an existing file"
4. Upload les fichiers : `vercel.json` et le dossier `api/` avec `track.js`
5. Clique "Commit changes"

---

## ÉTAPE 2 — Déployer sur Vercel

1. Va sur vercel.com → connecte-toi avec ton compte GitHub
2. Clique "Add New Project" → sélectionne ton repo "allcars-tracking"
3. Clique "Deploy" (sans rien changer)
4. Une fois déployé, tu as une URL du type : https://allcars-tracking-xxx.vercel.app

### Ajouter les variables d'environnement (IMPORTANT)

Dans Vercel → ton projet → Settings → Environment Variables, ajoute :

| Nom | Valeur |
|-----|--------|
| SHOPIFY_STORE | jtx8t8-0p.myshopify.com |
| SHOPIFY_CLIENT_ID | ab4e6fa96c2abf6237ec5080f989961d |
| SHOPIFY_CLIENT_SECRET | [ton nouveau secret après rotation] |

Puis : Deployments → clic droit sur le dernier → Redeploy

---

## ÉTAPE 3 — Installer sur Shopify

1. Dans ton admin Shopify : Online Store → Themes → Edit code
2. Dans le dossier "Templates", clique "Add a new template"
3. Choisis "page" → nomme-le "tracking" → Create
4. Remplace TOUT le contenu par le contenu du fichier `shopify/page.tracking.liquid`
5. Dans la ligne `const API_URL = "..."` remplace par ton URL Vercel :
   `const API_URL = "https://allcars-tracking-xxx.vercel.app/api/track";`
6. Save

### Créer la page dans Shopify

1. Online Store → Pages → Add page
2. Titre : "Suivre ma commande"
3. Theme template : choisir "tracking"
4. Save

---

## ÉTAPE 4 — Tester

Va sur ta boutique → /pages/suivre-ma-commande
Entre un vrai numéro de commande (juste le chiffre, sans le #)

---

## Messages affichés selon les délais

| Délai | Message |
|-------|---------|
| 0-3 jours | "En cours de préparation 📦" |
| 3-7 jours | "En route vers vous 🚚" |
| 7-14 jours | "Livraison imminente 🎯" |
| +14 jours | "Livraison attendue ✅" |

Pour modifier ces messages : ouvre `api/track.js` et modifie la fonction `getTrackingMessage()`

---

## Pour les 4 autres boutiques

Tu répètes uniquement l'Étape 1 et 2 en changeant les variables d'environnement.
La page Shopify (Étape 3) est identique à coller dans chaque boutique.
