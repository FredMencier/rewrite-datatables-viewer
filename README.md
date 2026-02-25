# rewrite-datatables-viewer
OpenRewrite data tables visualizer

Fonctionnalités Implémentées
Architecture Technique :

TypeScript avec configuration stricte et compilation optimisée
D3.js v7 pour les visualisations de données
Webpack avec serveur de développement et build de production
CSS moderne avec variables et design système cohérent
Interface Utilisateur :

Dashboard responsive avec navigation par onglets (Vue d'ensemble, Performance, ROI, Fichiers, Recettes)
Cartes KPI dynamiques (Temps économisé, Fichiers modifiés, ROI global, Recettes actives)
Système de notifications toast pour feedback utilisateur
Gestion d'erreurs robuste avec messages informatifs
Design moderne avec animations et transitions fluides
Traitement des Données :

Parser CSV avec typage fort pour les fichiers OpenRewrite
Service DataLoader avec cache et gestion d'erreurs
Service DataProcessor pour calculs de métriques ROI et statistiques
Types TypeScript complets pour toutes les structures de données
Métriques Avancées :

ROI (Retour sur Investissement) des recettes OpenRewrite
Temps économisé vs temps d'exécution
Efficacité des changements par recette
Hiérarchie des recettes avec métriques de performance
Agrégation par types de changements
🚀 Utilisation
Démarrage : npm install && npm run serve
Ajout de données : Placer les fichiers CSV OpenRewrite dans data/
Accès : http://localhost:3000
Build production : npm run build
📊 Visualisations Incluses
Graphiques en barres pour les économies par recette
Scatter plots performance vs économies
Infrastructure D3.js prête pour visualisations avancées
Framework extensible pour ajouter nouvelles visualisations