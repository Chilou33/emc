# emc

Accès automatisé à une page/site avec Playwright.

## Prérequis

- Node.js 18+ recommandé

## Installation

```bash
npm install
npm run pw:install
```

## Ouvrir le site

- Ouvrir le fichier local `emc.html` :

```bash
npm run open:local
```

- Ouvrir une URL :

```bash
npm run open -- https://example.com
```

## Options utiles

```bash
npm run open -- https://example.com --headless -s shot.png -w 1500
npm run open -- ./emc.html -b firefox
```
