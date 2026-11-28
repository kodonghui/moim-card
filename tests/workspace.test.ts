import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TASK-001 workspace", () => {
  it("provides the four planned workspace locations", () => {
    for (const dir of ["apps/web", "apps/api", "packages/shared", "content/question-sets"]) {
      expect(existsSync(dir)).toBe(true);
    }
  });
  it("ignores local environment files", () => {
    expect(execFileSync("git", ["check-ignore", ".env"], { encoding: "utf8" }).trim()).toBe(".env");
  });
  it("exposes the required workspace commands", () => {
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
    for (const name of ["typecheck", "test", "build"]) expect(scripts[name]).toBeTruthy();
  });
});
