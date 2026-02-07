import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

export function RecipeList() {
  const recipes = useQuery(api.recipes.list) || [];
  const navigate = useNavigate();

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <h2>My Recipes</h2>
        <button className="btn btn-primary" onClick={() => navigate("/new")}>
          + Create New Recipe
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>✦</div>
          <h3>No recipes yet</h3>
          <p>Start building your recipe collection by creating your first recipe.</p>
          <button className="btn btn-primary" onClick={() => navigate("/new")}>
            Create Your First Recipe
          </button>
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
  );
}
