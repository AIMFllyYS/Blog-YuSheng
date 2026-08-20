import next from 'eslint-config-next'

const eslintConfig = [
  {
    ignores: ['.tmp/**', 'out/**', '.next/**', '.edgeone/**'],
  },
  ...next,
  {
    rules: {
      // allow explicit any in dev/prototype code paths if needed later
    },
  },
]

export default eslintConfig
