import next from 'eslint-config-next'

const eslintConfig = [
  ...next,
  {
    rules: {
      // allow explicit any in dev/prototype code paths if needed later
    },
  },
]

export default eslintConfig
