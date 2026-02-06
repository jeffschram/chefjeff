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
          <h3>No recipes yet</h3>
          <p>Start building your recipe collection by creating your first recipe!</p>
          <button className="btn btn-primary" onClick={onCreateNew}>
            Create Your First Recipe
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <div key={recipe._id} className="recipe-card" onClick={() => onViewRecipe(recipe._id)}>
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
          ))}
        </div>
      )}
    </div>
  );
}
