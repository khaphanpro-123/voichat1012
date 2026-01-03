/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'Node',
        skipLibCheck: true,
        isolatedModules: true,
        strict: false,
        noEmit: false,
        declaration: false,
      },
    }],
  },
  collectCoverageFrom: [
    'lib/phraseExtractor/**/*.ts',
    'lib/vocabularyFlashcardExtractor.ts',
    '!lib/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

module.exports = config;
