const fs = require('fs');
const path = require('path');

const target = path.join(
  process.cwd(),
  'node_modules',
  '@react-navigation',
  'native',
  'node_modules',
  '@react-navigation',
  'routers',
  'lib',
  'module',
  'TabRouter.js'
);

if (!fs.existsSync(target)) {
  console.log('[fix-tabrouter-stale] TabRouter.js not found, skipping.');
  process.exit(0);
}

let source = fs.readFileSync(target, 'utf8');

if (source.includes('const state = partialState ?? {')) {
  console.log('[fix-tabrouter-stale] Already patched.');
  process.exit(0);
}

source = source.replace(
  '      const state = partialState;',
  `      const state = partialState ?? {
        routes: [],
        index: 0,
        history: [],
        preloadedRouteKeys: []
      };`
);

source = source.replace(
  '        const route = state.routes.find(r => r.name === name);',
  '        const route = state.routes?.find(r => r.name === name);'
);

source = source.replace(
  '      const index = Math.min(Math.max(routeNames.indexOf(state.routes[state?.index ?? 0]?.name), 0), routes.length - 1);',
  '      const index = Math.min(Math.max(routeNames.indexOf(state.routes?.[state?.index ?? 0]?.name), 0), routes.length - 1);'
);

fs.writeFileSync(target, source, 'utf8');
console.log('[fix-tabrouter-stale] Patch applied.');
