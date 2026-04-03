"""
Modeles de donnees du harvester BDMV.

Utilises a la fois par le scraper (construction des payloads) et par les
scripts de migration/export. Les TypedDict servent de contrat documentaire
pour les documents Mongo ; les dataclasses portent les donnees en memoire
pendant le scraping.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict


class QueueDoc(TypedDict, total=False):
    """Document de la collection city_pages_queue."""

    url: str
    source: str
    com_id: str
    nom_commune_guess: str
    is_processed: bool
    attempt_count: int
    processed_at: datetime
    last_error: str
    created_at: datetime
    updated_at: datetime


class CommuneHarvestDoc(TypedDict, total=False):
    """Document neste de la collection communes_harvest."""

    com: str
    nom_commune: str
    source: str
    admin_codes: Dict[str, Any]
    links: Dict[str, str]
    admin_details: Dict[str, Any]
    demography: Dict[str, Any]
    security: Dict[str, Any]
    quality_of_life: Dict[str, Any]
    services: Dict[str, Any]
    real_estate: Dict[str, Any]
    reviews_summary: Dict[str, Any]
    reviews_refs: Dict[str, Any]
    updated_at: datetime


class VilleIdealeNotesDoc(TypedDict, total=False):
    """Notes /10 Ville-Idéale, formatées pour Spark (float ou None)."""

    note_environnement_10: Optional[float]
    note_transports_10: Optional[float]
    note_sante_10: Optional[float]
    note_securite_10: Optional[float]
    note_sports_loisirs_10: Optional[float]
    note_culture_10: Optional[float]
    note_enseignement_10: Optional[float]
    note_commerces_10: Optional[float]
    note_qualite_vie_10: Optional[float]


class CommuneHarvestVIDoc(TypedDict, total=False):
    """Document de la collection communes_harvest_vi (Ville-Idéale)."""

    com: str
    nom_commune: str
    source: str
    links: Dict[str, str]
    notes: VilleIdealeNotesDoc
    nb_avis: Optional[int]
    reviews_refs: Dict[str, Any]
    updated_at: datetime


class CommuneDirectVIDoc(TypedDict, total=False):
    """Vue aplatie (Spark-ready) pour Ville-Idéale : collection communes_direct_vi."""

    com: str
    nom_commune: str
    source: str
    city_page: Optional[str]
    nb_avis: Optional[int]
    reviews_refs_count: Optional[int]
    reviews_refs_last_collected_at: Optional[datetime]
    updated_at: datetime
    note_environnement_10: Optional[float]
    note_transports_10: Optional[float]
    note_sante_10: Optional[float]
    note_securite_10: Optional[float]
    note_sports_loisirs_10: Optional[float]
    note_culture_10: Optional[float]
    note_enseignement_10: Optional[float]
    note_commerces_10: Optional[float]
    note_qualite_vie_10: Optional[float]


class CommuneDirectDVFDoc(TypedDict, total=False):
    """Indicateurs DVF agrégés injectés dans communes_direct (pivot com)."""

    com: str
    prix_m2_moyen_maison: Optional[float]
    prix_m2_moyen_appartement: Optional[float]
    nb_ventes_totales: Optional[int]
    dvf_last_ingested_at: datetime
    dvf_source: str


class RealEstateHistoryDoc(TypedDict, total=False):
    """Transaction DVF simplifiée stockée dans real_estate_history."""

    transaction_id: str
    source: str
    com: str
    id_mutation: Optional[str]
    code_postal: Optional[str]
    nom_commune: Optional[str]
    longitude: Optional[float]
    latitude: Optional[float]
    id_parcelle: Optional[str]
    date_mutation: Optional[str]
    nature_mutation: str
    type_local: Optional[str]
    valeur_fonciere: Optional[float]
    surface_reelle_bati: Optional[float]
    prix_m2: Optional[float]
    updated_at: datetime


@dataclass(slots=True)
class CityScrapePayload:
    """Payload intermediaire de collecte pour une commune."""

    com: str
    nom_commune: str
    metrics: Dict[str, Any] = field(default_factory=dict)
    security_services: Dict[str, Any] = field(default_factory=dict)
    real_estate: Dict[str, Any] = field(default_factory=dict)
    reviews_summary: Dict[str, Any] = field(default_factory=dict)
    reviews_full: List[Dict[str, Any]] = field(default_factory=list)

    def has_any_demographic_or_reviews(self) -> bool:
        m = self.metrics
        return any(
            m.get(k)
            for k in (
                "nb_habitant",
                "age_moyen",
                "pop_active",
                "note_moyenne_globale",
            )
        )


@dataclass(slots=True)
class ReviewRawModel:
    """Avis brut avant upsert dans reviews_raw."""

    com: str
    source: str
    external_comment_id: Optional[str]
    text: str
    rating: Optional[Any]
    date: Optional[str]
    collected_at: datetime
    url_page: str
