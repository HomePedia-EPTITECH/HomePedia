import type {
  AvisCommune,
  Commune,
  NotesQualiteVie,
  TailleCommune,
} from "./types"

/**
 * Jeu de données mock : villes françaises réelles avec coordonnées.
 * Les champs "cœur" (prix, revenus, sécurité, notes) sont saisis à la main
 * pour rester plausibles ; les champs secondaires (historique de prix,
 * pyramide des âges, services, avis) sont dérivés de façon déterministe.
 */

interface Seed {
  id: string
  nom: string
  cp: string
  dep: string
  region: string
  metropole?: string
  taille: TailleCommune
  lon: number
  lat: number
  population: number
  densite: number
  superficie: number
  ageMoyen: number
  revenuMoyen: number
  tauxChomage: number
  prixM2Maison: number
  prixM2Appartement: number
  partProprietaires: number
  // sécurité pour 1 000 hab / an
  agr: number
  camb: number
  vols: number
  stup: number
  // notes /10 : [env, transp, sante, secu, sport, culture, enseign, commerce, qv]
  notes: [number, number, number, number, number, number, number, number, number]
  noteGlobale: number
  nbAvis: number
}

// prettier-ignore
const SEEDS: Seed[] = [
  { id: "75056", nom: "Paris", cp: "75001", dep: "Paris", region: "Île-de-France", metropole: "Métropole du Grand Paris", taille: "metropole", lon: 2.3522, lat: 48.8566, population: 2102650, densite: 20000, superficie: 105, ageMoyen: 41, revenuMoyen: 39200, tauxChomage: 11.2, prixM2Maison: 11200, prixM2Appartement: 10800, partProprietaires: 33, agr: 14.2, camb: 9.1, vols: 38.4, stup: 6.1, notes: [5.4, 9.1, 8.6, 4.7, 8.9, 9.8, 8.2, 9.6, 7.1], noteGlobale: 3.9, nbAvis: 4820 },
  { id: "69123", nom: "Lyon", cp: "69001", dep: "Rhône", region: "Auvergne-Rhône-Alpes", metropole: "Métropole de Lyon", taille: "metropole", lon: 4.8357, lat: 45.7640, population: 522969, densite: 10800, superficie: 48, ageMoyen: 38, revenuMoyen: 32100, tauxChomage: 9.8, prixM2Maison: 5600, prixM2Appartement: 5100, partProprietaires: 38, agr: 9.8, camb: 6.4, vols: 27.1, stup: 4.8, notes: [6.5, 8.4, 8.3, 5.6, 8.1, 8.9, 8.0, 8.7, 7.8], noteGlobale: 4.2, nbAvis: 2610 },
  { id: "13055", nom: "Marseille", cp: "13001", dep: "Bouches-du-Rhône", region: "Provence-Alpes-Côte d'Azur", metropole: "Aix-Marseille-Provence", taille: "metropole", lon: 5.3698, lat: 43.2965, population: 870018, densite: 3600, superficie: 240, ageMoyen: 40, revenuMoyen: 24800, tauxChomage: 13.4, prixM2Maison: 4200, prixM2Appartement: 3650, partProprietaires: 44, agr: 15.6, camb: 8.7, vols: 41.2, stup: 9.4, notes: [6.8, 6.9, 7.4, 4.1, 8.4, 8.2, 6.8, 7.9, 6.7], noteGlobale: 3.6, nbAvis: 3140 },
  { id: "31555", nom: "Toulouse", cp: "31000", dep: "Haute-Garonne", region: "Occitanie", metropole: "Toulouse Métropole", taille: "metropole", lon: 1.4442, lat: 43.6047, population: 493465, densite: 4200, superficie: 118, ageMoyen: 37, revenuMoyen: 29400, tauxChomage: 10.1, prixM2Maison: 3900, prixM2Appartement: 3550, partProprietaires: 41, agr: 9.1, camb: 6.0, vols: 25.8, stup: 5.2, notes: [6.7, 7.6, 8.1, 5.4, 8.0, 8.3, 8.1, 8.2, 7.6], noteGlobale: 4.1, nbAvis: 1980 },
  { id: "33063", nom: "Bordeaux", cp: "33000", dep: "Gironde", region: "Nouvelle-Aquitaine", metropole: "Bordeaux Métropole", taille: "metropole", lon: -0.5792, lat: 44.8378, population: 260958, densite: 5300, superficie: 49, ageMoyen: 38, revenuMoyen: 30200, tauxChomage: 9.9, prixM2Maison: 4900, prixM2Appartement: 4600, partProprietaires: 36, agr: 8.9, camb: 6.3, vols: 26.4, stup: 4.6, notes: [6.9, 7.7, 8.0, 5.3, 7.8, 8.6, 7.9, 8.4, 7.9], noteGlobale: 4.2, nbAvis: 2240 },
  { id: "59350", nom: "Lille", cp: "59000", dep: "Nord", region: "Hauts-de-France", metropole: "Métropole Européenne de Lille", taille: "metropole", lon: 3.0573, lat: 50.6292, population: 236234, densite: 6800, superficie: 35, ageMoyen: 33, revenuMoyen: 25600, tauxChomage: 12.6, prixM2Maison: 3400, prixM2Appartement: 3200, partProprietaires: 32, agr: 11.2, camb: 7.1, vols: 30.1, stup: 6.8, notes: [5.8, 8.0, 7.8, 4.8, 7.6, 8.4, 8.3, 8.1, 7.2], noteGlobale: 3.9, nbAvis: 1760 },
  { id: "44109", nom: "Nantes", cp: "44000", dep: "Loire-Atlantique", region: "Pays de la Loire", metropole: "Nantes Métropole", taille: "metropole", lon: -1.5536, lat: 47.2184, population: 320732, densite: 4900, superficie: 65, ageMoyen: 37, revenuMoyen: 29100, tauxChomage: 9.4, prixM2Maison: 4100, prixM2Appartement: 3800, partProprietaires: 39, agr: 8.4, camb: 5.9, vols: 24.6, stup: 4.9, notes: [7.2, 7.8, 8.0, 5.6, 7.9, 8.2, 8.0, 8.0, 8.1], noteGlobale: 4.3, nbAvis: 2010 },
  { id: "67482", nom: "Strasbourg", cp: "67000", dep: "Bas-Rhin", region: "Grand Est", metropole: "Eurométropole de Strasbourg", taille: "metropole", lon: 7.7521, lat: 48.5734, population: 291313, densite: 3600, superficie: 78, ageMoyen: 37, revenuMoyen: 27800, tauxChomage: 11.0, prixM2Maison: 3700, prixM2Appartement: 3450, partProprietaires: 35, agr: 9.6, camb: 6.7, vols: 27.9, stup: 5.7, notes: [6.6, 8.1, 7.9, 5.1, 7.7, 8.5, 8.0, 8.0, 7.5], noteGlobale: 4.0, nbAvis: 1490 },
  { id: "34172", nom: "Montpellier", cp: "34000", dep: "Hérault", region: "Occitanie", metropole: "Montpellier Méditerranée Métropole", taille: "metropole", lon: 3.8767, lat: 43.6108, population: 299096, densite: 5300, superficie: 57, ageMoyen: 36, revenuMoyen: 25200, tauxChomage: 12.9, prixM2Maison: 4000, prixM2Appartement: 3600, partProprietaires: 34, agr: 10.4, camb: 6.9, vols: 29.2, stup: 6.4, notes: [7.0, 7.3, 7.7, 4.9, 8.2, 8.1, 7.8, 7.9, 7.6], noteGlobale: 4.0, nbAvis: 1680 },
  { id: "06088", nom: "Nice", cp: "06000", dep: "Alpes-Maritimes", region: "Provence-Alpes-Côte d'Azur", metropole: "Métropole Nice Côte d'Azur", taille: "metropole", lon: 7.2620, lat: 43.7102, population: 342669, densite: 4700, superficie: 72, ageMoyen: 44, revenuMoyen: 27400, tauxChomage: 11.3, prixM2Maison: 5400, prixM2Appartement: 4900, partProprietaires: 42, agr: 10.9, camb: 6.5, vols: 28.7, stup: 5.9, notes: [7.4, 7.1, 7.8, 5.0, 8.3, 8.0, 7.3, 7.8, 7.4], noteGlobale: 4.0, nbAvis: 1920 },
  { id: "35238", nom: "Rennes", cp: "35000", dep: "Ille-et-Vilaine", region: "Bretagne", metropole: "Rennes Métropole", taille: "metropole", lon: -1.6778, lat: 48.1173, population: 222485, densite: 4500, superficie: 50, ageMoyen: 35, revenuMoyen: 28600, tauxChomage: 9.2, prixM2Maison: 3800, prixM2Appartement: 3600, partProprietaires: 37, agr: 8.2, camb: 5.6, vols: 23.4, stup: 4.7, notes: [7.3, 7.9, 8.1, 5.8, 7.8, 8.3, 8.4, 8.0, 8.2], noteGlobale: 4.3, nbAvis: 1520 },
  { id: "38185", nom: "Grenoble", cp: "38000", dep: "Isère", region: "Auvergne-Rhône-Alpes", metropole: "Grenoble-Alpes Métropole", taille: "metropole", lon: 5.7245, lat: 45.1885, population: 158454, densite: 8900, superficie: 18, ageMoyen: 38, revenuMoyen: 27300, tauxChomage: 11.5, prixM2Maison: 3200, prixM2Appartement: 2700, partProprietaires: 34, agr: 10.1, camb: 6.8, vols: 28.3, stup: 6.2, notes: [7.6, 7.8, 8.0, 4.8, 8.5, 8.0, 8.2, 7.8, 7.5], noteGlobale: 3.9, nbAvis: 1330 },
  { id: "21231", nom: "Dijon", cp: "21000", dep: "Côte-d'Or", region: "Bourgogne-Franche-Comté", metropole: "Dijon Métropole", taille: "ville", lon: 5.0415, lat: 47.3220, population: 158002, densite: 3800, superficie: 40, ageMoyen: 39, revenuMoyen: 26700, tauxChomage: 10.4, prixM2Maison: 2900, prixM2Appartement: 2500, partProprietaires: 40, agr: 8.7, camb: 6.1, vols: 24.9, stup: 5.1, notes: [7.1, 7.4, 7.8, 5.4, 7.5, 8.1, 7.9, 7.7, 7.7], noteGlobale: 4.1, nbAvis: 980 },
  { id: "49007", nom: "Angers", cp: "49000", dep: "Maine-et-Loire", region: "Pays de la Loire", metropole: "Angers Loire Métropole", taille: "ville", lon: -0.5632, lat: 47.4784, population: 155850, densite: 4200, superficie: 42, ageMoyen: 38, revenuMoyen: 25400, tauxChomage: 10.2, prixM2Maison: 2800, prixM2Appartement: 2650, partProprietaires: 41, agr: 7.6, camb: 5.4, vols: 22.1, stup: 4.4, notes: [7.4, 7.2, 7.7, 6.0, 7.4, 8.0, 8.0, 7.6, 8.0], noteGlobale: 4.2, nbAvis: 1040 },
  { id: "51454", nom: "Reims", cp: "51100", dep: "Marne", region: "Grand Est", taille: "ville", lon: 4.0317, lat: 49.2583, population: 182460, densite: 3900, superficie: 47, ageMoyen: 38, revenuMoyen: 24900, tauxChomage: 11.4, prixM2Maison: 2500, prixM2Appartement: 2300, partProprietaires: 38, agr: 9.4, camb: 6.6, vols: 26.3, stup: 5.8, notes: [6.7, 7.0, 7.5, 5.1, 7.2, 7.8, 7.7, 7.4, 7.3], noteGlobale: 3.9, nbAvis: 870 },
  { id: "63113", nom: "Clermont-Ferrand", cp: "63000", dep: "Puy-de-Dôme", region: "Auvergne-Rhône-Alpes", metropole: "Clermont Auvergne Métropole", taille: "ville", lon: 3.0870, lat: 45.7772, population: 147865, densite: 3400, superficie: 43, ageMoyen: 38, revenuMoyen: 25800, tauxChomage: 10.0, prixM2Maison: 2600, prixM2Appartement: 2200, partProprietaires: 39, agr: 8.0, camb: 5.7, vols: 23.0, stup: 4.8, notes: [7.3, 7.1, 7.9, 5.6, 7.6, 7.9, 8.1, 7.5, 7.7], noteGlobale: 4.1, nbAvis: 910 },
  { id: "37261", nom: "Tours", cp: "37000", dep: "Indre-et-Loire", region: "Centre-Val de Loire", metropole: "Tours Métropole Val de Loire", taille: "ville", lon: 0.6848, lat: 47.3941, population: 136252, densite: 3900, superficie: 34, ageMoyen: 40, revenuMoyen: 25700, tauxChomage: 10.7, prixM2Maison: 3000, prixM2Appartement: 2750, partProprietaires: 37, agr: 8.5, camb: 6.0, vols: 24.2, stup: 5.0, notes: [7.2, 7.3, 7.8, 5.5, 7.3, 8.1, 7.9, 7.6, 7.6], noteGlobale: 4.1, nbAvis: 950 },
  { id: "29019", nom: "Brest", cp: "29200", dep: "Finistère", region: "Bretagne", metropole: "Brest Métropole", taille: "ville", lon: -4.4861, lat: 48.3904, population: 139163, densite: 2900, superficie: 50, ageMoyen: 39, revenuMoyen: 24600, tauxChomage: 9.8, prixM2Maison: 2300, prixM2Appartement: 2000, partProprietaires: 42, agr: 7.4, camb: 5.2, vols: 21.6, stup: 4.3, notes: [7.6, 6.8, 7.6, 6.2, 7.4, 7.7, 7.8, 7.3, 7.9], noteGlobale: 4.0, nbAvis: 760 },
  { id: "87085", nom: "Limoges", cp: "87000", dep: "Haute-Vienne", region: "Nouvelle-Aquitaine", taille: "ville", lon: 1.2611, lat: 45.8336, population: 130876, densite: 2700, superficie: 78, ageMoyen: 42, revenuMoyen: 23900, tauxChomage: 10.9, prixM2Maison: 1700, prixM2Appartement: 1500, partProprietaires: 45, agr: 7.1, camb: 5.0, vols: 20.8, stup: 4.1, notes: [7.3, 6.6, 7.4, 6.1, 7.0, 7.5, 7.6, 7.1, 7.6], noteGlobale: 4.0, nbAvis: 620 },
  { id: "54395", nom: "Nancy", cp: "54000", dep: "Meurthe-et-Moselle", region: "Grand Est", metropole: "Métropole du Grand Nancy", taille: "ville", lon: 6.1844, lat: 48.6921, population: 104885, densite: 6900, superficie: 15, ageMoyen: 38, revenuMoyen: 24700, tauxChomage: 11.1, prixM2Maison: 2400, prixM2Appartement: 2150, partProprietaires: 33, agr: 8.9, camb: 6.2, vols: 25.1, stup: 5.4, notes: [6.8, 7.4, 7.7, 5.3, 7.3, 8.0, 8.1, 7.5, 7.4], noteGlobale: 4.0, nbAvis: 700 },
  { id: "76540", nom: "Rouen", cp: "76000", dep: "Seine-Maritime", region: "Normandie", metropole: "Métropole Rouen Normandie", taille: "ville", lon: 1.0993, lat: 49.4432, population: 114083, densite: 5300, superficie: 21, ageMoyen: 39, revenuMoyen: 24300, tauxChomage: 11.6, prixM2Maison: 2700, prixM2Appartement: 2450, partProprietaires: 31, agr: 9.2, camb: 6.5, vols: 26.0, stup: 5.6, notes: [6.6, 7.2, 7.6, 5.0, 7.1, 7.9, 7.8, 7.4, 7.3], noteGlobale: 3.9, nbAvis: 680 },
  { id: "14118", nom: "Caen", cp: "14000", dep: "Calvados", region: "Normandie", metropole: "Caen la Mer", taille: "ville", lon: -0.3707, lat: 49.1829, population: 105512, densite: 4000, superficie: 26, ageMoyen: 38, revenuMoyen: 24800, tauxChomage: 10.5, prixM2Maison: 2900, prixM2Appartement: 2600, partProprietaires: 34, agr: 8.1, camb: 5.8, vols: 23.3, stup: 4.9, notes: [7.1, 7.1, 7.6, 5.7, 7.2, 7.8, 7.9, 7.4, 7.6], noteGlobale: 4.1, nbAvis: 640 },
  { id: "45234", nom: "Orléans", cp: "45000", dep: "Loiret", region: "Centre-Val de Loire", metropole: "Orléans Métropole", taille: "ville", lon: 1.9093, lat: 47.9029, population: 116269, densite: 4300, superficie: 27, ageMoyen: 39, revenuMoyen: 26100, tauxChomage: 10.3, prixM2Maison: 2800, prixM2Appartement: 2500, partProprietaires: 36, agr: 8.3, camb: 5.9, vols: 23.8, stup: 5.0, notes: [6.9, 7.2, 7.5, 5.5, 7.1, 7.7, 7.8, 7.5, 7.4], noteGlobale: 4.0, nbAvis: 590 },
  { id: "25056", nom: "Besançon", cp: "25000", dep: "Doubs", region: "Bourgogne-Franche-Comté", metropole: "Grand Besançon Métropole", taille: "ville", lon: 6.0241, lat: 47.2378, population: 119198, densite: 1900, superficie: 65, ageMoyen: 39, revenuMoyen: 24500, tauxChomage: 10.6, prixM2Maison: 2200, prixM2Appartement: 1950, partProprietaires: 38, agr: 7.8, camb: 5.5, vols: 22.0, stup: 4.6, notes: [7.7, 7.0, 7.6, 5.9, 7.5, 7.8, 7.9, 7.2, 7.8], noteGlobale: 4.1, nbAvis: 560 },
  { id: "74010", nom: "Annecy", cp: "74000", dep: "Haute-Savoie", region: "Auvergne-Rhône-Alpes", taille: "ville", lon: 6.1294, lat: 45.8992, population: 130721, densite: 1500, superficie: 67, ageMoyen: 41, revenuMoyen: 31800, tauxChomage: 7.6, prixM2Maison: 5100, prixM2Appartement: 4700, partProprietaires: 48, agr: 6.4, camb: 4.6, vols: 18.9, stup: 3.4, notes: [8.7, 7.2, 7.9, 6.8, 8.8, 7.9, 7.9, 7.6, 8.6], noteGlobale: 4.5, nbAvis: 1210 },
  { id: "17300", nom: "La Rochelle", cp: "17000", dep: "Charente-Maritime", region: "Nouvelle-Aquitaine", metropole: "Communauté d'agglomération de La Rochelle", taille: "ville", lon: -1.1511, lat: 46.1603, population: 77196, densite: 3200, superficie: 24, ageMoyen: 43, revenuMoyen: 26900, tauxChomage: 9.7, prixM2Maison: 4600, prixM2Appartement: 4200, partProprietaires: 43, agr: 7.0, camb: 5.1, vols: 21.0, stup: 4.0, notes: [8.2, 6.9, 7.7, 6.4, 8.4, 7.9, 7.7, 7.6, 8.4], noteGlobale: 4.4, nbAvis: 980 },
  { id: "64445", nom: "Pau", cp: "64000", dep: "Pyrénées-Atlantiques", region: "Nouvelle-Aquitaine", metropole: "Pau Béarn Pyrénées", taille: "ville", lon: -0.3708, lat: 43.2951, population: 76275, densite: 5200, superficie: 32, ageMoyen: 42, revenuMoyen: 25500, tauxChomage: 10.0, prixM2Maison: 2100, prixM2Appartement: 1850, partProprietaires: 40, agr: 7.2, camb: 5.0, vols: 20.4, stup: 4.2, notes: [7.9, 6.8, 7.6, 6.3, 7.7, 7.7, 7.8, 7.2, 7.9], noteGlobale: 4.1, nbAvis: 540 },
  { id: "86194", nom: "Poitiers", cp: "86000", dep: "Vienne", region: "Nouvelle-Aquitaine", metropole: "Grand Poitiers", taille: "ville", lon: 0.3404, lat: 46.5802, population: 88291, densite: 2000, superficie: 42, ageMoyen: 38, revenuMoyen: 24100, tauxChomage: 10.8, prixM2Maison: 1900, prixM2Appartement: 1700, partProprietaires: 39, agr: 7.5, camb: 5.3, vols: 21.9, stup: 4.5, notes: [7.4, 6.9, 7.4, 5.8, 7.2, 7.6, 8.0, 7.1, 7.6], noteGlobale: 4.0, nbAvis: 500 },
  { id: "56260", nom: "Vannes", cp: "56000", dep: "Morbihan", region: "Bretagne", taille: "ville", lon: -2.7601, lat: 47.6582, population: 54020, densite: 1600, superficie: 32, ageMoyen: 43, revenuMoyen: 26300, tauxChomage: 8.9, prixM2Maison: 3600, prixM2Appartement: 3300, partProprietaires: 46, agr: 6.1, camb: 4.4, vols: 18.2, stup: 3.6, notes: [8.4, 6.6, 7.6, 6.9, 8.0, 7.7, 7.8, 7.3, 8.3], noteGlobale: 4.4, nbAvis: 620 },
  { id: "68066", nom: "Colmar", cp: "68000", dep: "Haut-Rhin", region: "Grand Est", taille: "ville", lon: 7.3585, lat: 48.0794, population: 69105, densite: 1600, superficie: 43, ageMoyen: 42, revenuMoyen: 25900, tauxChomage: 9.6, prixM2Maison: 2900, prixM2Appartement: 2500, partProprietaires: 43, agr: 6.8, camb: 4.9, vols: 19.8, stup: 4.0, notes: [7.8, 6.7, 7.5, 6.5, 7.4, 8.0, 7.7, 7.4, 8.0], noteGlobale: 4.2, nbAvis: 470 },
  { id: "30189", nom: "Nîmes", cp: "30000", dep: "Gard", region: "Occitanie", metropole: "Nîmes Métropole", taille: "ville", lon: 4.3601, lat: 43.8367, population: 150610, densite: 1000, superficie: 162, ageMoyen: 41, revenuMoyen: 23200, tauxChomage: 13.1, prixM2Maison: 2600, prixM2Appartement: 2200, partProprietaires: 41, agr: 10.6, camb: 7.0, vols: 28.8, stup: 6.6, notes: [7.0, 6.7, 7.3, 4.6, 7.5, 7.8, 7.4, 7.3, 7.1], noteGlobale: 3.8, nbAvis: 720 },
  { id: "84007", nom: "Avignon", cp: "84000", dep: "Vaucluse", region: "Provence-Alpes-Côte d'Azur", metropole: "Grand Avignon", taille: "ville", lon: 4.8055, lat: 43.9493, population: 92209, densite: 1500, superficie: 65, ageMoyen: 40, revenuMoyen: 22600, tauxChomage: 13.8, prixM2Maison: 2700, prixM2Appartement: 2300, partProprietaires: 37, agr: 11.1, camb: 7.3, vols: 29.6, stup: 7.0, notes: [7.1, 6.6, 7.2, 4.4, 7.6, 8.1, 7.2, 7.2, 7.0], noteGlobale: 3.7, nbAvis: 660 },
]

/** Hash déterministe (djb2) → seed pour la PRNG. */
function hashSeed(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
  return h >>> 0
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const AGE_TRANCHES = [
  "0-14",
  "15-29",
  "30-44",
  "45-59",
  "60-74",
  "75+",
] as const

function buildAgeDistribution(ageMoyen: number, rnd: () => number) {
  // Courbe décalée selon l'âge moyen, normalisée à 100 %.
  const base = [18, 19, 20, 19, 15, 9]
  const shift = (ageMoyen - 39) * 0.6
  const raw = base.map((b, i) => {
    const skew = (i - 2.5) * shift
    return Math.max(4, b + skew + (rnd() - 0.5) * 3)
  })
  const total = raw.reduce((s, v) => s + v, 0)
  return AGE_TRANCHES.map((tranche, i) => ({
    tranche,
    part: Math.round((raw[i] / total) * 1000) / 10,
  }))
}

function buildHistorique(prixActuel: number, rnd: () => number) {
  // 6 années jusqu'à 2025, croissance moyenne ~3 %/an + bruit.
  const years = [2020, 2021, 2022, 2023, 2024, 2025]
  let prix = prixActuel / Math.pow(1.032, 5)
  return years.map((annee, i) => {
    if (i > 0) prix *= 1.032 + (rnd() - 0.5) * 0.03
    return { annee, prixM2: Math.round(prix / 10) * 10 }
  })
}

function buildServices(population: number, rnd: () => number) {
  const p = population / 1000
  const f = (perK: number, jitter = 0.25) =>
    Math.max(0, Math.round(perK * p * (1 + (rnd() - 0.5) * jitter)))
  return {
    medecins: f(1.1),
    pharmacies: f(0.32),
    hopitaux: Math.max(1, f(0.02)),
    specialistes: f(0.7),
    creches: f(0.18),
    ecolesMaternelles: f(0.28),
    ecolesPrimaires: f(0.34),
    colleges: f(0.09),
    lycees: f(0.05),
    hypermarches: Math.max(0, f(0.012)),
    supermarches: f(0.09),
    restaurants: f(2.4),
    banques: f(0.24),
    boulangeries: f(0.42),
  }
}

const AVIS_POS = [
  "Cadre de vie très agréable, on s'y sent bien au quotidien.",
  "Bonne offre de commerces et de transports, ville dynamique.",
  "Beaucoup d'espaces verts et une vie culturelle riche.",
  "Idéal pour la famille, écoles de qualité et quartiers calmes.",
]
const AVIS_NEG = [
  "Le logement reste cher pour ce que c'est.",
  "Circulation et stationnement compliqués aux heures de pointe.",
  "Quelques quartiers à éviter le soir.",
  "Manque d'infrastructures dans certains secteurs.",
]

function buildAvis(
  noteGlobale: number,
  nom: string,
  rnd: () => number,
): AvisCommune[] {
  const count = 4
  return Array.from({ length: count }, (_, i) => {
    const positif = rnd() < noteGlobale / 5
    const pool = positif ? AVIS_POS : AVIS_NEG
    const note = positif
      ? 4 + Math.round(rnd())
      : 2 + Math.round(rnd())
    return {
      auteur: `Habitant·e ${nom} #${i + 1}`,
      note,
      sentiment: positif ? "positif" : "negatif",
      texte: pool[Math.floor(rnd() * pool.length)],
    }
  })
}

function buildNotes(n: Seed["notes"]): NotesQualiteVie {
  const [
    environnement,
    transports,
    sante,
    securite,
    sportsLoisirs,
    culture,
    enseignement,
    commerces,
    qualiteVie,
  ] = n
  return {
    environnement,
    transports,
    sante,
    securite,
    sportsLoisirs,
    culture,
    enseignement,
    commerces,
    qualiteVie,
  }
}

function buildCommune(seed: Seed): Commune {
  const rnd = mulberry32(hashSeed(seed.id))
  const partLocataires = Math.round((100 - seed.partProprietaires) * 10) / 10
  const partResidencesSecondaires = Math.round((2 + rnd() * 8) * 10) / 10
  const partResidencesVacantes = Math.round((5 + rnd() * 5) * 10) / 10
  const partResidencesPrincipales =
    Math.round((100 - partResidencesSecondaires - partResidencesVacantes) * 10) /
    10

  return {
    id: seed.id,
    nom: seed.nom,
    codePostal: seed.cp,
    departement: seed.dep,
    region: seed.region,
    metropole: seed.metropole,
    taille: seed.taille,
    lon: seed.lon,
    lat: seed.lat,
    population: seed.population,
    densite: seed.densite,
    superficie: seed.superficie,
    ageMoyen: seed.ageMoyen,
    revenuMoyen: seed.revenuMoyen,
    tauxChomage: seed.tauxChomage,
    prixM2Maison: seed.prixM2Maison,
    prixM2Appartement: seed.prixM2Appartement,
    partProprietaires: seed.partProprietaires,
    partLocataires,
    partResidencesPrincipales,
    partResidencesSecondaires,
    partResidencesVacantes,
    prixHistorique: buildHistorique(seed.prixM2Appartement, rnd),
    agressions: seed.agr,
    cambriolages: seed.camb,
    volsDegradations: seed.vols,
    stupefiants: seed.stup,
    notes: buildNotes(seed.notes),
    noteGlobale: seed.noteGlobale,
    nbAvis: seed.nbAvis,
    avis: buildAvis(seed.noteGlobale, seed.nom, rnd),
    ageDistribution: buildAgeDistribution(seed.ageMoyen, rnd),
    services: buildServices(seed.population, rnd),
  }
}

/* ------------------------------------------------------------------ *
 * Génération procédurale pour atteindre ~300 villes de test.
 *
 * Les 32 villes ci-dessus sont réelles ; le reste est généré de façon
 * DÉTERMINISTE (même sortie à chaque chargement) en s'ancrant sur les
 * départements réels, avec des valeurs corrélées à la taille de la commune.
 *
 * Le jour où l'équipe data livre le vrai dataset national, il suffit de
 * remplacer `COMMUNES` par les données réelles : le reste de l'app (scoring,
 * pagination, carte) est déjà dimensionné pour des dizaines de milliers de
 * communes.
 * ------------------------------------------------------------------ */

const TARGET_COUNT = 300

interface DepAnchor {
  dep: string
  region: string
  cpPrefix: string
  lon: number
  lat: number
  prixBase: number
  revenuBase: number
}

const DEP_ANCHORS: DepAnchor[] = (() => {
  const map = new Map<string, DepAnchor>()
  for (const s of SEEDS) {
    if (!map.has(s.dep)) {
      map.set(s.dep, {
        dep: s.dep,
        region: s.region,
        cpPrefix: s.cp.slice(0, 2),
        lon: s.lon,
        lat: s.lat,
        prixBase: s.prixM2Appartement,
        revenuBase: s.revenuMoyen,
      })
    }
  }
  return Array.from(map.values())
})()

const NAME_ROOTS = [
  "Montreuil", "Villeneuve", "Beaumont", "Châteauneuf", "Roquefort", "Fontaine",
  "Aubigny", "Marville", "Neuville", "Vaux", "Clairval", "Rochefort", "Verneuil",
  "Longpré", "Boisset", "Belleville", "Puyloubier", "Sainval", "Montfort",
  "Valbonne", "Chavigny", "Lestrem", "Cormeilles", "Availles", "Meyrargues",
  "Sorbières", "Chanteloup", "Bourgneuf", "Précy", "Éclaron",
]
const SAINTS = [
  "Saint-Martin", "Saint-Georges", "Sainte-Marie", "Saint-Julien",
  "Saint-Pierre", "Saint-Rémy", "Saint-Aubin", "Saint-Loup", "Saint-Priest",
  "Sainte-Colombe", "Saint-Amand", "Saint-Cyr",
]
const NAME_SUFFIXES = [
  "-sur-Loire", "-en-Vexin", "-le-Château", "-les-Bains", "-sur-Mer",
  "-la-Forêt", "-sur-Seine", "-le-Vieux", "-en-Bray", "-du-Lac", "-les-Vignes",
]

function pick<T>(arr: T[], r: number): T {
  return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function generateSeeds(count: number): Seed[] {
  const used = new Set(SEEDS.map((s) => s.nom))
  const out: Seed[] = []
  let i = 0
  // Borne de sécurité pour éviter toute boucle infinie sur collisions de noms.
  while (out.length < count && i < count * 40) {
    const r = mulberry32(hashSeed(`gen-${i}`))
    i++
    const anchor = pick(DEP_ANCHORS, r())

    let nom = r() < 0.35 ? pick(SAINTS, r()) : pick(NAME_ROOTS, r())
    if (r() < 0.5) nom += pick(NAME_SUFFIXES, r())
    if (used.has(nom)) continue
    used.add(nom)

    const t = r()
    const taille: TailleCommune =
      t < 0.58 ? "village" : t < 0.92 ? "ville" : "metropole"

    const population =
      taille === "village"
        ? Math.round(150 + r() * 2600)
        : taille === "ville"
          ? Math.round(3000 + r() * 55000)
          : Math.round(80000 + r() * 220000)

    const densite =
      taille === "village"
        ? Math.round(20 + r() * 180)
        : taille === "ville"
          ? Math.round(300 + r() * 3500)
          : Math.round(3000 + r() * 8000)

    const superficie = clamp(
      Math.round((population / Math.max(15, densite)) * (0.6 + r() * 0.8)),
      4,
      320,
    )

    const taillePremium =
      taille === "village" ? 0.75 : taille === "ville" ? 0.95 : 1.25
    const prixM2Appartement =
      Math.round(
        clamp(anchor.prixBase * taillePremium * (0.7 + r() * 0.6), 700, 11000) /
          10,
      ) * 10
    const prixM2Maison =
      Math.round(clamp(prixM2Appartement * (0.9 + r() * 0.4), 700, 11000) / 10) *
      10
    const revenuMoyen =
      Math.round(clamp(anchor.revenuBase * (0.85 + r() * 0.35), 18000, 42000) /
        100) * 100
    const tauxChomage =
      Math.round(
        clamp(7 + r() * 8 - (revenuMoyen - 26000) / 2000, 5.5, 16) * 10,
      ) / 10

    const sizeFactor =
      taille === "village" ? 0.5 : taille === "ville" ? 0.9 : 1.4
    const agr = Math.round(clamp((6 + r() * 8) * sizeFactor, 1, 18) * 10) / 10
    const camb = Math.round(clamp((4 + r() * 5) * sizeFactor, 0.5, 12) * 10) / 10
    const vols = Math.round(clamp((18 + r() * 18) * sizeFactor, 8, 45) * 10) / 10
    const stup = Math.round(clamp((3 + r() * 5) * sizeFactor, 0.5, 10) * 10) / 10

    const baseNote = clamp(
      6.8 + (revenuMoyen - 26000) / 6000 - tauxChomage / 20,
      5,
      9,
    )
    const note = (spread = 1.2) =>
      Math.round(clamp(baseNote + (r() - 0.5) * spread, 3.5, 9.5) * 10) / 10
    const notes: Seed["notes"] = [
      note(1.4), note(), note(), note(1.6), note(), note(), note(), note(), note(),
    ]
    const noteGlobale =
      Math.round(clamp(3.4 + (baseNote - 6.8) * 0.4 + (r() - 0.5) * 0.4, 3, 4.8) *
        10) / 10
    const nbAvis = Math.round(clamp((population / 180) * (0.5 + r()), 40, 4000))

    const lon = clamp(anchor.lon + (r() - 0.5) * 2.2, -4.7, 8.1)
    const lat = clamp(anchor.lat + (r() - 0.5) * 1.6, 42.6, 50.9)
    const cp = anchor.cpPrefix + String(Math.floor(r() * 899) + 100)

    out.push({
      id: `g${String(i).padStart(4, "0")}`,
      nom,
      cp,
      dep: anchor.dep,
      region: anchor.region,
      metropole: taille === "metropole" ? `Agglo. de ${nom}` : undefined,
      taille,
      lon,
      lat,
      population,
      densite,
      superficie,
      ageMoyen: Math.round(clamp(38 + (r() - 0.5) * 10, 32, 48)),
      revenuMoyen,
      tauxChomage,
      prixM2Maison,
      prixM2Appartement,
      partProprietaires: Math.round(
        clamp(taille === "metropole" ? 30 + r() * 15 : 40 + r() * 25, 25, 72),
      ),
      agr,
      camb,
      vols,
      stup,
      notes,
      noteGlobale,
      nbAvis,
    })
  }
  return out
}

const ALL_SEEDS: Seed[] = [
  ...SEEDS,
  ...generateSeeds(TARGET_COUNT - SEEDS.length),
]

export const COMMUNES: Commune[] = ALL_SEEDS.map(buildCommune)

/** Moyennes nationales (mock) pour la comparaison sur la fiche ville. */
export const MOYENNES_NATIONALES = {
  agressions: 9.2,
  cambriolages: 6.2,
  volsDegradations: 26.0,
  stupefiants: 5.4,
  prixM2Appartement: 3200,
  tauxChomage: 10.8,
}
