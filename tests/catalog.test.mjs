import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DEFAULT_ITEMS, verifyOriginalItems, applicableTypes, displayGroup, UNIT_TYPES, DISPLAY_GROUPS, canonicalItem } from '../src/catalog.js';

const original = JSON.parse(readFileSync(new URL('../docs/original-items.json',import.meta.url),'utf8'));

test('업로드 원본 41개 제품의 모든 필드/배열 순서를 바꾸지 않았음', () => {
  assert.deepEqual(DEFAULT_ITEMS, original);
});
test('원본 ID와 7개 공종 매핑 모두 정확히 41개', () => {
  const result = verifyOriginalItems();
  assert.equal(result.itemCount, 41);
  assert.equal(result.uniqueIds, 41);
  assert.deepEqual(result.missingMapping, []);
  assert.deepEqual(result.extraMapping, []);
  assert.equal(DISPLAY_GROUPS.length, 7);
});
test('평형별 제품 66=40, 68=40, 84=41', () => {
  assert.deepEqual(verifyOriginalItems().unitCounts, {66:40,68:40,84:41});
  assert.deepEqual(applicableTypes(original.find(i=>i.id==='m1')), ['84']);
});
test('비고에 평형 미표기면 세 타입 전부 적용', () => {
  for (const item of DEFAULT_ITEMS.filter((i) => !/[0-9]{2}/.test(i.note))) {
    assert.deepEqual(applicableTypes(item), UNIT_TYPES);
  }
});
test('공종 매핑에 해당하는 모든 제품 수 합계 = 41', () => {
  assert.deepEqual(Object.fromEntries(DISPLAY_GROUPS.map((name)=>[name,DEFAULT_ITEMS.filter((i)=>displayGroup(i)===name).length])), {
    '출입·보안':2, '주방가전':6, '전기·통신':6, '냉난방·환기':19, '위생·급배수':2, '안전·소방':2, '공용시설':4,
  });
});
test('같은 속성의 객체는 키 순서가 달라도 동일하게 비교', () => {
  assert.equal(canonicalItem({name:'A',id:'b1'}),canonicalItem({id:'b1',name:'A'}));
  assert.equal(canonicalItem(DEFAULT_ITEMS[0]),canonicalItem((({image,...rest})=>rest)(DEFAULT_ITEMS[0])));
});

// 업로드된 ZIP에서 독립적으로 추출한 기본 제품 JSON의 고정 SHA256.
test('원본 제품 JSON이 업로드 기준 해시와 일치', () => {
  const raw = readFileSync(new URL('../docs/original-items.json', import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'), 'e8aed5ed18e1f4995dd476e4e0823241f389c8f03d3de12393a1f8eef594cbe5');
});
