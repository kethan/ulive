import terser from '@rollup/plugin-terser';

const resolve = (pkg, input = "src/index", output = "dist/index") => ({
	input: `${input}.js`,
	output: [
		{
			file: `${output}.es.js`,
			format: 'es',
		},
		{
			file: `${output}.cjs`,
			format: 'cjs',
		},
		{
			file: `${output}.min.js`,
			format: 'iife',
			name: pkg,
			strict: false,
			compact: true,
			plugins: [terser()]
		},
		{
			file: `${output}.umd.js`,
			format: 'umd',
			name: pkg,
			strict: false,
			compact: true,
			plugins: [terser()]
		}
	]
});

export default [
	resolve("ulive"),
	resolve("ulive", "src/fn", "fn/index")
]