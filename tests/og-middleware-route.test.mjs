import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const middleware=await readFile(new URL('../functions/_middleware.js',import.meta.url),'utf8');
const routes=JSON.parse(await readFile(new URL('../_routes.json',import.meta.url),'utf8'));

assert.match(middleware,/\['\/post-detail','\/post-detail\.html'\]/);
assert.match(middleware,/const canonical=`\$\{origin\}\/post-detail\?id=/);
assert.ok(routes.include.includes('/post-detail'));
assert.ok(routes.include.includes('/post-detail.html'));
assert.ok(routes.include.includes('/og/*'));

console.log('og middleware route test ok');
