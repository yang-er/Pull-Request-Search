const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const entries = {
    'PullRequestSearch': './scripts\\PullRequestSearch'
};

module.exports = {
    entry: entries,
    output: {
        publicPath: "/dist/",
        filename: "[name].js"
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            "azure-devops-extension-sdk": path.resolve("node_modules/azure-devops-extension-sdk")
        },
    },
    stats: {
        warnings: false
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            },
            {
                test: /\.scss$/,
                use: ["style-loader", "css-loader", "azure-devops-ui/buildScripts/css-variables-loader", "sass-loader"]
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.woff$/,
                use: [{
                    loader: 'base64-inline-loader'
                }]
            },
            {
                test: /\.html$/,
                loader: "file-loader"
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'vssui.css',
            chunkFilename: '[id].css'
        }),
        new CopyWebpackPlugin({
           patterns: [ 
               { from: "**/*.html", context: "scripts" }
           ]
        })
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                react: {
                    test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                    name: 'react',
                    chunks: 'all',
                },
                vssui: {
                    test: /[\\/]node_modules[\\/](azure-devops-ui|azure-devops-ui-datepicker)[\\/]/,
                    name: 'vssui',
                    chunks: 'all',
                },
                tfsapi: {
                    test: /[\\/]node_modules[\\/](azure-devops-extension-api|azure-devops-extension-sdk)[\\/]/,
                    name: 'tfsapi',
                    chunks: 'all',
                },
            },
        },
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
    },
    devServer: {
        https: true,
        port: 3000,
    }
};

if (process.env.NODE_ENV === "development") {
    module.exports.devtool = "inline-source-map";
}
