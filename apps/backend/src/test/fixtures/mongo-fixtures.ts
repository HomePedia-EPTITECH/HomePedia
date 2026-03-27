import { Document } from "mongodb";
import { MongoSeedCollections } from "../mongo-integration";

export function createMongoFixtures(): MongoSeedCollections {
  return {
    communes_direct: createCommunesDirectFixtures(),
    communes_harvest: createCommunesHarvestFixtures(),
    reviews_raw: createReviewsRawFixtures(),
    departements: createDepartementsFixtures()
  };
}

function createCommunesDirectFixtures(): Document[] {
  return [
    {
      com: "75056",
      nom_commune: "Paris",
      source: "ville-ideale",
      city_page: "https://example.test/cities/paris",
      avis_page: "https://example.test/cities/paris/reviews",
      code_dept: "75",
      code_postal: "75000",
      nom_region: "Ile-de-France",
      nom_departement: "Paris",
      nom_metropole: "Metropole du Grand Paris",
      nom_maire: "Anne Hidalgo",
      reviews_refs_count: "120",
      reviews_refs_last_collected_at: new Date("2026-03-24T09:00:00.000Z"),
      updated_at: new Date("2026-03-25T12:00:00.000Z"),
      note_moyenne_globale: "4,2",
      nb_avis: "120",
      prix_m2_maison: "10 500 EUR/m2",
      prix_m2_appartement: "9 800 EUR/m2",
      nb_habitant: "2 102 650",
      age_moyen: "39,7",
      pop_active: "67,4",
      score_securite: "3,1",
      score_environnement: "4,4",
      score_vie_pratique: "4,8",
      score_loisirs: "4,9",
      score_education: "4,5"
    },
    {
      com: "69123",
      nom_commune: "Lyon",
      source: "ville-ideale",
      city_page: "https://example.test/cities/lyon",
      avis_page: "https://example.test/cities/lyon/reviews",
      code_dept: "69",
      code_postal: "69000",
      nom_region: "Auvergne-Rhone-Alpes",
      nom_departement: "Rhone",
      nom_metropole: "Metropole de Lyon",
      nom_maire: "Gregory Doucet",
      reviews_refs_count: 80,
      reviews_refs_last_collected_at: new Date("2026-03-23T09:00:00.000Z"),
      updated_at: new Date("2026-03-24T12:00:00.000Z"),
      note_moyenne_globale: "3,8",
      nb_avis: "80",
      prix_m2_maison: "6 200",
      prix_m2_appartement: "5 100",
      nb_habitant: "530000",
      age_moyen: "38,4",
      pop_active: "65,1",
      score_securite: "3,8",
      score_environnement: "3,7",
      score_vie_pratique: "4,6",
      score_loisirs: "4,7",
      score_education: "4,3"
    },
    {
      com: "35238",
      nom_commune: "Rennes",
      source: "ville-ideale",
      city_page: "https://example.test/cities/rennes",
      avis_page: "https://example.test/cities/rennes/reviews",
      code_dept: "35",
      code_postal: "35000",
      nom_region: "Bretagne",
      nom_departement: "Ille-et-Vilaine",
      nom_metropole: "Rennes Metropole",
      nom_maire: "Nathalie Appere",
      reviews_refs_count: "15",
      reviews_refs_last_collected_at: new Date("2026-03-22T09:00:00.000Z"),
      updated_at: new Date("2026-03-23T12:00:00.000Z"),
      note_moyenne_globale: "4.6",
      nb_avis: 15,
      prix_m2_maison: "4 500",
      prix_m2_appartement: "4 200",
      nb_habitant: 225081,
      age_moyen: "36,9",
      pop_active: "64,2",
      score_securite: "4,4",
      score_environnement: "4,7",
      score_vie_pratique: "4,3",
      score_loisirs: "4,2",
      score_education: "4,4"
    }
  ];
}

function createCommunesHarvestFixtures(): Document[] {
  return [
    {
      com: "75056",
      nom_commune: "Paris",
      source: "ville-ideale",
      admin_codes: {
        code_dept: "75"
      },
      links: {
        city_page: "https://example.test/cities/paris",
        avis_page: "https://example.test/cities/paris/reviews"
      },
      admin_details: {
        code_postal: "75000",
        nom_region: "Ile-de-France",
        nom_departement: "Paris",
        nom_metropole: "Metropole du Grand Paris",
        nom_maire: "Anne Hidalgo"
      },
      demography: {
        nb_habitant: "2 102 650",
        age_moyen: "39,7",
        part_taux_proprietaires: "33,2"
      },
      security: {
        agressions: "12,5",
        cambriolages: "7,8"
      },
      quality_of_life: {
        note_moyenne_globale: "4,2",
        nb_avis: "120",
        score_securite: "3,1",
        score_education: "4,5",
        score_loisirs: "4,9",
        score_environnement: "4,4",
        score_vie_pratique: "4,8"
      },
      services: {
        nb_ecoles: 1234,
        nb_gares: 7
      },
      real_estate: {
        prix_m2_maison: "10 500 EUR/m2",
        prix_m2_appartement: "9 800 EUR/m2",
        part_taux_proprietaires: "33,2"
      },
      reviews_refs: {
        count: 120,
        last_collected_at: new Date("2026-03-24T09:00:00.000Z")
      },
      updated_at: new Date("2026-03-25T12:00:00.000Z")
    }
  ];
}

function createReviewsRawFixtures(): Document[] {
  return [
    {
      com: "75056",
      nom_commune: "Paris",
      source: "ville-ideale",
      external_comment_id: "paris-1",
      text: "Ville tres dynamique",
      rating: 5,
      date: "2026-03-20",
      collected_at: new Date("2026-03-24T09:00:00.000Z"),
      url_page: "https://example.test/cities/paris/reviews",
      sentiment_score: 0.91,
      sentiment_label: "positive"
    },
    {
      com: "75056",
      nom_commune: "Paris",
      source: "ville-ideale",
      external_comment_id: "paris-2",
      text: "Ville tres dynamique",
      rating: 5,
      date: "2026-03-21",
      collected_at: new Date("2026-03-24T09:05:00.000Z"),
      url_page: "https://example.test/cities/paris/reviews",
      sentiment_score: 0.88,
      sentiment_label: "positive"
    },
    {
      com: "75056",
      nom_commune: "Paris",
      source: "ville-ideale",
      external_comment_id: "paris-3",
      text: "Trafic dense",
      rating: 2,
      date: "2026-03-22",
      collected_at: new Date("2026-03-24T09:10:00.000Z"),
      url_page: "https://example.test/cities/paris/reviews",
      sentiment_score: -0.63,
      sentiment_label: "negative"
    },
    {
      com: "75056",
      nom_commune: "Paris",
      source: "ville-ideale",
      external_comment_id: "paris-4",
      text: "Beaucoup de services",
      rating: 4,
      date: "2026-03-23",
      collected_at: new Date("2026-03-24T09:15:00.000Z"),
      url_page: "https://example.test/cities/paris/reviews",
      sentiment_score: 0.2,
      sentiment_label: "neutral"
    }
  ];
}

function createDepartementsFixtures(): Document[] {
  return [
    {
      code_dept: "35",
      nom_departement: "Ille-et-Vilaine",
      updated_at: new Date("2026-03-23T12:00:00.000Z")
    },
    {
      code_dept: "69",
      nom_departement: "Rhone",
      updated_at: new Date("2026-03-24T12:00:00.000Z")
    },
    {
      code_dept: "75",
      nom_departement: "Paris",
      updated_at: new Date("2026-03-25T12:00:00.000Z")
    }
  ];
}
