/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  coverageThreshold: { global: { lines: 80, functions: 80, branches: 80, statements: 80 } },
};
