# HomePedia

Lancer le projet (PostgreSQL + MongoDB + données) puis le scrap.

## Prérequis

- **Docker** installé et démarré
- **Python 3** avec `pip install -r requirements.txt`

## Premier lancement

1. **Configurer l’environnement**  
   Copie `.env.example` en `.env` à la racine et remplis les identifiants (Postgres, Mongo).

2. **Démarrer les bases et charger les données**  
   À la racine du projet :

   ```bash
   python setup.py
   ```

   Cela lance Docker, attend que Postgres et Mongo soient prêts, applique les migrations et charge les données (communes, etc.).

3. **Lancer le scrap** (optionnel)

   ```bash
   python Scrap/script_BDMV.py
   ```

## Suite

- **Conteneurs déjà démarrés** : `python Database/main.py` pour refaire uniquement migrations + chargement des données.
- **Détails** (migrations, baseline, réinitialisation, etc.) : voir le dossier **`Docs/`**.
