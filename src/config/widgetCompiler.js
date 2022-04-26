const { resolve: pathResolve } = require('path');
const { readdirSync } = require('fs');

const getWidgets = (path) =>
  readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

class WidgetsCompilerPlugin {
  constructor(publicRuntimeConfig, webpackConfig, webpackInstance) {
    this.webpackInstance = webpackInstance;
    const { DefinePlugin } = webpackInstance;

    this.widgets = getWidgets(pathResolve(process.cwd(), 'widgets'));

    //
    // Adds global variables definitions on DefinePlugin (or create new DefinePlugin)
    //
    const definePlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === 'DefinePlugin') || {};

    const modifiedPlugins = webpackConfig.plugins.filter((plugin) => plugin !== definePlugin);

    modifiedPlugins.push(
      new DefinePlugin({
        ...definePlugin.definitions,
        PUBLIC_RUNTIME_CONFIG: JSON.stringify(publicRuntimeConfig),
      }),
    );

    //
    // Mocks next modules
    //
    // For this we need first to remove existing alias for next modules
    // Then we add all next/* modules we need
    //
    const { next, ...alias } = webpackConfig.resolve && webpackConfig.resolve.alias;
    alias['next/config'] = pathResolve(__dirname, 'getConfigFront.js');

    this.buildConfig = {
      ...webpackConfig,
      resolve: {
        ...webpackConfig.resolve,
        alias,
      },
      optimization: {
        ...webpackConfig.optimization,
        runtimeChunk: false,
        splitChunks: {
          cacheGroups: {
            widgets: {
              name: 'widgets',
              priority: 0,
              chunks: 'async',
              enforce: true,
            },
            vendors: {
              name: 'vendors',
              priority: 1,
              test: /[\\/]node_modules[\\/]/,
              chunks: 'async',
              reuseExistingChunk: true,
            },
            customElements: {
              name: 'customElements',
              priority: 2,
              test: /[\\/]node_modules[\\/]@webcomponents[\\/]/,
              chunks: 'async',
              enforce: true,
            },
          },
        },
      },
      entry: this.widgets.reduce(
        (entries, widgetName) => ({
          ...entries,
          [widgetName]: `./widgets/${widgetName}/index.js`,
        }),
        {},
      ),
      output: {
        ...webpackConfig.output,
        publicPath: `${publicRuntimeConfig.PUBLIC_BASE_URL}/_next/`,
        filename: 'static/widgets/[name]/index.js',
      },
      plugins: modifiedPlugins,
    };
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tapPromise('Widgets compiler', () => this.compileWidgets());
  }

  compileWidgets() {
    return new Promise((resolve, reject) => {
      console.log('\n\n\nNextJS build paused');
      console.log('switching to Widgets build');
      console.log('Building widgets', this.widgets);

      const compilation = this.webpackInstance(this.buildConfig);

      compilation.run((err, stats) => {
        if (err || stats.hasErrors()) {
          console.log(
            stats
              ? stats.toString({
                  // Add console colors
                  colors: true,
                })
              : err,
          );
          console.log('Widgets build failed ❌');
          return reject(new Error('Widget build failed'));
        }

        console.log(
          stats.toString({
            // Add console colors
            colors: true,
          }),
        );
        console.log('Widgets build done ✅');
        console.log('Resuming NextJS build\n\n\n');
        resolve();
      });
    });
  }
}

const addWidgetCompilation = (nextConfig) => {
  publicRuntimeConfig = nextConfig.publicRuntimeConfig || { PUBLIC_BASE_URL: '' };

  return {
    ...nextConfig,
    webpack: (webpackConfig, options) => {
      const { isServer, webpack } = options;

      if (typeof nextConfig.webpack === 'function') {
        webpackConfig = nextConfig.webpack(webpackConfig, options);
      }

      // Do build widgets only during frontend build. NextJS does two builds, one for frontend, one for backend.
      if (isServer) {
        return webpackConfig;
      }

      return {
        ...webpackConfig,
        plugins: [...webpackConfig.plugins, new WidgetsCompilerPlugin(publicRuntimeConfig, webpackConfig, webpack)],
      };
    },
  };
};

module.exports = {
  addWidgetCompilation,
};
