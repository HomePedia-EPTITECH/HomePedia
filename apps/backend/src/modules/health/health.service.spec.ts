import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("reports ok when postgres and mongo are both available", async () => {
    const service = new HealthService(
      { checkConnection: jest.fn().mockResolvedValue(undefined) } as never,
      { checkConnection: jest.fn().mockResolvedValue(undefined) } as never
    );

    await expect(service.check()).resolves.toMatchObject({
      healthy: true,
      response: {
        status: "ok",
        checks: {
          postgres: "up",
          mongo: "up"
        }
      }
    });
  });

  it("reports error when postgres is unavailable even if mongo is up", async () => {
    const service = new HealthService(
      { checkConnection: jest.fn().mockRejectedValue(new Error("postgres down")) } as never,
      { checkConnection: jest.fn().mockResolvedValue(undefined) } as never
    );

    await expect(service.check()).resolves.toMatchObject({
      healthy: false,
      response: {
        status: "error",
        checks: {
          postgres: "down",
          mongo: "up"
        }
      }
    });
  });

  it("keeps mongo as a reported dependency when it is unavailable", async () => {
    const service = new HealthService(
      { checkConnection: jest.fn().mockResolvedValue(undefined) } as never,
      { checkConnection: jest.fn().mockRejectedValue(new Error("mongo down")) } as never
    );

    await expect(service.check()).resolves.toMatchObject({
      healthy: true,
      response: {
        status: "ok",
        checks: {
          postgres: "up",
          mongo: "down"
        }
      }
    });
  });
});
