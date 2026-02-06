import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface RecipeViewProps {
  recipeId: Id<"recipes">;
  onEdit: () => void;
  onBack: () => void;
}

export function RecipeView({ recipeId, onEdit, onBack }: RecipeViewProps) {
  const recipe = useQuery(api.recipes.get, { id: recipeId });
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
        <button className="btn btn-primary" onClick={onBack}>
          Back to Recipes
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) {
      try {
        await deleteRecipe({ id: recipeId });
        toast.success("Recipe deleted successfully");
        onBack();
      } catch (error) {
        toast.error("Failed to delete recipe");
      }
    }
  };

  return (
    <div className="recipe-view-container">
      <div className="recipe-view-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Recipes
        </button>
        <div className="recipe-actions">
          <button className="btn btn-primary" onClick={onEdit}>
            Edit Recipe
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <article className="recipe-content">
        <header className="recipe-header">
          <h1 className="rich-content" dangerouslySetInnerHTML={{ __html: recipe.name }} />
          {recipe.source && (
            <p className="recipe-source">Source: <span className="rich-content" dangerouslySetInnerHTML={{ __html: recipe.source }} /></p>
          )}
          <p className="recipe-meta">
            Created: {new Date(recipe._creationTime).toLocaleDateString()}
          </p>
        </header>

        <section className="recipe-section">
          <h2>Description</h2>
          <div
            className="recipe-text rich-content"
            dangerouslySetInnerHTML={{ __html: recipe.description }}
          />
        </section>

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
