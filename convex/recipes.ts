import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Hardcoded user for development
const DEV_USER_ID = "k17f8f7j9j8h7g6f5d4s3a2q1w0e9r8t" as any;

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", DEV_USER_ID))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.userId !== DEV_USER_ID) {
      return null;
    }
    
    return recipe;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    source: v.optional(v.string()),
    description: v.string(),
    ingredients: v.string(),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recipes", {
      ...args,
      userId: DEV_USER_ID,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("recipes"),
    name: v.string(),
    source: v.optional(v.string()),
    description: v.string(),
    ingredients: v.string(),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.userId !== DEV_USER_ID) {
      throw new Error("Recipe not found or access denied");
    }
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.userId !== DEV_USER_ID) {
      throw new Error("Recipe not found or access denied");
    }
    
    await ctx.db.delete(args.id);
  },
});
