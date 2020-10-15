const tool = require('keystore_wdc/contract')

tool.compileContract('./node_modules/.bin/asc', './src/firebee.ts')
.catch(console.error)