// src/types/xlsx-mjs.d.ts
declare module "xlsx/xlsx.mjs" {
  export * from "xlsx";
  const _default: typeof import("xlsx");
  export default _default;
}
