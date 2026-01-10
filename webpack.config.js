const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    
    // Entry point - bundle all JS files
    entry: {
      app: [
        './pwa/js/app-config.js',
        './pwa/js/language-manager.js',
        './pwa/js/browser-cache.js',
        './pwa/js/tab-alert-manager.js',
        './pwa/js/sip-session-manager.js',
        './pwa/js/line-key-manager.js',
        './pwa/js/ui-state-manager.js',
        './pwa/js/busylight-manager.js',
        './pwa/js/audio-settings-manager.js',
        './pwa/js/api-phantom.js',
        './pwa/js/call-history-manager.js',
        './pwa/js/call-history-ui.js',
        './pwa/js/contacts-manager.js',
        './pwa/js/company-numbers-manager.js',
        './pwa/js/blf-button-manager.js',
        './pwa/js/data-import-export-manager.js',
        './pwa/js/agent-buttons.js',
        './pwa/js/phone.js',
        './pwa/js/app-startup.js',
        './pwa/js/settings-accordion.js'
      ],
      // Bundle CSS
      styles: './pwa/css/phone.css'
    },
    
    output: {
      filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true, // Clean dist folder before build
      publicPath: '/'
    },
    
    devtool: isProduction ? false : 'eval-source-map',
    
    module: {
      rules: [
        // CSS processing
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        // Image processing
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[hash:8][ext]'
          }
        },
        // Font processing
        {
          test: /\.(woff|woff2|ttf|eot)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash:8][ext]'
          }
        }
      ]
    },
    
    plugins: [
      // Process HTML and inject bundled scripts
      new HtmlWebpackPlugin({
        template: './pwa/index.html',
        filename: 'index.html',
        inject: false, // Don't inject - we'll manually add script tags
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
          minifyURLs: true
        } : false,
        // Custom processing function
        templateContent: ({ htmlWebpackPlugin }) => {
          const fs = require('fs');
          let html = fs.readFileSync('./pwa/index.html', 'utf8');
          
          // Remove all app script tags (keep libraries)
          html = html.replace(/<script type="text\/javascript" src="js\/[^"]+"><\/script>/g, '');
          
          // Remove the app-config.js script
          html = html.replace(/<script type="text\/javascript" src="js\/app-config\.js"><\/script>/g, '');
          
          // Remove the old CSS link (css/phone.css) - webpack will inject the bundled version
          html = html.replace(/<link rel="stylesheet"[^>]*href="css\/phone\.css"[^>]*>/g, '');
          
          // Remove service worker registration inline script
          html = html.replace(/<script type="text\/javascript">\s*"serviceWorker"[\s\S]*?<\/script>/g, '');
          
          // Remove keyboard handler inline script
          html = html.replace(/<script type="text\/javascript">\s*document\.addEventListener\("DOMContentLoaded"[\s\S]*?<\/script>/g, '');
          
          // Inject bundled scripts before closing body tag
          const scripts = htmlWebpackPlugin.files.js.map(src => 
            `<script defer src="${src}"></script>`
          ).join('\n    ');
          
          const styles = htmlWebpackPlugin.files.css.map(href =>
            `<link href="${href}" rel="stylesheet">`
          ).join('\n    ');
          
          // Inject CSS in head
          html = html.replace('</head>', `    ${styles}\n</head>`);
          
          // Inject JS before closing body
          html = html.replace('</body>', `    ${scripts}\n</body>`);
          
          // Re-add service worker registration
          const swScript = `
    <script type="text/javascript">
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('sw.js', { scope: '/' })
            .then(function(reg) { console.log('✓ Service Worker registered:', reg.scope); })
            .catch(function(err) { console.warn('❌ Service Worker failed:', err); });
        });
      }
    </script>`;
          
          html = html.replace('</body>', `${swScript}\n</body>`);
          
          return html;
        }
      }),
      
      // Extract CSS to separate file
      new MiniCssExtractPlugin({
        filename: isProduction ? '[name].[contenthash:8].css' : '[name].css'
      }),
      
      // Copy static assets that don't need processing
      new CopyWebpackPlugin({
        patterns: [
          // Copy libraries (jQuery, SIP.js, etc.) as-is
          { from: 'pwa/lib', to: 'lib' },
          
          // Copy service worker (must not be bundled)
          { from: 'pwa/sw.js', to: 'sw.js' },
          
          // Copy manifest
          { from: 'pwa/manifest.json', to: 'manifest.json' },
          
          // Copy offline page
          { from: 'pwa/offline.html', to: 'offline.html' },
          
          // Copy icons (exclude backup/original files)
          { 
            from: 'pwa/icons', 
            to: 'icons',
            globOptions: {
              ignore: ['**/IncomingCallIcon-original*.png']
            }
          },
          
          // Copy favicon
          { from: 'pwa/favicon.ico', to: 'favicon.ico' },
          
          // Copy images (if not referenced in JS/CSS)
          { 
            from: 'pwa/images', 
            to: 'images',
            noErrorOnMissing: true
          },
          
          // Copy media files
          { 
            from: 'pwa/media', 
            to: 'media',
            noErrorOnMissing: true
          },
          
          // Copy language files
          { from: 'pwa/lang', to: 'lang' }
        ]
      })
    ],
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Keep console for debugging
              drop_debugger: true
            },
            format: {
              comments: false
            }
          },
          extractComments: false
        }),
        new CssMinimizerPlugin()
      ],
      
      // Split vendor libraries for better caching
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      }
    },
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
};
