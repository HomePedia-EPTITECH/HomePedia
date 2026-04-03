"""
Applique les migrations PostgreSQL en attente (celles pas encore dans la table schema_migrations).

À lancer après le démarrage Docker, depuis la racine du projet :

  docker compose --project-directory . -f docker/docker-compose.yml up -d
  python packages/etl/database/run_migrations_postgres.py

Les fichiers dans packages/etl/database/postgres/migrations/ sont exécutés dans l'ordre du nom 
(00_..., 01_..., 02_..., etc.).

Exemple d'utilisation :
  1. Ajouter un nouveau fichier SQL : 01_create_users_table.sql
  2. Lancer ce script, qui va l'exécuter automatiquement
  3. La migration est enregistrée dans postgres -> schema_migrations
"""

import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    psycopg2 = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SHARED_DIR = PROJECT_ROOT / "packages" / "shared"
if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))

from util.config import get_postgres_params

DATABASE_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = DATABASE_DIR / "postgres" / "migrations"


def get_applied_migrations(conn):
    """Récupère la liste des migrations déjà appliquées."""
    with conn.cursor() as cur:
        # Crée la table si elle n'existe pas (première exécution)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        
        # Récupère les migrations déjà appliquées
        cur.execute("SELECT name FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def record_migration(conn, name):
    """Enregistre une migration comme appliquée."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO schema_migrations (name) VALUES (%s)",
            (name,)
        )
        conn.commit()


def main():
    if not psycopg2:
        print("[PostgreSQL migrations] psycopg2 requis : pip install psycopg2-binary")
        sys.exit(1)

    if not MIGRATIONS_DIR.is_dir():
        print(f"[PostgreSQL migrations] Dossier introuvable : {MIGRATIONS_DIR}")
        sys.exit(1)

    # Récupère tous les fichiers .sql triés par nom
    files = sorted(f for f in MIGRATIONS_DIR.iterdir() if f.suffix.lower() == ".sql")
    if not files:
        print("[PostgreSQL migrations] Aucun fichier .sql dans", MIGRATIONS_DIR)
        return

    # Récupère les paramètres PostgreSQL
    try:
        params = get_postgres_params()
    except Exception as e:
        print(f"[PostgreSQL migrations] Erreur de configuration : {e}")
        sys.exit(1)

    # Se connecte à PostgreSQL
    try:
        conn = psycopg2.connect(
            host=params["host"],
            port=params["port"],
            database=params["db_name"],
            user=params["user"],
            password=params["password"],
        )
    except psycopg2.Error as e:
        print(f"[PostgreSQL migrations] Connexion impossible : {e}")
        sys.exit(1)

    try:
        # Récupère les migrations déjà appliquées
        applied = get_applied_migrations(conn)

        # Exécute les migrations en attente
        for path in files:
            name = path.name
            if name in applied:
                print(f"[PostgreSQL migrations] Déjà appliqué : {name}")
                continue

            print(f"[PostgreSQL migrations] Application : {name}")
            try:
                with open(path, "r", encoding="utf-8") as f:
                    sql = f.read()

                with conn.cursor() as cur:
                    cur.execute(sql)
                    conn.commit()

                record_migration(conn, name)
                print(f"[PostgreSQL migrations] ✓ Appliqué : {name}")

            except psycopg2.Error as e:
                conn.rollback()
                print(f"[PostgreSQL migrations] ✗ Erreur lors de l'application {name} : {e}")
                sys.exit(1)

        print("[PostgreSQL migrations] Toutes les migrations sont à jour.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
