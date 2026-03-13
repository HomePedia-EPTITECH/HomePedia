import csv
from pathlib import Path
import requests


def generate_csv_communes(output_file=None):
    if output_file:
        output_path = Path(output_file)
    else:
        docker_data_dir = Path('/data')
        if docker_data_dir.exists():
            output_path = docker_data_dir / 'communes_2026.csv'
        else:
            output_path = Path(__file__).resolve().parent / 'data' / 'communes_2026.csv'

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Récupérer TOUTES les communes de l'API Géo
    print("Connexion à l'API Géo (gouv.fr)...")
    api_url = "https://geo.api.gouv.fr/communes?fields=nom,code,codeDepartement"

    try:
        response = requests.get(api_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel API : {e}")
        return

    communes_api = response.json()
    list_final = []

    print("Filtrage des communes (exclusion DOM-TOM)...")
    for item in communes_api:
        code_dept = item.get('codeDepartement', '')

        # Filtre : On exclut les codes commençant par 97 (DROM) et 98 (COM)
        if not (code_dept.startswith('97') or code_dept.startswith('98')):
            list_final.append({
                'com': item['code'].zfill(5),
                'nccenr': item['nom']
            })

    # Tri par code INSEE
    list_final.sort(key=lambda x: x['com'])

    # 2. Création/Écrasement du fichier CSV
    try:
        with output_path.open(mode='w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['com', 'nccenr'])
            writer.writeheader()
            writer.writerows(list_final)
        print(f"Succès ! Fichier '{output_path}' généré avec {len(list_final)} communes.")
    except IOError as e:
        print(f"Erreur lors de l'écriture du fichier : {e}")


if __name__ == "__main__":
    generate_csv_communes()