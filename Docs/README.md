# Documentation

## Fichiers utiles

- `api-contract-communes.md`: contrat public du backend consomme par le frontend.
- `data-analysis.md`: perimetre du lot analyse, etat des jobs Spark et priorites.
- `mongo-final-structure.md`: structure cible des collections Mongo.
- `mongo-final-structure.md` remplace l'ancien renvoi cassé vers `scrap-bases.md`, qui n'existe pas dans ce repo.

## Pipeline locale

Ordre recommande pour remettre les donnees a jour:

```bash
docker compose down -v
docker compose up -d
python setup.py
python packages/scraping/script_BDMV.py
python spark/main.py
```

## Ce que fait chaque etape

- `setup.py`: Docker + migrations + chargement des donnees de base en Mongo.
- `script_BDMV.py`: scrap brut vers Mongo.
- `spark/main.py`: nettoyage, normalisation, calculs et upsert dans Postgres.

## Contrat et source de verite

- Postgres alimente les routes communes, geo, stats et ranking.
- Mongo est reserve aux reviews et aux donnees brutes du scrap.
- Le backend ne doit pas consommer les fakes du frontend pour les routes publiques.

## Reinitialisation

Si tu veux repartir de zero, supprime aussi les volumes Docker:

```bash
docker compose down -v
```

Puis relance la pipeline complete ci-dessus.
