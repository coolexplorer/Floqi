/**
 * Cron Utility Functions Tests
 * TDD Red Phase — ALL tests fail: `@/lib/cron-utils` module does not exist yet.
 *
 * Tests validate:
 * - presetToCron("daily-7am") → "0 7 * * *"
 * - presetToCron("weekly-mon-9am") → "0 9 * * 1"
 * - cronToPreset("0 7 * * *") → "daily-7am"
 * - cronToPreset("0 9 * * 1") → "weekly-mon-9am"
 * - isValidCron(expr) → boolean validation
 * - Invalid preset → throws Error
 * - Round-trip: presetToCron → cronToPreset is identity for known presets
 */

// RED: This import will fail — @/lib/cron-utils does not exist yet
// All tests in this file will fail with "Cannot find module" error
import { presetToCron, cronToPreset, isValidCron } from "@/lib/cron-utils";

// ─── presetToCron ─────────────────────────────────────────────────────────────

describe("presetToCron — named preset → cron expression", () => {
  describe("daily presets", () => {
    it("'daily-7am' → '0 7 * * *'", () => {
      expect(presetToCron("daily-7am")).toBe("0 7 * * *");
    });

    it("'daily-8am' → '0 8 * * *'", () => {
      expect(presetToCron("daily-8am")).toBe("0 8 * * *");
    });

    it("'daily-9am' → '0 9 * * *'", () => {
      expect(presetToCron("daily-9am")).toBe("0 9 * * *");
    });

    it("'daily-6am' → '0 6 * * *'", () => {
      expect(presetToCron("daily-6am")).toBe("0 6 * * *");
    });

    it("'daily-12pm' → '0 12 * * *'", () => {
      expect(presetToCron("daily-12pm")).toBe("0 12 * * *");
    });

    it("'daily-6pm' → '0 18 * * *'", () => {
      expect(presetToCron("daily-6pm")).toBe("0 18 * * *");
    });
  });

  describe("weekly presets", () => {
    it("'weekly-mon-9am' → '0 9 * * 1'", () => {
      expect(presetToCron("weekly-mon-9am")).toBe("0 9 * * 1");
    });

    it("'weekly-tue-9am' → '0 9 * * 2'", () => {
      expect(presetToCron("weekly-tue-9am")).toBe("0 9 * * 2");
    });

    it("'weekly-wed-9am' → '0 9 * * 3'", () => {
      expect(presetToCron("weekly-wed-9am")).toBe("0 9 * * 3");
    });

    it("'weekly-thu-9am' → '0 9 * * 4'", () => {
      expect(presetToCron("weekly-thu-9am")).toBe("0 9 * * 4");
    });

    it("'weekly-fri-9am' → '0 9 * * 5'", () => {
      expect(presetToCron("weekly-fri-9am")).toBe("0 9 * * 5");
    });

    it("'weekly-sat-9am' → '0 9 * * 6'", () => {
      expect(presetToCron("weekly-sat-9am")).toBe("0 9 * * 6");
    });

    it("'weekly-sun-8am' → '0 8 * * 0'", () => {
      expect(presetToCron("weekly-sun-8am")).toBe("0 8 * * 0");
    });

    it("'weekly-mon-7am' → '0 7 * * 1'", () => {
      expect(presetToCron("weekly-mon-7am")).toBe("0 7 * * 1");
    });
  });

  describe("error handling", () => {
    it("invalid preset string → throws Error", () => {
      expect(() => presetToCron("invalid-preset")).toThrow();
    });

    it("empty string → throws Error", () => {
      expect(() => presetToCron("")).toThrow();
    });

    it("unknown hour suffix → throws Error", () => {
      expect(() => presetToCron("daily-25am")).toThrow();
    });

    it("unknown day in weekly preset → throws Error", () => {
      expect(() => presetToCron("weekly-xyz-9am")).toThrow();
    });

    it("missing time part in weekly preset → throws Error", () => {
      expect(() => presetToCron("weekly-mon")).toThrow();
    });
  });
});

// ─── cronToPreset ─────────────────────────────────────────────────────────────

describe("cronToPreset — cron expression → named preset", () => {
  describe("daily cron → daily preset", () => {
    it("'0 7 * * *' → 'daily-7am'", () => {
      expect(cronToPreset("0 7 * * *")).toBe("daily-7am");
    });

    it("'0 8 * * *' → 'daily-8am'", () => {
      expect(cronToPreset("0 8 * * *")).toBe("daily-8am");
    });

    it("'0 9 * * *' → 'daily-9am'", () => {
      expect(cronToPreset("0 9 * * *")).toBe("daily-9am");
    });

    it("'0 12 * * *' → 'daily-12pm'", () => {
      expect(cronToPreset("0 12 * * *")).toBe("daily-12pm");
    });

    it("'0 18 * * *' → 'daily-6pm'", () => {
      expect(cronToPreset("0 18 * * *")).toBe("daily-6pm");
    });
  });

  describe("weekly cron → weekly preset", () => {
    it("'0 9 * * 1' → 'weekly-mon-9am'", () => {
      expect(cronToPreset("0 9 * * 1")).toBe("weekly-mon-9am");
    });

    it("'0 9 * * 5' → 'weekly-fri-9am'", () => {
      expect(cronToPreset("0 9 * * 5")).toBe("weekly-fri-9am");
    });

    it("'0 8 * * 0' → 'weekly-sun-8am'", () => {
      expect(cronToPreset("0 8 * * 0")).toBe("weekly-sun-8am");
    });

    it("'0 7 * * 1' → 'weekly-mon-7am'", () => {
      expect(cronToPreset("0 7 * * 1")).toBe("weekly-mon-7am");
    });
  });

  describe("non-preset cron → 'custom'", () => {
    it("'*/15 * * * *' → 'custom'", () => {
      expect(cronToPreset("*/15 * * * *")).toBe("custom");
    });

    it("'0 0 1 * *' (monthly) → 'custom'", () => {
      expect(cronToPreset("0 0 1 * *")).toBe("custom");
    });

    it("'30 6 * * 1-5' (weekdays range) → 'custom'", () => {
      expect(cronToPreset("30 6 * * 1-5")).toBe("custom");
    });
  });

  describe("round-trip: presetToCron → cronToPreset", () => {
    it("presetToCron('daily-7am') | cronToPreset → 'daily-7am'", () => {
      const cron = presetToCron("daily-7am");
      expect(cronToPreset(cron)).toBe("daily-7am");
    });

    it("presetToCron('weekly-mon-9am') | cronToPreset → 'weekly-mon-9am'", () => {
      const cron = presetToCron("weekly-mon-9am");
      expect(cronToPreset(cron)).toBe("weekly-mon-9am");
    });

    it("presetToCron('daily-8am') | cronToPreset → 'daily-8am'", () => {
      const cron = presetToCron("daily-8am");
      expect(cronToPreset(cron)).toBe("daily-8am");
    });
  });

  describe("error handling", () => {
    it("not a cron expression (< 5 parts) → throws Error", () => {
      expect(() => cronToPreset("invalid")).toThrow();
    });

    it("empty string → throws Error", () => {
      expect(() => cronToPreset("")).toThrow();
    });
  });
});

// ─── isValidCron ──────────────────────────────────────────────────────────────

describe("isValidCron — validate cron expression format", () => {
  describe("valid expressions", () => {
    it("'0 7 * * *' → true", () => {
      expect(isValidCron("0 7 * * *")).toBe(true);
    });

    it("'0 9 * * 1' → true", () => {
      expect(isValidCron("0 9 * * 1")).toBe(true);
    });

    it("'*/15 * * * *' → true", () => {
      expect(isValidCron("*/15 * * * *")).toBe(true);
    });

    it("'0 0 1 * *' → true (monthly)", () => {
      expect(isValidCron("0 0 1 * *")).toBe(true);
    });

    it("'30 6 * * 1-5' → true (range)", () => {
      expect(isValidCron("30 6 * * 1-5")).toBe(true);
    });

    it("'0 22 * * *' → true", () => {
      expect(isValidCron("0 22 * * *")).toBe(true);
    });
  });

  describe("invalid expressions", () => {
    it("'invalid-cron-expression' → false", () => {
      expect(isValidCron("invalid-cron-expression")).toBe(false);
    });

    it("empty string → false", () => {
      expect(isValidCron("")).toBe(false);
    });

    it("only 4 parts → false", () => {
      expect(isValidCron("0 9 * *")).toBe(false);
    });

    it("6 parts → false (standard cron has 5)", () => {
      expect(isValidCron("0 0 9 * * *")).toBe(false);
    });

    it("'60 9 * * *' → false (minute > 59)", () => {
      expect(isValidCron("60 9 * * *")).toBe(false);
    });

    it("'0 25 * * *' → false (hour > 23)", () => {
      expect(isValidCron("0 25 * * *")).toBe(false);
    });

    it("'0 9 * * 8' → false (weekday > 7)", () => {
      expect(isValidCron("0 9 * * 8")).toBe(false);
    });

    it("'abc 9 * * *' → false (non-numeric minute)", () => {
      expect(isValidCron("abc 9 * * *")).toBe(false);
    });
  });
});
