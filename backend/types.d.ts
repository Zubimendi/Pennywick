// PocketBase JS hooks type stubs

declare function routerAdd(method: string, path: string, handler: (e: RouterEvent) => unknown): void;
declare function onRecordUpdateRequest(fn: (e: RecordUpdateEvent) => void, collection?: string): void;
declare function migrate(up: (app: PocketBase) => void, down: (app: PocketBase) => void): void;

declare class ApiError extends Error {
  constructor(status: number, message: string, data?: unknown);
}

declare class Collection {
  constructor(data: Partial<CollectionData>);
  id: string;
  name: string;
  fields: FieldList;
}

declare class Record {
  constructor(collection: Collection, data?: Record<string, unknown>);
  id: string;
  get(field: string): unknown;
  getString(field: string): string;
  getInt(field: string): number;
  set(field: string, value: unknown): void;
}

declare class TextField {
  constructor(data: Partial<{ name: string; required: boolean; min: number; max: number; unique: boolean }>);
}
declare class RelationField {
  constructor(data: Partial<{ name: string; collectionId: string; required: boolean; cascadeDelete: boolean }>);
}

declare interface FieldList {
  add(field: unknown): void;
  removeByName(name: string): void;
}

declare interface CollectionData {
  name: string;
  type: string;
  fields: unknown[];
  createRule: string | null;
  updateRule: string | null;
  deleteRule: string | null;
  listRule: string | null;
  viewRule: string | null;
}

declare interface RouterEvent {
  app: PocketBase;
  auth: { id: string } | null;
  json(status: number, data: unknown): unknown;
  requestInfo(): { auth: { id: string } | null; body: Record<string, unknown> };
  realIP(): string;
  next(): void;
}

declare interface RecordUpdateEvent {
  app: PocketBase;
  record: Record;
  requestInfo(): { auth: { id: string } | null; body: Record<string, unknown> };
  next(): void;
}

declare interface PocketBase {
  save(record: Collection | Record): void;
  delete(record: Collection | Record): void;
  findCollectionByNameOrId(nameOrId: string): Collection;
  findRecordById(collection: string, id: string): Record;
  findFirstRecordByData(collection: string, field: string, value: unknown): Record;
}

declare const app: PocketBase;
