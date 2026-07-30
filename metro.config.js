require('tsx/cjs'); // Add this to import TypeScript files
const { withNativeWind } = require('nativewind/metro');
const config = require('./metro.config.ts');
module.exports = withNativeWind(config, { input: 'src/global.css', inlineRem: 16 });
