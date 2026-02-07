import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  recipes: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    source: v.optional(v.string()),
    description: v.string(),
    ingredients: v.string(),
    instructions: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    imageStorageId: v.optional(v.id("_storage")),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"]),
});
