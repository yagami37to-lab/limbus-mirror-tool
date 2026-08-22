import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildOgCardHtml} from '../functions/_lib/og-card.js';

const identities=JSON.parse(await readFile(new URL('../data/identities.json',import.meta.url),'utf8'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>String(url).includes('/data/identities.json')?new Response(JSON.stringify(identities),{headers:{'Content-Type':'application/json'}}):originalFetch(url);

const selectedIdentities=identities.slice(0,12).map(group=>({sinner:group.name,identity:group.identities[0].name}));
const html=await buildOgCardHtml({title:'OGPテスト',category:'mirror_dungeon',difficulty:'HARD',author_id:'test',content:{season:7,selectedIdentities}}, {display_name:'テスト投稿者'}, 'https://example.com');

assert.match(html,/width:1200px/);
assert.match(html,/height:630px/);
assert.match(html,/OGPテスト/);
assert.match(html,/鏡ダンジョン/);
assert.equal((html.match(/class="cell"/g)||[]).length,12);
assert.equal((html.match(/assets\/identities\//g)||[]).length,12);
console.log('og-card test ok');
