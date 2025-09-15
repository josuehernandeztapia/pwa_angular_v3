const webpack = require('webpack');

module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Core Angular vendor chunk
        angular: {
          name: 'angular',
          test: /[\\/]node_modules[\\/](@angular|rxjs|zone\.js)/,
          priority: 40,
          enforce: true,
          reuseExistingChunk: true
        },
        // PDF libraries - separate heavy chunk
        pdf: {
          name: 'pdf-libs',
          test: /[\\/]node_modules[\\/](jspdf|html2canvas)/,
          priority: 35,
          enforce: true,
          reuseExistingChunk: true
        },
        // Chart/visualization libraries
        charts: {
          name: 'chart-libs',
          test: /[\\/]node_modules[\\/](chart\.js|d3|echarts)/,
          priority: 30,
          enforce: true,
          reuseExistingChunk: true
        },
        // Utility libraries
        utils: {
          name: 'utils',
          test: /[\\/]node_modules[\\/](lodash|moment|date-fns)/,
          priority: 25,
          enforce: true,
          reuseExistingChunk: true
        },
        // Other vendor libraries
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          priority: 20,
          enforce: true,
          reuseExistingChunk: true,
          maxSize: 200000, // Split if larger than 200KB
        },
        // Common shared code between components
        common: {
          name: 'common',
          minChunks: 2,
          priority: 15,
          reuseExistingChunk: true,
          maxSize: 100000, // Split if larger than 100KB
        },
        // Default chunk
        default: {
          priority: 10,
          reuseExistingChunk: true,
          maxSize: 150000, // Split if larger than 150KB
        }
      },
      // Global settings
      maxInitialRequests: 6, // Allow more initial chunks
      maxAsyncRequests: 8,   // Allow more async chunks
      minSize: 20000,        // Minimum chunk size (20KB)
      maxSize: 150000,       // Maximum chunk size (150KB)
    }
  }
};