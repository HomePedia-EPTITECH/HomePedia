# Lot Analyse Des Données

## Objectif

Transformer les données brutes déjà nettoyées en **indicateurs métier fiables**
utiles au produit HomePedia : comparer les villes selon le logement, les
services, la santé, l'éducation et la qualité de vie.

## Ce Que Prend Ce Lot

- audit des colonnes réellement disponibles dans Mongo, Spark et PostgreSQL ;
- harmonisation des noms de colonnes et des formules utilisées dans les jobs ;
- calcul des métriques enrichies dans `spark/jobs/metrics/` ;
- définition des scores métier dans `spark/jobs/scoring/` ;
- vérification de cohérence des résultats ;
- documentation des formules et des limites.

## Ce Que Ce Lot Ne Prend Pas

- le scraping et le croisement initial des sources ;
- le nettoyage brut générique des champs ;
- le backend NestJS ;
- le frontend React.

## Etat Actuel Du Repo

- la pipeline Spark principale existe dans `spark/main.py` ;
- le nettoyage et une partie de l'éducation sont déjà branchés ;
- `metrics_pipeline` est encore désactivée ;
- plusieurs jobs métier existent mais sont incomplets ou non alignés avec le
  schéma actuel ;
- `spark/jobs/scoring/scoring_job.py` contient surtout des pistes, pas encore
  une implémentation stabilisée.

## Livrables Attendus

1. Un inventaire clair des colonnes exploitables et de leur sens.
2. Une pipeline métriques exécutable sans incohérences de schéma.
3. Trois à cinq indicateurs métier documentés et justifiés.
4. Des scores métier calculés de manière reproductible.
5. Des tests simples sur les calculs critiques.
6. Une courte doc expliquant chaque score.

## Priorites

### P0

- réactiver proprement `metrics_pipeline` ;
- corriger les incohérences de colonnes dans les jobs Spark ;
- choisir les indicateurs réellement utiles au produit.

### P1

- implémenter un score immobilier ;
- implémenter un score santé ;
- implémenter un score éducation ou famille ;
- documenter les formules et hypothèses.

### P2

- ajouter des tests de non-régression sur les calculs ;
- produire un export de contrôle pour relire les résultats ;
- préparer les scores à être exposés proprement au backend.

## Proposition D'Indicateurs

- **Tension immobilière** : effort nécessaire pour acheter ou se loger.
- **Densité de services** : quantité d'équipements par habitant.
- **Score santé** : accès aux médecins, spécialistes, pharmacies et hôpitaux.
- **Score famille** : petite enfance, écoles, pédiatres, tension immobilière.
- **Score senior** : soins, pharmacies, hôpitaux, EHPA.
- **Score étudiant** : lycées, locataires, santé mentale, services.

## Dependances Avec Le Reste Du Groupe

- dépend du lot collecte pour la qualité et la couverture des sources ;
- dépend du lot nettoyage pour disposer de champs typés et cohérents ;
- alimente le backend avec des colonnes enrichies ou des scores prêts à exposer ;
- alimente le frontend avec des indicateurs compréhensibles côté utilisateur.

## Ordre De Travail Recommande

1. auditer les colonnes réellement présentes après nettoyage ;
2. stabiliser les jobs `metrics` sur ce schéma ;
3. calculer les métriques intermédiaires ;
4. construire les scores métier ;
5. tester sur un export réduit ;
6. documenter les résultats et passer la main au backend.

## Definition Courte Du Role

Le rôle n'est pas seulement "faire des stats". Il consiste à **fiabiliser,
enrichir et scorer les données** pour produire les indicateurs métier utilisés
par l'application.
