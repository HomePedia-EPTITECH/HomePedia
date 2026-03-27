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

  it("keeps the backend healthy when postgres is unavailable but mongo is up", async () => {
    const service = new HealthService(
      { checkConnection: jest.fn().mockRejectedValue(new Error("postgres down")) } as never,
      { checkConnection: jest.fn().mockResolvedValue(undefined) } as never
    );

    await expect(service.check()).resolves.toMatchObject({
      healthy: true,
      response: {
        status: "ok",
        checks: {
          postgres: "down",
          mongo: "up"
        }
      }
    });
  });

  it("reports error when mongo is unavailable", async () => {
    const service = new HealthService(
      { checkConnection: jest.fn().mockResolvedValue(undefined) } as never,
      { checkConnection: jest.fn().mockRejectedValue(new Error("mongo down")) } as never
    );

    await expect(service.check()).resolves.toMatchObject({
      healthy: false,
      response: {
        status: "error",
        checks: {
          postgres: "up",
          mongo: "down"
        }
      }
    });
  });
});
