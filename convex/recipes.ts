import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Hardcoded user for development
const DEV_USER_ID = "k17f8f7j9j8h7g6f5d4s3a2q1w0e9r8t" as any;

/**
 * Generate a URL-safe slug from a recipe name.
 * Strips HTML, lowercases, replaces non-alphanumeric with hyphens, dedupes hyphens, trims.
 */
function generateSlugBase(name: string): string {
  return name
    .replace(/<[^>]*>/g, "")    // strip HTML tags
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")    // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "")        // trim leading/trailing hyphens
    || "recipe";
}

/**
 * Find a unique slug by appending -2, -3, etc. if the base already exists.
 * Optionally skip a given recipe ID (for updates).
 */
async function uniqueSlug(
  ctx: any,
  base: string,
  skipId?: any
): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await ctx.db
      .query("recipes")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();
    if (!existing || (skipId && existing._id === skipId)) break;
    slug = `${base}-${suffix}`;
    suffix++;
  }
  return slug;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", DEV_USER_ID))
      .order("desc")
      .collect();

    return await Promise.all(
      recipes.map(async (recipe) => ({
        ...recipe,
        // Fallback slug for recipes that haven't been backfilled yet
        slug: recipe.slug || recipe._id,
        imageUrl: recipe.imageStorageId
          ? await ctx.storage.getUrl(recipe.imageStorageId)
          : null,
      }))
    );
  },
});

export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.userId !== DEV_USER_ID) {
      return null;
    }

    return {
      ...recipe,
      slug: recipe.slug || recipe._id,
      imageUrl: recipe.imageStorageId
        ? await ctx.storage.getUrl(recipe.imageStorageId)
        : null,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // First try the slug index
    let recipe = await ctx.db
      .query("recipes")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    // Fallback: if the slug looks like a Convex ID, try direct lookup
    // (supports old bookmarked URLs with raw IDs)
    if (!recipe) {
      try {
        const byId = await ctx.db.get(args.slug as any);
        if (byId) recipe = byId;
      } catch {
        // not a valid ID — that's fine
      }
    }

    if (!recipe || recipe.userId !== DEV_USER_ID) {
      return null;
    }

    return {
      ...recipe,
      slug: recipe.slug || recipe._id,
      imageUrl: recipe.imageStorageId
        ? await ctx.storage.getUrl(recipe.imageStorageId)
        : null,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    source: v.optional(v.string()),
    description: v.string(),
    ingredients: v.string(),
    instructions: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const base = generateSlugBase(args.name);
    const slug = await uniqueSlug(ctx, base);

    const id = await ctx.db.insert("recipes", {
      ...args,
      slug,
      userId: DEV_USER_ID,
    });

    return { id, slug };
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
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.userId !== DEV_USER_ID) {
      throw new Error("Recipe not found or access denied");
    }

    const { id, ...updates } = args;

    // Regenerate slug if name changed
    const nameChanged =
      args.name.replace(/<[^>]*>/g, "").trim() !==
      recipe.name.replace(/<[^>]*>/g, "").trim();

    let slug = recipe.slug;
    if (nameChanged || !slug) {
      const base = generateSlugBase(args.name);
      slug = await uniqueSlug(ctx, base, id);
    }

    await ctx.db.patch(id, { ...updates, slug });
    return { slug };
  },
});

export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.userId !== DEV_USER_ID) {
      throw new Error("Recipe not found or access denied");
    }

    if (recipe.imageStorageId) {
      await ctx.storage.delete(recipe.imageStorageId);
    }

    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * One-time migration: backfill slugs for any existing recipes that don't have one.
 * Run from the Convex dashboard or via a script.
 */
export const backfillSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const recipes = await ctx.db
      .query("recipes")
      .collect();

    let count = 0;
    for (const recipe of recipes) {
      if (!recipe.slug) {
        const base = generateSlugBase(recipe.name);
        const slug = await uniqueSlug(ctx, base, recipe._id);
        await ctx.db.patch(recipe._id, { slug });
        count++;
      }
    }
    return { backfilled: count };
  },
});
