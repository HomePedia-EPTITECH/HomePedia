import { HttpException, HttpStatus } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthResponse } from "../models/health.model";

describe("HealthController", () => {
  const healthyResponse: HealthResponse = {
    status: "ok",
    service: "homepedia-backend",
    timestamp: "2026-03-24T12:00:00.000Z",
    checks: {
      postgres: "up",
      mongo: "up"
    }
  };

  it("returns the health payload when dependencies are available", async () => {
    const controller = new HealthController({
      check: jest.fn().mockResolvedValue({
        healthy: true,
        response: healthyResponse
      })
    } as never);

    await expect(controller.check()).resolves.toEqual(healthyResponse);
  });

  it("returns the health payload when only postgres is unavailable", async () => {
    const degradedButHealthyResponse: HealthResponse = {
      ...healthyResponse,
      checks: {
        postgres: "down",
        mongo: "up"
      }
    };
    const controller = new HealthController({
      check: jest.fn().mockResolvedValue({
        healthy: true,
        response: degradedButHealthyResponse
      })
    } as never);

    await expect(controller.check()).resolves.toEqual(degradedButHealthyResponse);
  });

  it("throws a 503 when a dependency is unavailable", async () => {
    const degradedResponse: HealthResponse = {
      ...healthyResponse,
      status: "error",
      checks: {
        postgres: "up",
        mongo: "down"
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
      expect(exception.getStatus()).toBe(
        HttpStatus.SERVICE_UNAVAILABLE
      );
      expect(exception.getResponse()).toEqual({
        message: "Backend dependencies unavailable",
        details: {
          checks: degradedResponse.checks
        }
      });
    }
  });
});
