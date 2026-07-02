import { HttpException, HttpStatus } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthResponseDto } from "./dto/health-response.dto";

describe("HealthController", () => {
  const healthyResponse: HealthResponseDto = {
    status: "ok",
    service: "homepedia-backend",
    timestamp: "2026-03-24T12:00:00.000Z",
    checks: {
      postgres: "up",
      mongo: "down"
    }
  };

  it("returns the health payload when PostgreSQL is available", async () => {
    const controller = new HealthController({
      check: jest.fn().mockResolvedValue({
        healthy: true,
        response: healthyResponse
      })
    } as never);

    await expect(controller.check()).resolves.toEqual(healthyResponse);
  });

  it("throws a 503 when PostgreSQL is unavailable", async () => {
    const degradedResponse: HealthResponseDto = {
      ...healthyResponse,
      status: "error",
      checks: {
        postgres: "down",
        mongo: "up"
      }
    };
    const controller = new HealthController({
      check: jest.fn().mockResolvedValue({
        healthy: false,
        response: degradedResponse
      })
    } as never);

    try {
      await controller.check();
      fail("Expected controller.check() to throw");
    } catch (error) {
      const exception = error as HttpException;

      expect(exception).toBeInstanceOf(HttpException);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.getResponse()).toEqual({
        message: "Backend dependencies unavailable",
        details: {
          checks: degradedResponse.checks
        }
      });
    }
  });
});
