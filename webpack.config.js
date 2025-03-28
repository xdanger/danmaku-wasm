const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: "./www/index.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
		clean: true,
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "www/index.html",
		}),
		new WasmPackPlugin({
			crateDirectory: path.resolve(__dirname),
			outDir: path.resolve(__dirname, "pkg"),
		}),
		new CopyPlugin({
			patterns: [
				{
					from: "www/assets",
					to: "assets",
					noErrorOnMissing: true,
				},
				{
					from: "www/style.css",
					to: "style.css",
				},
			],
		}),
	],
	devServer: {
		static: {
			directory: path.join(__dirname, "www"),
		},
		port: 8080,
	},
	experiments: {
		asyncWebAssembly: true,
	},
};
