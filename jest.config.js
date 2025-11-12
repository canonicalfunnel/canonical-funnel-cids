'use strict';

module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  verbose: false,
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-after-env.js'],
  testResultsProcessor: undefined,
  silent: true,
  bail: false,
};


