import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface RecipeListProps {
  onCreateNew: () => void;
  onViewRecipe: (id: Id<"recipes">) => void;
}

export function RecipeList({ onCreateNew, onViewRecipe }: RecipeListProps) {
  const recipes = useQuery(api.recipes.list) || [];

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <h2>My Recipes</h2>
        <button className="btn btn-primary" onClick={onCreateNew}>
          + Create New Recipe
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>✦</div>
          <h3>No recipes yet</h3>
          <p>Start building your recipe collection by creating your first recipe.</p>
          <button className="btn btn-primary" onClick={onCreateNew}>
            Create Your First Recipe
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <div key={recipe._id} className="recipe-card" onClick={() => onViewRecipe(recipe._id)}>
              <div className="recipe-card-image">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt="" />
                ) : (
                  <div className="recipe-image-placeholder">
                    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M40 16C40 16 28 20 28 32C28 38 32 42 36 44L34 60C34 62.2 35.8 64 38 64H42C44.2 64 46 62.2 46 60L44 44C48 42 52 38 52 32C52 20 40 16 40 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                      <path d="M40 16V28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
                      <path d="M34 20V30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
                      <path d="M46 20V30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="recipe-card-body">
                <h3 className="recipe-title rich-content" dangerouslySetInnerHTML={{ __html: recipe.name }} />
                <div className="recipe-description rich-content" dangerouslySetInnerHTML={{ __html: recipe.description }} />
                {recipe.source && (
                  <p className="recipe-source">Source: <span className="rich-content" dangerouslySetInnerHTML={{ __html: recipe.source }} /></p>
                )}
                <div className="recipe-meta">
                  <span className="recipe-date">
                    {new Date(recipe._creationTime).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
