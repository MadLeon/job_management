/**
 * Jest 配置文件，适用于 Next.js + React 19 项目
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
