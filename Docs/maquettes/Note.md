# HomePedia — Spec maquette v2

## Cible utilisateur
Personnes souhaitant **changer de ville**, principalement selon des critères **financiers et immobiliers**.

## Parcours utilisateur

```
Landing + Quiz
    ↓
Résultats personnalisés ←→ Carte MapBox
    ↓
Fiche ville
    ↓
Comparateur (ville A vs B)
```

---

## Design System

- Dark mode exclusivement
- Couleur principale : `#3B82F6` (bleu)
- Composants : shadcn/ui style
- Charts : multi-couleur
- Typo : sans-serif moderne, hiérarchie claire

## Navigation globale

```
[Logo]  [Accueil]  [Carte]  [Classements]  [Comparer]    [🔍 Recherche...]
```

- Recherche universelle toujours visible (autocomplete villes/depts/régions)
- Breadcrumb contextuel sur Fiche ville et Comparateur

---

## Screen 1 — Landing + Quiz

**Objectif :** Engager l'utilisateur, collecter ses critères.

- Header : Logo gauche + barre de recherche rapide droite
- Hero : Headline "Trouvez votre prochaine ville" + sous-titre
- **Quiz étape 1** — Budget logement :
  - Slider prix m² ou 3 tranches (<1 000€ | 1 000–1 500€ | >1 500€/mois)
- **Quiz étape 2** — Priorités (checkboxes avec icônes) :
  - Sécurité | Prix immobilier | Écoles | Transport | Nature | Emploi/Revenus
- CTA : "Trouver mes villes →"

---

## Screen 2 — Résultats personnalisés

**Objectif :** Classement des villes avec score personnalisé recalculé en temps réel.

- Filtres haut : Région | Département | Taille (village/ville/métropole) | Réinitialiser
- **Sidebar gauche — Panneau score perso :**
  - Curseurs pondération (0–100%) :
    - Prix immobilier m²
    - Sécurité
    - Qualité de vie
    - Écoles
    - Services de santé
    - Revenus médians
- **Zone principale :**
  - Toggle : Liste | Carte
  - Tableau : Rang | Ville | Département | Score /100 | Prix m² | Prix maison | Prix appart | Sécurité | Qualité vie
  - Chaque ligne cliquable → Fiche ville
  - Bouton "+ Comparer" sur chaque ligne
  - 30 villes par page

**Données :** `prix_m2_maison`, `prix_m2_appartement`, `note_qualite_vie_10`, `note_securite_10`, `revenu_moyen`, `taux_chomage`

---

## Screen 3 — Carte MapBox

**Objectif :** Vue géographique plein écran.

- Full-map dark style
- **Sidebar gauche (collapsible) :**
  - Filtre budget max (slider prix m²)
  - Filtre score minimum
  - Filtre région/département
  - Filtre type commune
- **Pins :**
  - Couleur par score : rouge → orange → vert
  - Taille proportionnelle à la population
  - Clic → popup : Nom ville | Score | Prix m² | [Voir fiche] [+ Comparer]
- Légende couleur bas-droite
- Bouton "Liste" pour revenir aux résultats

---

## Screen 4 — Fiche ville

**Objectif :** Page détail complète pour décider.

- **Hero :** Nom + Département + Région | Score /100 | KPIs : Prix m² | Prix maison | Prix appart | Population | Boutons [+ Comparer] [← Retour]
- **Prix immobilier :** Cards prix maison/appart | % Propriétaires/Locataires | % Résidences principales/secondaires/vacantes | Courbe évolution historique (DVF)
- **Qualité de vie :** Radar chart 9 dimensions (Ville-Idéale) : Environnement | Transports | Santé | Sécurité | Sports/Loisirs | Culture | Enseignement | Commerces | Qualité vie — Note globale + nb avis
- **Démographie :** Population | Densité | Superficie | Âge moyen | Distribution par tranche (bar chart) | Revenu moyen | Taux chômage
- **Sécurité :** Agressions | Cambriolages | Vols/dégradations | Stupéfiants — comparaison moyenne nationale
- **Services (tabs) :**
  - Santé : médecins, pharmacies, hôpitaux, spécialistes
  - Éducation : crèches, maternelles, primaires, collèges, lycées
  - Commerces : grandes surfaces, restaurants, banques, boulangeries
- **Avis :** Reviews textuelles (sentiment +/-) | Note globale | Distribution étoiles

---

## Screen 5 — Comparateur

**Objectif :** Comparer 2–3 villes côte à côte pour trancher.

- Sélecteurs villes en header (autocomplete, max 3)
- **Tableau comparatif :**
  - Prix immobilier (m², maison, appart)
  - Qualité de vie globale
  - Sécurité
  - Démographie (population, revenus, chômage)
  - Services (score agrégé santé/écoles/commerces)
  - Score personnalisé (reprend pondérations Screen 2)
- Meilleure valeur par ligne mise en vert
- Mini radar chart superposé
- CTA : "Voir fiche complète" par ville

---

## Ordre de travail Penpot

1. Design system (couleurs, typographie, composants : cards, badges, boutons, tableaux, sliders)
2. Screen 1 — Landing + Quiz
3. Screen 2 — Résultats personnalisés
4. Screen 4 — Fiche ville
5. Screen 3 — Carte MapBox
6. Screen 5 — Comparateur

## Fichier à produire

`Docs/maquettes/dashboard-v2.pen`
