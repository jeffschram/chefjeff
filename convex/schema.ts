import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  recipes: defineTable({
    name: v.string(),
    source: v.optional(v.string()),
    description: v.string(),
    ingredients: v.string(),
    instructions: v.string(),
    userId: v.string(), // Changed from v.id("users") to v.string() for dev
  }).index("by_user", ["userId"]),
});
