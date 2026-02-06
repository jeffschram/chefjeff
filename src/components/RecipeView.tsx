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
        <div className="recipe-hero-image">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.name} />
          ) : (
            <div className="recipe-image-placeholder recipe-image-placeholder--hero">
              <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 16C40 16 28 20 28 32C28 38 32 42 36 44L34 60C34 62.2 35.8 64 38 64H42C44.2 64 46 62.2 46 60L44 44C48 42 52 38 52 32C52 20 40 16 40 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                <path d="M40 16V28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
                <path d="M34 20V30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
                <path d="M46 20V30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
              </svg>
            </div>
          )}
        </div>

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
