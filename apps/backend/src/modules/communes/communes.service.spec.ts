import { CommunesService } from "./communes.service";
import type { CommuneRecord } from "./communes.types";

function makeCommune(
  id: string,
  nom: string,
  codeDept: string,
  pharmacies: number,
  medecins = pharmacies,
  specialistes = pharmacies,
  hopitaux = pharmacies,
): CommuneRecord {
  return {
    id,
    nom,
    codePostal: "00000",
    codeDept,
    regionCode: codeDept === "01" ? "84" : "93",
    departement: codeDept === "01" ? "Ain" : "Seine-Saint-Denis",
    region: codeDept === "01" ? "Auvergne-Rhone-Alpes" : "Ile-de-France",
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
      sante: 3,
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
      medecins,
      pharmacies,
      hopitaux,
      specialistes,
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

describe("CommunesService rank normalization", () => {
  it("normalizes scores on the filtered subset instead of the full catalogue", async () => {
    const communesRepository = {
      loadCatalogue: jest.fn().mockResolvedValue([
        makeCommune("01001", "Alpha", "01", 0),
        makeCommune("01002", "Beta", "01", 10),
        makeCommune("93001", "Gamma", "93", 100),
      ]),
    };

    const regionsRepository = {
      findDepartementsByRegionCode: jest.fn(),
    };

    const service = new CommunesService(
      communesRepository as never,
      regionsRepository as never,
    );

    const importance = {
      pouvoirAchat: 0,
      securite: 0,
      qualiteVie: 0,
      ecoles: 0,
      sante: 3,
      emploi: 0,
      commerces: 0,
      transports: 0,
      cultureLoisirs: 0,
    } as const;

    const unfiltered = await service.rank({
      filters: {},
      importance,
      page: 1,
      limit: 10,
    } as never);

    const filtered = await service.rank({
      filters: { departementIds: ["01"] },
      importance,
      page: 1,
      limit: 10,
    } as never);

    const betaAll = unfiltered.data.find((item) => item.commune.id === "01002");
    const betaFiltered = filtered.data.find((item) => item.commune.id === "01002");

    expect(betaAll?.breakdown.sante).toBeLessThan(betaFiltered?.breakdown.sante ?? 0);
    expect(betaFiltered?.breakdown.sante).toBe(100);
  });
});
