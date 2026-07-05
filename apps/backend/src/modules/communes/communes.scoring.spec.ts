import { buildScoreRanges, scoreBreakdown } from "./communes.scoring";
import type { CommuneRecord } from "./communes.types";

function makeCommune(id: string, nom: string, pharmacies: number): CommuneRecord {
  return {
    id,
    nom,
    codePostal: "00000",
    codeDept: "01",
    regionCode: "84",
    departement: "Ain",
    region: "Auvergne-Rhone-Alpes",
    metropole: null,
    taille: "village",
    lon: null,
    lat: null,
    population: 1000,
    densite: 100,
    superficie: 10,
    ageMoyen: 40,
    revenuMoyen: 20000,
    tauxChomage: 8,
    prixM2Maison: 2000,
    prixM2Appartement: 1800,
    partProprietaires: 50,
    partLocataires: 50,
    partResidencesPrincipales: 90,
    partResidencesSecondaires: 5,
    partResidencesVacantes: 5,
    agressions: 10,
    cambriolages: 5,
    volsDegradations: 8,
    stupefiants: 2,
    notes: {
      environnement: 3,
      transports: 3,
      sante: null,
      securite: 3,
      sportsLoisirs: 3,
      culture: 3,
      enseignement: 3,
      commerces: 3,
      qualiteVie: 3,
    },
    noteGlobale: 3,
    nbAvis: 10,
    services: {
      medecins: 2,
      pharmacies,
      hopitaux: 0,
      specialistes: 1,
      creches: 1,
      ecolesMaternelles: 1,
      ecolesPrimaires: 1,
      colleges: 1,
      lycees: 1,
      hypermarches: 1,
      supermarches: 1,
      restaurants: 4,
      banques: 2,
      boulangeries: 3,
    },
    salary: {
      cadre: 3000,
      profIntermediaire: 2400,
      employe: 1800,
      ouvrier: 1700,
      total: 2200,
    },
  };
}

describe("communes scoring", () => {
  it("gives health more credit when pharmacies are available", () => {
    const lowPharmacy = makeCommune("00001", "Commune faible", 0);
    const highPharmacy = makeCommune("00002", "Commune forte", 12);

    const ranges = buildScoreRanges([lowPharmacy, highPharmacy]);
    const lowBreakdown = scoreBreakdown(lowPharmacy, ranges);
    const highBreakdown = scoreBreakdown(highPharmacy, ranges);

    expect(lowBreakdown.sante).toBeLessThan(highBreakdown.sante);
    expect(highBreakdown.sante).toBeGreaterThan(50);
  });
});
