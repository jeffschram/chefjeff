import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

export function RecipeList() {
  const allRecipes = useQuery(api.recipes.list) || [];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Multi-select: read all values for each key
  const selectedCategories = searchParams.getAll("category");
  const selectedTags = searchParams.getAll("tag");
  const hasFilters = selectedCategories.length > 0 || selectedTags.length > 0;

  // Client-side filtering (AND across categories, AND across tags)
  const recipes = allRecipes.filter((r) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(r.category ?? "")) return false;
    if (selectedTags.length > 0 && !selectedTags.every((t) => (r.tags ?? []).includes(t))) return false;
    return true;
  });

  // Collect unique categories and tags + counts (from ALL recipes, not filtered)
  const { categoryOptions, tagOptions } = useMemo(() => {
    const catCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    for (const r of allRecipes) {
      if (r.category) catCounts.set(r.category, (catCounts.get(r.category) ?? 0) + 1);
      for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    return {
      categoryOptions: [...catCounts.entries()].sort((a, b) => b[1] - a[1]),
      tagOptions: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [allRecipes]);

  const hasSidebarContent = categoryOptions.length > 0 || tagOptions.length > 0;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filterCount = selectedCategories.length + selectedTags.length;

  // Toggle a category or tag checkbox
  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSearchParams(buildSearchParams(next, selectedTags));
  };

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSearchParams(buildSearchParams(selectedCategories, next));
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
            {hasFilters && (
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
                  {categoryOptions.map(([cat, count]) => (
                    <li key={cat}>
                      <label className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                        />
                        <span className="filter-checkbox-mark" />
                        <span className="filter-checkbox-label">{cat}</span>
                        <span className="filter-checkbox-count">{count}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tagOptions.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-section-title">Tags</h4>
                <ul className="filter-checkbox-list">
                  {tagOptions.map(([tag, count]) => (
                    <li key={tag}>
                      <label className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                        />
                        <span className="filter-checkbox-mark" />
                        <span className="filter-checkbox-label">{tag}</span>
                        <span className="filter-checkbox-count">{count}</span>
                      </label>
                    </li>
                  ))}
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

/** Helper to build URLSearchParams from arrays */
function buildSearchParams(categories: string[], tags: string[]) {
  const p: Record<string, string[]> = {};
  if (categories.length) p.category = categories;
  if (tags.length) p.tag = tags;
  // URLSearchParams doesn't support arrays in the constructor, so build manually
  const sp = new URLSearchParams();
  categories.forEach((c) => sp.append("category", c));
  tags.forEach((t) => sp.append("tag", t));
  return sp;
}
