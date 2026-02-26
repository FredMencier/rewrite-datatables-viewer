const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/main.ts',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: isProduction ? '[name].[contenthash].js' : '[name].js',
            clean: true,
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader',
                        'postcss-loader',
                    ],
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './index.html',
                filename: 'index.html',
                inject: 'body',
                minify: isProduction ? {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true,
                    minifyURLs: true,
                } : false,
            }),
            ...(isProduction ? [
                new MiniCssExtractPlugin({
                    filename: '[name].[contenthash].css',
                }),
            ] : []),
        ],
        devServer: {
            static: {
                directory: path.resolve(__dirname, 'dist'),
            },
            compress: true,
            port: 3000,
            hot: true,
            open: true,
            historyApiFallback: true,
        },
        devtool: isProduction ? 'source-map' : 'eval-source-map',
        optimization: {
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                    d3: {
                        test: /[\\/]node_modules[\\/]d3/,
                        name: 'd3',
                        chunks: 'all',
                    },
                },
            },
        },
    };
};
