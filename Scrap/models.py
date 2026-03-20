from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict


class QueueDoc(TypedDict, total=False):
    url: str
    com_id: str
    nom_commune_guess: str
    is_processed: bool
    attempt_count: int
    processed_at: datetime
    last_error: str
    created_at: datetime
    updated_at: datetime


class CommuneHarvestDoc(TypedDict, total=False):
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


@dataclass(slots=True)
class CityScrapePayload:
    """Modele aggregate de collecte pour une commune."""

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
    com: str
    source: str
    external_comment_id: Optional[str]
    text: str
    rating: Optional[Any]
    date: Optional[str]
    collected_at: datetime
    url_page: str
