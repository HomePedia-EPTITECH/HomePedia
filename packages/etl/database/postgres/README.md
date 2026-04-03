# Migrations PostgreSQL

## Utilisation

### Lancer toutes les migrations (PostgreSQL + MongoDB)

```bash
python packages/etl/database/run_migrations.py
```

### Lancer uniquement les migrations PostgreSQL

```bash
python packages/etl/database/run_migrations_postgres.py
```

## Créer une nouvelle migration

### 1. Créer un fichier SQL numéroté

Créez un fichier dans `packages/etl/database/postgres/migrations/` avec un nom numéroté :

```
packages/etl/database/postgres/migrations/
├── 00_init_migrations_table.sql  (obligatoire, créé automatiquement)
└── 01_create_communes_table.sql  (votre première migration)
```

### 2. Exemple : Migration pour créer une table

Fichier `01_create_communes_table.sql` :

```sql
-- Crée la table des communes
CREATE TABLE IF NOT EXISTS communes (
    id SERIAL PRIMARY KEY,
    code_insee VARCHAR(5) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    population INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crée un index pour les recherches
CREATE INDEX IF NOT EXISTS idx_communes_code ON communes(code_insee);
```

### 3. Lancer la migration

```bash
python packages/etl/database/run_migrations_postgres.py
```

**Résultat attendu :**
```
[PostgreSQL migrations] Application : 01_create_communes_table.sql
[PostgreSQL migrations] ✓ Appliqué : 01_create_communes_table.sql
[PostgreSQL migrations] Toutes les migrations sont à jour.
```

## Détails techniques

- **Fichier de suivi** : Une table `schema_migrations` enregistre toutes les migrations appliquées
- **Ordre d'exécution** : Numérique (00_, 01_, 02_, etc.)
- **Atomicité** : Chaque migration est soit entièrement appliquée, soit entièrement annulée (rollback)
- **Idempotence** : Les migrations appliquées ne sont pas exécutées deux fois

## Intégration dans Docker

Les migrations s'exécutent **après** le démarrage des conteneurs :

```bash
# Démarrer les services
docker compose --project-directory . -f docker/docker-compose.yml up -d

# Attendre que PostgreSQL soit prêt (~5s)
sleep 5

# Appliquer les migrations
python packages/etl/database/run_migrations.py
```

## Notes

- ✅ PostgreSQL doit être accessible et la base de données doit exister
- ✅ Les fichiers `.sql` doivent être en UTF-8
- ✅ Chaque migration peut contenir plusieurs requêtes SQL
- ✅ Les migrations sont versionnées avec le code source
