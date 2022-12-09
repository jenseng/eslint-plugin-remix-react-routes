/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/integration/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/fixtures/"],
};
