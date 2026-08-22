import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const handler=await readFile(new URL('../functions/og/[id].js',import.meta.url),'utf8');
const persistence=await readFile(new URL('../js/post-persistence-controller.js',import.meta.url),'utf8');
const css=await readFile(new URL('../css/common.css',import.meta.url),'utf8');

assert.match(handler,/context\.env\.OG_IMAGES/);
assert.match(handler,/await bucket\.get\(objectKey\)/);
assert.match(handler,/await bucket\.put\(objectKey,image/);
assert.match(handler,/'X-OG-Storage':'r2'/);
assert.match(persistence,/\/og\/\$\{encodeURIComponent\(data\.id\)\}/);
assert.match(persistence,/ogUrl\.searchParams\.set\('v',now\)/);
assert.match(css,/\.share-dialog-backdrop\{[^}]*z-index:10000/);

console.log('og r2 storage test ok');
