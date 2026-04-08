export type HealthChecks = {
  postgres: "up" | "down";
  mongo: "up" | "down";
};

export type HealthResponse = {
  status: "ok" | "error";
  service: "homepedia-backend";
  timestamp: string;
  checks: HealthChecks;
};
