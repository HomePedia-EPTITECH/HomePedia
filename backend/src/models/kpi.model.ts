export interface Kpi {
  id: number;
  name: string;
  value: number;
  unit: string | null;
  source: string | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

