export type Departement = {
  code: string;
  name: string | null;
  cityCount: number;
  updatedAt: string | null;
};

export type DepartementsResponse = {
  data: Departement[];
};

export type DepartementResponse = {
  data: Departement;
};
