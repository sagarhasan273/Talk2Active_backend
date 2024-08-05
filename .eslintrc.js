module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    'plugin:react/recommended',
    'airbnb',
    'prettier',
  ],
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  plugins: [
    'react', 'prettier',
  ],
  rules: {
    "no-console": 0,
    'consistent-return': 0,
    'no-underscore-dangle': 0
  },
};