const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window={};
require('../js/formation-code-controller.js');

const KNOWN_EMPTY='H4sIAAAAAAAACnMMdEx3BAInR2cQ5ejq6AmmqSLsaGsLANDKykhgAAAA';
const KNOWN_COMPARISON='H4sIAAAAAAAAE3MMdEx3BAI/R2cQ5ejq6AmmocJOFAk72toCAP6mFx9gAAAA';

(async()=>{
  const codec=window.LimbusFormationCode;
  const empty=await codec.decode(KNOWN_EMPTY);
  assert.equal(empty.length,12);
  assert.deepEqual(empty[0],{gameSinnerId:1,identityModifier:1,slotType:0,egos:{ZAYIN:1,TETH:0,HE:0,WAW:0,ALEPH:0}});
  const comparison=await codec.decode(KNOWN_COMPARISON);
  assert.equal(comparison[1].identityModifier,13);
  assert.equal(comparison.filter((slot,index)=>slot.identityModifier!==empty[index].identityModifier).length,1);
  assert.deepEqual(await codec.decode(await codec.encode(comparison)),comparison);
  const map=JSON.parse(fs.readFileSync('data/game-id-map.json','utf8'));
  assert.equal(map.identities.length,184);assert.equal(new Set(map.identities.map(item=>item.gameId)).size,184);
  assert.equal(map.egos.length,111);assert.equal(new Set(map.egos.map(item=>item.gameId)).size,111);
  for(const item of [...map.identities,...map.egos]){assert.ok(item.gameId%100<=127);assert.equal(Math.floor(item.gameId/100)%100,item.gameSinnerId);}
  const sampleContent={selectedIdentities:[{sinner:'イサン',sinner_id:'01',identity:'LCB囚人'}],party:[{order:1,sinner:'イサン',sinner_id:'01',identity:'LCB囚人'}],egos:[{sinner:'イサン',items:['ZAYIN: 烏瞰刀','TETH: 4本目のマッチの火']}]};
  const contentSlots=codec.slotsFromContent(sampleContent,map);assert.equal(contentSlots.length,12);assert.equal(contentSlots[0].identityModifier,1);assert.equal(contentSlots[0].slotType,1);assert.equal(contentSlots[0].egos.ZAYIN,1);assert.equal(contentSlots[0].egos.TETH,2);assert.deepEqual(await codec.decode(await codec.encode(contentSlots)),contentSlots.map(({warnings,...slot})=>slot));
  for(const invalid of ['', 'not-base64', 'SGVsbG8='])await assert.rejects(codec.decode(invalid));
  console.log('formation-code tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
