module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/test/jest/**/*.ts'],
  transform: {'\\.ts$': 'ts-jest/preprocessor'},
  mapCoverage: true,
  coverageReporters: ['lcov', 'text-summary'],
  // collectCoverage: !!`Boolean(process.env.CI)`,
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/templates/'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}
