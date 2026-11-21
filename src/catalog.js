import { DEFAULT_ITEMS } from "./defaultItems.js";
import classificationMap from "./classificationMap.js";

export { DEFAULT_ITEMS };
export const UNIT_TYPES = ["66", "68", "84"];
export const DISPLAY_GROUPS = classificationMap.groups.map((group) => group.name);
export const LEGACY_CATEGORIES = ["건축", "전기", "기계"];

// 원본의 비고에 숫자형 평형이 명시되지 않으면 사용자 확정 규칙대로 전 타입에 적용.
// 원본의 비고 텍스트는 어떤 경우에도 변경하지 않음.
export function applicableTypes(item) {
  if (Array.isArray(item.types)) {
    const selected = UNIT_TYPES.filter((type) => item.types.includes(type));
    return selected.length ? selected : UNIT_TYPES;
  }
  const note = String(item.note ?? "");
  const mentioned = UNIT_TYPES.filter((type) => new RegExp(`(^|[^0-9])${type}([^0-9]|$)`).test(note));
  return mentioned.length ? mentioned : UNIT_TYPES;
}

export function displayGroup(item) {
  return item.displayCategory || classificationMap.categoryById[item.id] || "분류 미확정";
}

export function searchableText(item) {
  return [item.name, item.company, item.model, item.phone, item.category, displayGroup(item), item.note]
    .filter(Boolean).join(" ").toLocaleLowerCase();
}

export function canonicalItem(item) {
  if (!item) return null;
  return JSON.stringify(Object.keys(item).filter((key) => key !== "image").sort().map((key) => [key, item[key]]));
}

export function stripImage(items) {
  return items.map(({ image, ...fields }) => fields);
}

export function verifyOriginalItems() {
  const ids = DEFAULT_ITEMS.map((item) => item.id);
  const mappedIds = Object.keys(classificationMap.categoryById);
  return {
    itemCount: ids.length,
    uniqueIds: new Set(ids).size,
    missingMapping: ids.filter((id) => !classificationMap.categoryById[id]),
    extraMapping: mappedIds.filter((id) => !ids.includes(id)),
    unitCounts: Object.fromEntries(UNIT_TYPES.map((unit) => [unit, DEFAULT_ITEMS.filter((item) => applicableTypes(item).includes(unit)).length])),
  };
}
