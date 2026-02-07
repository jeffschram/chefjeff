import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function RecipeView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const recipe = useQuery(api.recipes.getBySlug, slug ? { slug } : "skip");
  const deleteRecipe = useMutation(api.recipes.remove);

  if (recipe === undefined) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="error-state">
        <h2>Recipe not found</h2>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          Back to Recipes
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) {
      try {
        await deleteRecipe({ id: recipe._id });
        toast.success("Recipe deleted successfully");
        navigate("/");
      } catch (error) {
        toast.error("Failed to delete recipe");
      }
    }
  };

  return (
    <div className="recipe-view-container">
      <div className="recipe-view-header">
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          ← Back to Recipes
        </button>
        <div className="recipe-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/recipe/${recipe.slug}/edit`)}>
            Edit Recipe
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <article className="recipe-content">
        <div className="recipe-hero-image">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.name} />
          ) : (
            <img src="/images/recipe-default.png" alt="" />
          )}
        </div>

        <header className="recipe-header">
          <h1 className="rich-content" dangerouslySetInnerHTML={{ __html: recipe.name }} />
          <div
            className="recipe-description rich-content"
            dangerouslySetInnerHTML={{ __html: recipe.description }}
          />
          <p className="recipe-meta">
            {new Date(recipe._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {recipe.source && (
              <span className="recipe-source-inline rich-content" dangerouslySetInnerHTML={{ __html: recipe.source }} />
            )}
          </p>
        </header>

        <section className="recipe-section">
          <h2>Ingredients</h2>
          <div
            className="recipe-text rich-content"
            dangerouslySetInnerHTML={{ __html: recipe.ingredients }}
          />
        </section>

        <section className="recipe-section">
          <h2>Instructions</h2>
          <div
            className="recipe-text rich-content"
            dangerouslySetInnerHTML={{ __html: recipe.instructions }}
          />
        </section>
      </article>
    </div>
  );
}
