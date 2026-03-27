"""
Applique les migrations PostgreSQL en attente.

A lancer apres `docker compose up`, depuis la racine du projet:

  python packages/etl/database/run_migrations_postgres.py
"""

import subprocess
import sys
from pathlib import Path

from packages.shared.util.config import get_pg_params

ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = ROOT.parent
MIGRATIONS_DIR = ROOT / "etl" / "database" / "postgres" / "migrations"
COMPOSE_FILE = PROJECT_ROOT / "docker" / "docker-compose.yml"


def ensure_schema_migrations_table(connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE SCHEMA IF NOT EXISTS bdd;
            CREATE TABLE IF NOT EXISTS bdd.schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT now()
            );
            """
        )
    connection.commit()


def get_applied(connection) -> set[str]:
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM bdd.schema_migrations")
        return {row[0] for row in cursor.fetchall()}


def record_applied(connection, name: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO bdd.schema_migrations (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (name,),
        )
    connection.commit()


def main() -> None:
    try:
        import psycopg2
    except ImportError as exc:
        print(f"[postgres migrations] psycopg2 indisponible: {exc}")
        sys.exit(1)

    files = sorted(path for path in MIGRATIONS_DIR.iterdir() if path.suffix.lower() == ".sql")
    if not files:
        print("[postgres migrations] Aucun fichier .sql a appliquer.")
        return

    pg = get_pg_params()
    try:
        connection = psycopg2.connect(**pg)
    except Exception as exc:
        print(f"[postgres migrations] Connexion impossible: {exc}")
        sys.exit(1)

    ensure_schema_migrations_table(connection)
    applied = get_applied(connection)

    for path in files:
        if path.name in applied:
            print(f"[postgres migrations] Deja applique: {path.name}")
            continue

        command = [
            "docker",
            "compose",
            "--project-directory",
            str(COMPOSE_FILE.parent),
            "-f",
            str(COMPOSE_FILE),
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
            f"/migrations/{path.name}",
        ]
        result = subprocess.run(command, cwd=PROJECT_ROOT)
        if result.returncode != 0:
            connection.close()
            sys.exit(result.returncode)
        record_applied(connection, path.name)

    connection.close()
    print("[postgres migrations] Toutes les migrations sont a jour.")


if __name__ == "__main__":
    main()
