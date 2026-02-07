import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

/** Strip HTML tags for plain-text search matching */
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function RecipeList() {
  const allRecipes = useQuery(api.recipes.list) || [];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search query from URL
  const searchQuery = searchParams.get("q") ?? "";

  // Multi-select: read all values for each key
  const selectedCategories = searchParams.getAll("category");
  const selectedTags = searchParams.getAll("tag");
  const hasFilters = selectedCategories.length > 0 || selectedTags.length > 0 || searchQuery.length > 0;

  // Client-side filtering (categories + tags + text search)
  const recipes = allRecipes.filter((r) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(r.category ?? "")) return false;
    if (selectedTags.length > 0 && !selectedTags.every((t) => (r.tags ?? []).includes(t))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = [
        stripHtml(r.name),
        stripHtml(r.description),
        stripHtml(r.ingredients),
        stripHtml(r.instructions),
        stripHtml(r.source ?? ""),
        r.category?.toLowerCase() ?? "",
        ...(r.tags ?? []).map((t: string) => t.toLowerCase()),
      ].join(" ");
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Compute "available" counts so we can disable zero-result options.
  // Category counts: from recipes matching search + tags (ignore category filter)
  // Tag counts: from the fully-filtered recipe set (search + categories + tags)
  const { categoryOptions, tagOptions } = useMemo(() => {
    // Pool for category counts: apply search + tags but NOT categories
    const catPool = allRecipes.filter((r) => {
      if (selectedTags.length > 0 && !selectedTags.every((t) => (r.tags ?? []).includes(t))) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          stripHtml(r.name), stripHtml(r.description), stripHtml(r.ingredients),
          stripHtml(r.instructions), stripHtml(r.source ?? ""),
          r.category?.toLowerCase() ?? "",
          ...(r.tags ?? []).map((t: string) => t.toLowerCase()),
        ].join(" ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const catCounts = new Map<string, number>();
    for (const r of catPool) {
      if (r.category) catCounts.set(r.category, (catCounts.get(r.category) ?? 0) + 1);
    }

    // Tag counts: from the fully-filtered set (= recipes)
    const tagCounts = new Map<string, number>();
    for (const r of recipes) {
      for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    // Also include tags that exist globally so they still appear in the list (with count 0)
    for (const r of allRecipes) {
      for (const t of r.tags ?? []) {
        if (!tagCounts.has(t)) tagCounts.set(t, 0);
      }
    }

    return {
      categoryOptions: [...catCounts.entries()].sort((a, b) => b[1] - a[1]),
      tagOptions: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [allRecipes, recipes, selectedTags, searchQuery]);

  const hasSidebarContent = allRecipes.length > 0;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filterCount = selectedCategories.length + selectedTags.length + (searchQuery ? 1 : 0);

  // Update search query in URL params (preserves existing category/tag params)
  const setSearch = (value: string) => {
    setSearchParams(buildSearchParams(selectedCategories, selectedTags, value), { replace: true });
  };

  // Toggle a category or tag checkbox (preserves search query)
  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSearchParams(buildSearchParams(next, selectedTags, searchQuery));
  };

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSearchParams(buildSearchParams(selectedCategories, next, searchQuery));
  };

  const clearFilters = () => setSearchParams({});

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <h2>My Recipes</h2>
        <button className="btn btn-primary" onClick={() => navigate("/new")}>
          + Create New Recipe
        </button>
      </div>

      {/* Mobile filter toggle */}
      {hasSidebarContent && (
        <button
          className="filter-mobile-toggle"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filters</span>
          {filterCount > 0 && (
            <span className="filter-mobile-count">{filterCount}</span>
          )}
          <svg
            className={`filter-mobile-chevron ${mobileFiltersOpen ? "filter-mobile-chevron--open" : ""}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <div className={`recipe-list-layout ${hasSidebarContent ? "recipe-list-layout--with-sidebar" : ""}`}>
        {/* Sidebar filter panel */}
        {hasSidebarContent && (
          <aside className={`filter-sidebar ${mobileFiltersOpen ? "filter-sidebar--mobile-open" : ""}`}>
            {/* Search */}
            <div className="filter-search">
              <svg className="filter-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes…"
                className="filter-search-input"
              />
              {searchQuery && (
                <button
                  className="filter-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {hasFilters && (selectedCategories.length > 0 || selectedTags.length > 0) && (
              <div className="filter-sidebar-active">
                <div className="filter-sidebar-active-chips">
                  {selectedCategories.map((cat) => (
                    <button
                      key={cat}
                      className="filter-chip filter-chip--category"
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                      <span className="filter-chip-x">×</span>
                    </button>
                  ))}
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      className="filter-chip filter-chip--tag"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                      <span className="filter-chip-x">×</span>
                    </button>
                  ))}
                </div>
                <button className="filter-clear" onClick={clearFilters}>Clear all</button>
              </div>
            )}

            {categoryOptions.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-section-title">Category</h4>
                <ul className="filter-checkbox-list">
                  {categoryOptions.map(([cat, count]) => {
                    const checked = selectedCategories.includes(cat);
                    const disabled = count === 0 && !checked;
                    return (
                      <li key={cat}>
                        <label className={`filter-checkbox ${disabled ? "filter-checkbox--disabled" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleCategory(cat)}
                          />
                          <span className="filter-checkbox-mark" />
                          <span className="filter-checkbox-label">{cat}</span>
                          <span className="filter-checkbox-count">{count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tagOptions.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-section-title">Tags</h4>
                <ul className="filter-checkbox-list">
                  {tagOptions.map(([tag, count]) => {
                    const checked = selectedTags.includes(tag);
                    const disabled = count === 0 && !checked;
                    return (
                      <li key={tag}>
                        <label className={`filter-checkbox ${disabled ? "filter-checkbox--disabled" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleTag(tag)}
                          />
                          <span className="filter-checkbox-mark" />
                          <span className="filter-checkbox-label">{tag}</span>
                          <span className="filter-checkbox-count">{count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>
        )}

        {/* Main recipe grid */}
        <div className="recipe-list-main">
          {hasFilters && recipes.length > 0 && (
            <p className="filter-count">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</p>
          )}

          {recipes.length === 0 ? (
            <div className="empty-state">
              {hasFilters ? (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>⌀</div>
                  <h3>No matching recipes</h3>
                  <p>No recipes match your current filters.</p>
                  <button className="btn btn-primary" onClick={clearFilters}>Show All Recipes</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>✦</div>
                  <h3>No recipes yet</h3>
                  <p>Start building your recipe collection by creating your first recipe.</p>
                  <button className="btn btn-primary" onClick={() => navigate("/new")}>
                    Create Your First Recipe
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <div key={recipe._id} className="recipe-card" onClick={() => navigate(`/recipe/${recipe.slug}`)}>
                  <div className="recipe-card-image">
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt="" />
                    ) : (
                      <img src="/images/recipe-default.png" alt="" className="recipe-default-image" />
                    )}
                  </div>
                  <div className="recipe-card-body">
                    <h3 className="recipe-title rich-content" dangerouslySetInnerHTML={{ __html: recipe.name }} />
                    <div className="recipe-description rich-content" dangerouslySetInnerHTML={{ __html: recipe.description }} />
                    {(recipe.category || (recipe.tags && recipe.tags.length > 0)) && (
                      <div className="recipe-card-taxonomy">
                        {recipe.category && (
                          <Link
                            to={`/?category=${encodeURIComponent(recipe.category)}`}
                            className="category-badge category-badge--sm category-badge--link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {recipe.category}
                          </Link>
                        )}
                        {recipe.tags && recipe.tags.slice(0, 3).map((tag: string) => (
                          <Link
                            key={tag}
                            to={`/?tag=${encodeURIComponent(tag)}`}
                            className="tag-badge tag-badge--sm tag-badge--link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="recipe-meta">
                      <span className="recipe-date">
                        {new Date(recipe._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {recipe.source && (
                        <span className="recipe-source-inline rich-content" dangerouslySetInnerHTML={{ __html: recipe.source }} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper to build URLSearchParams from arrays, preserving search query */
function buildSearchParams(categories: string[], tags: string[], query = "") {
  const sp = new URLSearchParams();
  if (query.trim()) sp.set("q", query);
  categories.forEach((c) => sp.append("category", c));
  tags.forEach((t) => sp.append("tag", t));
  return sp;
}
