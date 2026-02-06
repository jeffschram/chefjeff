"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Extract the best recipe image URL from raw HTML.
 * Priority: og:image > schema.org recipe image > first large content image
 */
function extractImageUrl(html: string, baseUrl: string): string | null {
  // 1. Try og:image meta tag
  const ogMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
  );
  if (ogMatch?.[1]) return resolveUrl(ogMatch[1], baseUrl);

  // 2. Try schema.org JSON-LD recipe image
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const recipe = Array.isArray(data) ? data.find((d: any) => d["@type"] === "Recipe") : (data["@type"] === "Recipe" ? data : null);
      if (recipe?.image) {
        const img = Array.isArray(recipe.image) ? recipe.image[0] : (typeof recipe.image === 'object' && recipe.image.url ? recipe.image.url : recipe.image);
        if (typeof img === 'string') return resolveUrl(img, baseUrl);
      }
    } catch {
      // ignore parse errors
    }
  }

  // 3. Try first large content image (skip icons, avatars, ads)
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*/gi);
  for (const match of imgMatches) {
    const src = match[1];
    // Skip tiny images, trackers, icons, svgs
    if (src.includes('1x1') || src.includes('pixel') || src.includes('.svg') || src.includes('icon') || src.includes('logo') || src.includes('avatar') || src.includes('ad-') || src.includes('data:image')) continue;
    // Look for width/height hints suggesting a real photo
    const widthMatch = match[0].match(/width=["']?(\d+)/i);
    if (widthMatch && parseInt(widthMatch[1]) < 200) continue;
    return resolveUrl(src, baseUrl);
  }

  return null;
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

export const importFromUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    // Fetch the webpage content
    let pageContent: string;
    let rawHtml: string;
    try {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; RecipeImporter/1.0; +http://example.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      rawHtml = await response.text();

      // Strip HTML tags and extract text content, keeping some structure
      pageContent = rawHtml
        // Remove script and style blocks entirely
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        // Convert common structural elements to newlines
        .replace(/<\/?(br|p|div|h[1-6]|li|tr|dt|dd)[^>]*>/gi, "\n")
        // Remove remaining HTML tags
        .replace(/<[^>]+>/g, " ")
        // Decode common HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        // Clean up whitespace
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();

      // Truncate if too long (keep first ~12000 chars to stay within token limits)
      if (pageContent.length > 12000) {
        pageContent = pageContent.substring(0, 12000);
      }
    } catch (error: any) {
      throw new Error(`Could not fetch the recipe URL: ${error.message}`);
    }

    // Extract image URL from the raw HTML before stripping
    const imageUrl = extractImageUrl(rawHtml, args.url);

    // Download and store the image in Convex storage if found
    let imageStorageId: string | null = null;
    if (imageUrl) {
      try {
        const imgResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RecipeImporter/1.0; +http://example.com)",
            Accept: "image/*",
          },
        });
        if (imgResponse.ok) {
          const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
          // Only store actual images
          if (contentType.startsWith("image/")) {
            const blob = await imgResponse.blob();
            // Only store if image is reasonably sized (< 10MB)
            if (blob.size < 10 * 1024 * 1024) {
              imageStorageId = await ctx.storage.store(blob) as unknown as string;
            }
          }
        }
      } catch {
        // Image download failed, continue without image
      }
    }

    // Use Anthropic Claude to extract recipe data
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Extract the recipe from this webpage content and return ONLY valid JSON with no additional text, markdown, or code fences.

The JSON must have these exact fields:
- "name": The recipe title/name (string)
- "source": The website or source name, e.g. "AllRecipes" or "NYT Cooking" (string)
- "description": A brief 1-3 sentence description of the dish (string)
- "ingredients": The full ingredients list, with each ingredient on its own line (string)
- "instructions": The full step-by-step instructions, numbered, with each step on its own line (string)

For ingredients, format each on its own line like:
- 2 cups flour
- 1 tsp salt

For instructions, format numbered steps like:
1. Preheat the oven to 350°F.
2. Mix the dry ingredients together.

If you cannot find a recipe on the page, return: {"error": "No recipe found on this page"}

Webpage content:

${pageContent}`,
          },
        ],
      });

      const content =
        message.content[0]?.type === "text" ? message.content[0].text : null;
      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse the JSON response (strip any accidental markdown fences)
      const jsonStr = content.replace(/^```json?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const parsed = JSON.parse(jsonStr);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // Format source as an HTML link to the original URL
      const sourceName = parsed.source || new URL(args.url).hostname;
      const sourceHtml = `<p><a href="${args.url}" target="_blank" rel="noopener noreferrer">${sourceName}</a></p>`;

      return {
        name: parsed.name || "",
        source: sourceHtml,
        description: parsed.description || "",
        ingredients: parsed.ingredients || "",
        instructions: parsed.instructions || "",
        imageStorageId,
        imageUrl: imageUrl || null,
      };
    } catch (error: any) {
      if (error.message?.includes("No recipe found")) {
        throw new Error(error.message);
      }
      if (error instanceof SyntaxError) {
        throw new Error("Failed to parse the AI response. Please try again.");
      }
      throw new Error(`AI extraction failed: ${error.message}`);
    }
  },
});
