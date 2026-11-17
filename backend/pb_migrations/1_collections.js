/// <reference path="../types.d.ts" />

// Migration: Create Pennywick collections
// categories, transactions, budgets, recurring_rules
// Conforms to docs/ARCHITECTURE.MD Section 8.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // Open sign-up rule on users
    users.createRule = "";
    app.save(users);

    const ownerRule = "@request.auth.id != '' && owner = @request.auth.id";
    const createRule = "@request.auth.id != '' && @request.body.owner = @request.auth.id";
    const updateRule = "@request.auth.id != '' && owner = @request.auth.id && @request.body.owner:isset = false";

    // 1. categories
    const categories = new Collection({
      name: "categories",
      type: "base",
      fields: [
        { name: "owner",             type: "relation", collectionId: users.id, required: true },
        { name: "name",              type: "text",     required: true, min: 1, max: 60 },
        { name: "kind",              type: "text",     required: true },
        { name: "icon",              type: "text",     required: true },
        { name: "color_key",         type: "text",     required: true },
        { name: "sort_order",        type: "number",   required: false },
        { name: "archived",          type: "bool",     required: false },
        { name: "is_seed",           type: "bool",     required: false },
        { name: "client_updated_at", type: "number",   required: true },
        { name: "deleted_at",        type: "number",   required: false },
      ],
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: createRule,
      updateRule: updateRule,
      deleteRule: null, // soft delete only
    });
    app.save(categories);

    // 2. transactions
    const transactions = new Collection({
      name: "transactions",
      type: "base",
      fields: [
        { name: "owner",             type: "relation", collectionId: users.id, required: true },
        { name: "kind",              type: "text",     required: true },
        { name: "amount_minor",      type: "number",   required: true },
        { name: "category",          type: "text",     required: true }, // stored as text id for push ordering resilience
        { name: "occurred_on",       type: "text",     required: true, min: 10, max: 10 },
        { name: "month_key",         type: "text",     required: true, min: 7, max: 7 },
        { name: "note",              type: "text",     required: false, max: 280 },
        { name: "recurring_rule_id", type: "text",     required: false },
        { name: "created_at",        type: "number",   required: true },
        { name: "client_updated_at", type: "number",   required: true },
        { name: "deleted_at",        type: "number",   required: false },
      ],
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: createRule,
      updateRule: updateRule,
      deleteRule: null,
    });
    app.save(transactions);

    // 3. budgets
    const budgets = new Collection({
      name: "budgets",
      type: "base",
      fields: [
        { name: "owner",             type: "relation", collectionId: users.id, required: true },
        { name: "category",          type: "text",     required: true },
        { name: "limit_minor",       type: "number",   required: true },
        { name: "client_updated_at", type: "number",   required: true },
        { name: "deleted_at",        type: "number",   required: false },
      ],
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: createRule,
      updateRule: updateRule,
      deleteRule: null,
    });
    app.save(budgets);

    // 4. recurring_rules
    const recurringRules = new Collection({
      name: "recurring_rules",
      type: "base",
      fields: [
        { name: "owner",             type: "relation", collectionId: users.id, required: true },
        { name: "kind",              type: "text",     required: true },
        { name: "amount_minor",      type: "number",   required: true },
        { name: "category",          type: "text",     required: true },
        { name: "note",              type: "text",     required: false, max: 280 },
        { name: "frequency",         type: "text",     required: true },
        { name: "day",               type: "number",   required: true },
        { name: "start_on",          type: "text",     required: true, min: 10, max: 10 },
        { name: "last_generated_on", type: "text",     required: false },
        { name: "active",            type: "bool",     required: false },
        { name: "client_updated_at", type: "number",   required: true },
        { name: "deleted_at",        type: "number",   required: false },
      ],
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: createRule,
      updateRule: updateRule,
      deleteRule: null,
    });
    app.save(recurringRules);
  },
  (app) => {
    // Down migration
    for (const name of ["recurring_rules", "budgets", "transactions", "categories"]) {
      try {
        const col = app.findCollectionByNameOrId(name);
        app.delete(col);
      } catch {
        // ignore
      }
    }
  }
);
