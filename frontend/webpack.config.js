const webpack = require('webpack');
const path = require('path');

module.exports = {
  // ... existing webpack config ...
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    })
  ]
}; 