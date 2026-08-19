// Replaces .eslintrc, which eslint 10 no longer reads at all.
//
// Most of the configuration comes from rhtmlBuildUtils so it stays consistent across the widget repos.
// The block after it carries over the local relaxations that were in .eslintrc, so this migration
// changes which config FORMAT is used without changing which code passes.
const base = require('rhtmlBuildUtils/eslint.config.base')
const onlyWarn = require('eslint-plugin-only-warn')

module.exports = [
  ...base,

  {
    // NB carried over verbatim from the old .eslintrc "rules" block. Three of these (indent,
    // no-multi-spaces, comma-dangle) are formatting rules that eslint 10 moved into @stylistic, so they
    // need the prefix now -- turning off the unprefixed name would silently do nothing. The other three
    // are core rules that the shared config does not enable anyway; they are listed to keep this an
    // exact transcription of what .eslintrc said rather than a judgement about what is still needed.
    rules: {
      '@stylistic/indent': 'off',
      '@stylistic/no-multi-spaces': 'off',
      '@stylistic/comma-dangle': 'off',
      'prefer-promise-reject-errors': 'off',
      'no-unused-expressions': 'off',
      camelcase: 'off',

      // NB not in the old .eslintrc because it did not exist then: @stylistic split the continuation
      // indent of a wrapped binary expression out of `indent` into its own rule. This repo switched
      // `indent` off, so leaving its offshoot on reports 13 warnings for exactly the thing that was
      // deliberately not being checked.
      '@stylistic/indent-binary-ops': 'off'
    }
  },

  {
    // NB also carried over from .eslintrc. This plugin downgrades every error to a warning, so `rhtml
    // lint` reports problems but exits 0 -- which means the lint step in .github/workflows/js-tests.yaml
    // cannot currently fail. That is pre-existing behaviour and is preserved here deliberately, so that
    // moving to eslint 10 does not also turn into a lint cleanup. Removing it is a worthwhile follow-up,
    // but it should be its own change with its own diff.
    plugins: { 'only-warn': onlyWarn }
  }
]
