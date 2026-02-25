# ============================================================
#  KILO CUSTOM RULES — PROJECT-WIDE DEVELOPMENT GUIDELINES
#  This file defines the coding standards and expectations
#  Kilo must follow when generating, refactoring, or reviewing code.
# ============================================================

# ------------------------------------------------------------
# 1. GENERAL PRINCIPLES
# ------------------------------------------------------------

- Le code doit toujours être clair, lisible et maintenable.
- Favoriser la simplicité : éviter complexité inutile, magic numbers, hacks.
- Appliquer systématiquement les bonnes pratiques de développement internes 
  décrites dans le fichier good_practices.md si présent.
- Toujours fournir du code robuste, sécurisé et respectant les standards du projet.

# ------------------------------------------------------------
# 2. ARCHITECTURE & DESIGN
# ------------------------------------------------------------

- Respecter l’architecture existante du projet.
- Proposer des améliorations architecturales seulement si elles apportent une valeur claire
  (performance, lisibilité, sécurité, réduction dette technique).
- Toujours expliquer brièvement toute recommandation architecturale importante.
- Utiliser des patterns simples (par exemple : MVC, DI, services stateless)
  uniquement si cela correspond au style du projet.

# ------------------------------------------------------------
# 3. LANGAGE & CONVENTIONS
# ------------------------------------------------------------

# Exemple pour TypeScript / JavaScript (à adapter selon ton projet)

- Respecter les conventions du langage utilisé (TypeScript, Python, etc.).
- Toujours typer explicitement quand c’est possible.
- Préférer les fonctions pures et éviter les effets de bord non documentés.
- Utiliser des noms de variables et fonctions descriptifs.
- Respecter le style guide existant du projet (ESLint, Prettier, Flake8…).

# ------------------------------------------------------------
# 4. LIBRAIRIES & DÉPENDANCES
# ------------------------------------------------------------

- Utiliser uniquement des dépendances stables, bien maintenues et nécessaires 
  aux fonctionnalités (conformément aux recommandations sur l’usage de bibliothèques 
  bien maintenues) [3](https://labrador.sorbonne-universite.fr/node/149).
- Éviter toute dépendance lourde si une solution native suffit.
- Expliciter toute nouvelle dépendance ajoutée (utilité, alternatives, impact).

# ------------------------------------------------------------
# 5. SÉCURITÉ
# ------------------------------------------------------------

- Ne jamais introduire de données sensibles dans le code (tokens, mots de passe, secrets).
- Toujours valider et assainir les entrées utilisateur.
- Suivre les recommandations de sécurité standard pour le langage/framework utilisé.

# ------------------------------------------------------------
# 6. TESTS
# ------------------------------------------------------------

- Toujours créer ou mettre à jour les tests unitaires associés à toute nouvelle fonctionnalité.
- Prioriser des tests simples, isolés et déterministes.
- Ajouter des tests sur les cas limites et les comportements anormaux.
- Documenter les hypothèses testées quand cela n’est pas évident.

# ------------------------------------------------------------
# 7. DOCUMENTATION
# ------------------------------------------------------------

- Documenter toute fonction publique ou complexe.
- Ajouter des exemples d’usage lorsque pertinent.
- Mettre à jour le README ou la documentation du projet si une fonctionnalité évolue.

# ------------------------------------------------------------
# 8. COMMUNICATION & EXPLICATIONS
# ------------------------------------------------------------

- Quand Kilo propose des changements importants (refactoring, ajout dépendance, 
  modification structure), il doit expliquer en 2–3 phrases :
  - la raison du changement
  - son impact
  - les alternatives possibles

# ------------------------------------------------------------
# 9. FICHIERS SUPPLÉMENTAIRES DE RÈGLES
# ------------------------------------------------------------

# Si ton projet contient un fichier interne de bonnes pratiques :
@include good_practices.md

# ------------------------------------------------------------
# 10. MODES OU CONTEXTES SPÉCIAUX
# ------------------------------------------------------------

# Si des modes personnalisés existent (dans .kilocodemodes), Kilo doit les respecter.

# ------------------------------------------------------------
# FIN DU FICHIER
# -----------------------------------------------------------
``
