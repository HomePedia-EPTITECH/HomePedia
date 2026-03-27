"""
Configuration centralisée : chargement du .env et paramètres MongoDB.
Tous les scripts du projet peuvent importer depuis ici pour éviter de dupliquer le code config.
"""

import os
from pathlib import Path
from typing import Any, Dict

# Racine du projet (HomePedia/) : packages/shared/util -> parents[3]
PROJECT_ROOT = Path(__file__).resolve().parents[3]


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)


def get_pg_params() -> Dict[str, Any]:
    """Parametres PostgreSQL utilises par les scripts ETL et migrations."""
    return {
        "dbname": os.getenv("POSTGRES_DB", "homepedia"),
        "user": os.getenv("POSTGRES_USER", "admin"),
        "password": os.getenv("POSTGRES_PASSWORD", ""),
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
    }


def get_mongo_params() -> Dict[str, str]:
    """Paramètres Mongo (user, password, host, port, db_name)."""
    return {
        "user": os.getenv("MONGO_ROOT_USER") or os.getenv("MONGO_USER") or "root",
        "password": os.getenv("MONGO_ROOT_PASSWORD")
        or os.getenv("MONGO_PASSWORD")
        or "",
        "host": os.getenv("MONGO_HOST", "localhost"),
        "port": os.getenv("MONGO_PORT", "27017"),
        "db_name": os.getenv("MONGO_DB", "homepedia_raw"),
    }


def get_mongo_uri() -> str:
    """URI de connexion MongoDB (pour MongoClient(get_mongo_uri())). Utilise MONGO_URI si défini, sinon construit à partir des variables d'environnement."""
    uri = os.getenv("MONGO_URI")
    if uri:
        return uri
    p = get_mongo_params()
    if p["user"] and p["password"]:
        return f"mongodb://{p['user']}:{p['password']}@{p['host']}:{p['port']}/?authSource=admin"
    return f"mongodb://{p['host']}:{p['port']}/"


def get_mongo_db_name() -> str:
    """Nom de la base MongoDB (ex. homepedia_raw)."""
    return get_mongo_params()["db_name"]


load_env()
