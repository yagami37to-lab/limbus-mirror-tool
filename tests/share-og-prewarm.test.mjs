import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../js/share-enhanced.js',import.meta.url),'utf8');

assert.match(source,/new URL\(`\/og\/\$\{encodeURIComponent\(post\.id\)\}`/);
assert.match(source,/requestIdleCallback\(startWarmup/);
assert.match(source,/await Promise\.race\(\[warmOgImage\(post\)/);
assert.match(source,/popup\.location\.replace\(target\)/);

console.log('share og prewarm test ok');
