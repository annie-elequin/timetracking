const webpack = require('webpack');
const path = require('path');

module.exports = {
  // ... existing webpack config ...
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    })
  ],
  // Ignore source-map warnings for react-datepicker
  ignoreWarnings: [
    {
      module: /node_modules\/react-datepicker/,
      message: /Failed to parse source map/,
    },
  ],
}; 