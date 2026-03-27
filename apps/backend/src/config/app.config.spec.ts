import { createCorsOptions, validateEnvironment } from "./app.config";

describe("validateEnvironment", () => {
  it("uses defaults when optional variables are missing", () => {
    const config = validateEnvironment({});

    expect(config.port).toBe(3000);
    expect(config.cors.origins).toEqual(["*"]);
    expect(config.cors.credentials).toBe(false);
  });

  it("parses explicit cors settings", () => {
    const config = validateEnvironment({
      PORT: "4000",
      CORS_ORIGIN: "http://localhost:5173, http://localhost:3001",
      CORS_CREDENTIALS: "true"
    });

    expect(config.port).toBe(4000);
    expect(config.cors.origins).toEqual([
      "http://localhost:5173",
      "http://localhost:3001"
    ]);
    expect(config.cors.credentials).toBe(true);
  });

  it("rejects invalid ports", () => {
    expect(() => validateEnvironment({ PORT: "abc" })).toThrow(
      "PORT must be an integer"
    );
  });
});

describe("createCorsOptions", () => {
  it("allows every origin when wildcard is configured", () => {
    expect(
      createCorsOptions({
        origins: ["*"],
        credentials: false
      })
    ).toEqual({
      origin: true,
      credentials: false
    });
  });
});
