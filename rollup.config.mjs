import json from '@rollup/plugin-json'
import babel from '@rollup/plugin-babel'
import multi from '@rollup/plugin-multi-entry'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import nodeExternals from 'rollup-plugin-node-externals'

const inputs = {
  utils: 'src/utils.mjs',
  http_input_adapter_middleware: 'src/adapter/http/input/*.mjs',
  http_output_adapter_middleware: 'src/adapter/http/output/*.mjs'
}

export default Object.entries(inputs).map(([name, input]) => ({
	input,
	output: [
    { format: 'es', file: `dist/${name}.mjs` },
    { format: 'cjs', file: `dist/${name}.cjs` }
  ],
  onwarn: (warning, handler) => {
    if (
      ['CIRCULAR_DEPENDENCY', 'THIS_IS_UNDEFINED'].includes(warning.code) &&
      [].concat(warning.id, warning.ids).filter(v => v?.includes('/node_modules/')).length // Disable for node_modules
    ) {
      return
    } else {
      handler(warning)
    }
  },
  plugins: [
    json(),
    multi(),
    nodeExternals({ deps: false }), // Must always be before `nodeResolve()`.
    nodeResolve({
      exportConditions: ['node', 'import', 'require', 'default']
    }),
    babel({ babelHelpers: 'bundled' }),
    commonjs()
  ]
}))