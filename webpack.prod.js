const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const Visualizer = require('webpack-visualizer-plugin');
const FileListPlugin = require('./FileListPlugin.js');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    resolve: {
        extensions: ['.js', '.css', '.json'],
    },
    mode: 'production',
    entry: {
        index: path.resolve(__dirname, 'src/index.js'),
    },
    plugins: [
        new FileListPlugin(),
        new Visualizer({
            filename: './statistics.html',
        }),
        new webpack.DefinePlugin({
            REQUEST_API: JSON.stringify('official'),
        }),
        // 1.如果有splictChunks操作，webpack4+ExtractTextPlugin有bug,
        // 只要提取manifest, 除了manifest为入口chunk,其他全算作公共chunk，导致只要entry中的文件比如index, 引入了css, allChunks就必须为true。
        // The reason maybe "Extract from all additional chunks too (by default it extracts only from the initial chunk(s))
        // When using CommonsChunkPlugin and there are extracted chunks from ExtractTextPlugin.extract
        // in the commons chunk, allChunks must be set to true."
        // 2. 会为manifest, vendors等公共chunk输出css文件
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
        new HtmlWebpackPlugin({
            title: 'myapp',
            template: path.resolve(__dirname, 'src/index.ejs'),
            inject: true,
            hash: false,
        }),
        new CleanWebpackPlugin(['dist']),
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[chunkhash].entry.bundle.js',
        chunkFilename: '[name].[chunkhash].chunk.bundle.js',
        publicPath: '/dist/',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                loader: ['babel-loader', 'eslint-loader'],
            },
            {
                test: /\.css$/,
                exclude: /node_modules/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 1024,
                        name: '[name].[hash:8].[ext]',
                    },
                },
            },
        ],
    },
    optimization: {
        minimize: true,
        runtimeChunk: {
            name: 'manifest',
        },
        splitChunks: {
            cacheGroups: {
                // 提取在入口chunk和异步载入的chunk中用到的所有node_modules下的第三方包，
                // 并且打包出的chunk名称为vendors
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'initial',
                    minSize: 1,
                },
                // 提取被两个以上的入口chunk引用的模块为公共模块
                entries: {
                    test: /src/,
                    chunks: 'initial',
                    minSize: 0,
                    minChunks: 2,
                },
                // 提取被入口chunk或者异步载入的chunk所引用的总次数超过两次的模块为公共模块。
                // 注: 如果该模块在某入口chunk中引入了，又在该入口chunk的异步chunk中引入了，引用次数算作1次。
                all: {
                    test: /src/,
                    chunks: 'all',
                    minSize: 0,
                    minChunks: 2,
                },
                // 提取只被异步载入的chunk引用次数超过两次的模块为公共模块
                async: {
                    test: /src/,
                    chunks: 'async',
                    minSize: 0,
                    minChunks: 2,
                },
            },
        },
    },
};
