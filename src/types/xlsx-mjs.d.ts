// src/types/xlsx-mjs.d.ts
declare module "xlsx/xlsx.mjs" {
  // Re-export the same surface as "xlsx". Good enough for our use.
  export * from "xlsx";
  const _default: typeof import("xlsx");
  export default _default;
}
