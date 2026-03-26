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
