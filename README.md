# HomePedia

Lancer le projet (MongoDB + données) puis le scrap.

## Prérequis

- **Docker** installé et démarré
- **Python 3** avec `pip install -r requirements.txt`

## Premier lancement

1. **Configurer l’environnement**  
   Copie `.env.example` en `.env` à la racine et remplis les identifiants Mongo.

2. **Démarrer les bases et charger les données**  
   À la racine du projet :

   ```bash
   python setup.py
   ```

   Cela lance Docker, attend Mongo, applique les migrations et charge les données.

3. **Lancer le scrap** (optionnel)

   ```bash
   python packages/scraping/script_BDMV.py
   ```

## Suite

- **Conteneurs déjà démarrés** : `python setup.py` pour refaire uniquement migrations + chargement des données.
- **Détails** (migrations, baseline, réinitialisation, etc.) : voir le dossier **`Docs/`**.

## Répartition

- **Récupération et croisement des sources** : scraping et ingestion brute.
- **Nettoyage des données** : normalisation, typage, suppression des valeurs aberrantes.
- **Frontend / backend prototype** : UI React + API NestJS sur données mockées.
- **Branchement de la vraie base au backend** : exposition API sur les données réelles.
- **Affichage des données sur le frontend** : intégration UI de l'API.
- **Analyse des données** : voir [Docs/data-analysis.md](Docs/data-analysis.md).
