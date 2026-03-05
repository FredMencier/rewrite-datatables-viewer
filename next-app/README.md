# rewrite-datatables-viewer

Application de visualisation des données OpenRewrite pour le suivi des migrations de code.

## Fonctionnalités

### Tableau de Bord Principal (General Usage)
- **KPIs dynamiques** : Temps économisé total, repositories actifs, fichiers modifiés, temps d'exécution
- **Graphique camembert** : Temps économisé par repository (avec tooltip en heures/minutes)
- **Graphique à barres horizontal** : Fichiers modifiés par repository
- **Tableau d'historique** : Liste des executions avec filtres
  - Filtrage par repository
  - Exclusion de recipes spécifiques

### Onglets de Visualisation
- **Vue d'ensemble** : Métriques ROI et statistiques globales
- **Performance** : Graphiques de performance des recettes
- **Fichiers** : Analyse des fichiers modifiés
- **Recettes** : Détails par recette OpenRewrite

### Fonctionnalités Techniques
- Rechargement des données en temps réel
- Cache des données pour optimiser les performances
- Gestion d'erreurs robuste avec messages informatifs
- Design responsive (mobile, tablette, desktop)
- Support du mode sombre

## Architecture

```
next-app/
├── app/
│   ├── components/          # Composants React
│   │   ├── BarChart.tsx     # Graphique à barres (ECharts)
│   │   ├── ChartCard.tsx    # Carte contenedor de graphique
│   │   ├── FilesTab.tsx     # Onglet fichiers
│   │   ├── KPICard.tsx      # Carte KPI
│   │   ├── OverviewTab.tsx  # Onglet vue d'ensemble
│   │   ├── PerformanceTab.tsx # Onglet performance
│   │   ├── PieChart.tsx     # Graphique camembert (ECharts)
│   │   ├── RecipesTab.tsx   # Onglet recettes
│   │   ├── Tabs.tsx         # Navigation par onglets
│   │   ├── TimeSeriesChart.tsx # Graphique série temporelle
│   │   └── UsageDashboard.tsx  # Tableau de bord principal
│   ├── hooks/
│   │   └── useData.ts       # Hook React pour le chargement des données
│   ├── lib/
│   │   ├── DataLoader.ts    # Service de chargement CSV/JSON
│   │   └── DataProcessor.ts # Service de traitement des données
│   ├── types/
│   │   └── index.ts         # Définitions TypeScript
│   ├── globals.css          # Styles globaux
│   ├── layout.tsx           # Layout Next.js
│   └── page.tsx             # Page principale
├── public/
│   └── data/                # Fichiers de données CSV/JSON
│       ├── manifest.json    # Liste des fichiers usage-report
│       ├── org.openrewrite.table.RecipeRunStats.csv
│       ├── org.openrewrite.table.SourcesFileResults.csv
│       └── usage-report-*.csv
├── next.config.js           # Configuration Next.js
├── tailwind.config.js       # Configuration TailwindCSS
└── package.json             # Dépendances
```

## Dépendances

### Production
- **Next.js 14** : Framework React with App Router
- **React 18** : Bibliothèque UI
- **ECharts 5** : Visualisations de données interactives

### Développement
- **TypeScript 5** : Typage statique
- **TailwindCSS 3** : Framework CSS utility-first
- **PostCSS** : Transformation CSS
- **Autoprefixer** : Ajout automatique des préfixes navigateur

> **Note** : D3.js était initialement prévu mais n'est pas utilisé dans cette implémentation. Les visualisations sont réalisées avec ECharts.

## Installation et Lancement

### Prérequis
- Node.js 18+
- npm 9+

### Installation
```bash
cd next-app
npm install
```

### Développement
```bash
npm run dev
```
Accédez à : http://localhost:3000/rewrite-datatables-viewer

### Production (Build statique)
```bash
npm run build
```
Les fichiers statiques seront générés dans `next-app/out/`

### Linting
```bash
npm run lint
```

## Format des Données

### Fichiers CSV attendus
- `org.openrewrite.table.RecipeRunStats.csv` : Statistiques des recettes
- `org.openrewrite.table.SourcesFileResults.csv` : Résultats par fichier source
- `usage-report-<timestamp>.csv` : Rapports d'utilisation

### Manifest
Le fichier `manifest.json` liste les fichiers usage-report disponibles :
```json
{
  "usageReports": [
    "usage-report-1772437230910.csv"
  ]
}
```

## Configuration

### Base Path
L'application est configurée pour être servie depuis `/rewrite-datatables-viewer` (configuré dans `next.config.js`).

### Personnalisation
- Modifier `tailwind.config.js` pour les couleurs/thèmes
- Ajouter de nouveaux fichiers CSV dans `public/data/`
- Mettre à jour `manifest.json` pour les nouveaux fichiers usage-report
