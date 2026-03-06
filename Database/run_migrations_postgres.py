"""
Applique les migrations PostgreSQL en attente (celles pas encore dans bdd.schema_migrations).
À lancer après « docker compose up », depuis la racine du projet : python Database/run_migrations_postgres.py

Les fichiers dans Database/postgres/migrations/ sont exécutés dans l’ordre du nom (01_..., 02_..., 14_..., etc.).
Si tu as déjà appliqué des migrations à la main (ex. 01 à 14), enregistre-les une fois pour ne pas les rejouer :

  INSERT INTO bdd.schema_migrations (name) VALUES
    ('01_init_communes.sql'), ('02_seed_communes.sql'), ... ('14_xxx.sql')
  ON CONFLICT (name) DO NOTHING;
"""

import subprocess
import sys
from pathlib import Path

import psycopg2

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from util.config import get_pg_params

ROOT = _ROOT
MIGRATIONS_DIR = ROOT / "Database" / "postgres" / "migrations"


def ensure_schema_migrations_table(conn):
    """Crée la table de suivi si elle n’existe pas (DB déjà existante sans init récent)."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bdd.schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT now()
            );
        """)
    conn.commit()


def get_applied(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM bdd.schema_migrations")
        return {row[0] for row in cur.fetchall()}


def record_applied(conn, name):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO bdd.schema_migrations (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (name,),
        )
    conn.commit()


def main():
    if not MIGRATIONS_DIR.is_dir():
        print(f"[Postgres migrations] Dossier introuvable : {MIGRATIONS_DIR}")
        sys.exit(1)

    files = sorted(f for f in MIGRATIONS_DIR.iterdir() if f.suffix.lower() == ".sql")
    if not files:
        print("[Postgres migrations] Aucun fichier .sql dans", MIGRATIONS_DIR)
        return

    pg = get_pg_params()
    try:
        conn = psycopg2.connect(**pg)
    except Exception as e:
        print("[Postgres migrations] Connexion impossible :", e)
        sys.exit(1)

    ensure_schema_migrations_table(conn)
    applied = get_applied(conn)

    for path in files:
        name = path.name
        if name in applied:
            print(f"[Postgres migrations] Déjà appliqué : {name}")
            continue
        print(f"[Postgres migrations] Application : {name}")
        cmd = [
            "docker",
            "compose",
            "exec",
            "-T",
            "postgres",
            "psql",
            "-U",
            pg["user"],
            "-d",
            pg["dbname"],
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            f"/migrations/{name}",
        ]
        result = subprocess.run(cmd, cwd=ROOT)
        if result.returncode != 0:
            print(f"[Postgres migrations] Erreur lors de {name}")
            conn.close()
            sys.exit(result.returncode)
        record_applied(conn, name)

    conn.close()
    print("[Postgres migrations] Terminé.")


if __name__ == "__main__":
    main()
