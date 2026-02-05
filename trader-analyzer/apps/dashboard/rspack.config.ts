/**
 * @fileoverview Rspack Configuration for Dashboard Bundling
 * @description Bun v1.51 N-API fix enables Rspack's Rust compiler (5-10x faster than Webpack)
 * @module apps/dashboard/rspack.config
 * 
 * Bun v1.51 Feature: N-API compatibility fix
 * Rspack now works correctly with Bun's Node.js compatibility layer
 */

import { defineConfig } from '@rspack/cli';
import path from 'path';

export default defineConfig({
	entry: {
		dashboard: './src/client.ts',
		graphViz: './src/viz/worker.ts',
	},
	output: {
		path: path.resolve(__dirname, '../../dist/dashboard'),
		filename: '[name].bundle.js',
		clean: true,
	},
	// Rspack's Rust compiler is 5-10x faster than Webpack
	optimization: {
		minimize: process.env.NODE_ENV === 'production',
		splitChunks: {
			chunks: 'all',
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors',
					priority: 10,
				},
				common: {
					minChunks: 2,
					priority: 5,
					reuseExistingChunk: true,
				},
			},
		},
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: {
					loader: 'builtin:swc-loader',
					options: {
						jsc: {
							parser: {
								syntax: 'typescript',
								tsx: true,
							},
							target: 'es2022',
							transform: {
								react: {
									runtime: 'automatic',
								},
							},
						},
					},
				},
			},
			{
				test: /\.css$/,
				type: 'css',
			},
		],
	},
	devServer: {
		port: 8080,
		hot: true,
		open: true,
	},
	experimental: {
		css: true,
	},
});
