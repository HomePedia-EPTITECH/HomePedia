export type CommuneSize = "village" | "ville" | "metropole";

export type CommuneNotes = {
  environnement: number | null;
  transports: number | null;
  sante: number | null;
  securite: number | null;
  sportsLoisirs: number | null;
  culture: number | null;
  enseignement: number | null;
  commerces: number | null;
  qualiteVie: number | null;
};

export type CommuneServices = {
  sante: {
    medecins: number | null;
    specialistes: number | null;
    pharmacies: number | null;
    hopitaux: number | null;
  };
  education: {
    creches: number | null;
    ecolesMaternelles: number | null;
    ecolesPrimaires: number | null;
    colleges: number | null;
    lycees: number | null;
  };
  commerces: {
    hypermarches: number | null;
    supermarches: number | null;
    restaurants: number | null;
    banques: number | null;
    boulangeries: number | null;
  };
};

export type CommuneSalary = {
  cadre: number | null;
  profIntermediaire: number | null;
  employe: number | null;
  ouvrier: number | null;
  total: number | null;
};

export type CommuneRecord = {
  id: string;
  nom: string;
  codePostal: string | null;
  codeDept: string | null;
  regionCode: string | null;
  departement: string | null;
  region: string | null;
  metropole: string | null;
  taille: CommuneSize;
  lon: number | null;
  lat: number | null;

  population: number | null;
  densite: number | null;
  superficie: number | null;
  ageMoyen: number | null;
  revenuMoyen: number | null;
  tauxChomage: number | null;

  prixM2Maison: number | null;
  prixM2Appartement: number | null;
  partProprietaires: number | null;
  partLocataires: number | null;
  partResidencesPrincipales: number | null;
  partResidencesSecondaires: number | null;

  agressions: number | null;
  cambriolages: number | null;
  volsDegradations: number | null;
  stupefiants: number | null;

  notes: CommuneNotes;
  noteGlobale: number | null;
  nbAvis: number | null;

  services: CommuneServices;
  salary: CommuneSalary;
  source: string | null;
  cityPage: string | null;
  avisPage: string | null;
  updatedAt: string | null;
};

export type CommuneAvisRecord = {
  auteur: string;
  note: number | null;
  sentiment: "positif" | "negatif";
  texte: string;
};

export type CommunePriceHistoryRecord = {
  annee: number;
  prixM2: number;
};

export type CommuneAgeDistributionRecord = {
  tranche: string;
  part: number;
};

export type CommuneDetailRecord = CommuneRecord & {
  avis: CommuneAvisRecord[];
  prixHistorique: CommunePriceHistoryRecord[];
  ageDistribution: CommuneAgeDistributionRecord[];
};
