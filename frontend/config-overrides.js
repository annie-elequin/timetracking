const webpack = require('webpack');

module.exports = function override(config) {
  config.plugins.push(
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    })
  );
  return config;
}; 