module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  jsxSingleQuote: false,
  vueIndentScriptAndStyle: true,
  svelteSortOrder: 'options-scripts-markup-styles',
  svelteStrictMode: false,
  svelteBracketNewLine: true,
  svelteAllowShorthand: true,
  svelteIndentScriptAndStyle: true,
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
        useTabs: false
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        tabWidth: 2,
        useTabs: false
      }
    },
    {
      files: '*.css',
      options: {
        printWidth: 80,
        tabWidth: 2,
        useTabs: false
      }
    }
  ]
}