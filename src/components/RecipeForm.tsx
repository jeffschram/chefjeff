import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";

interface RecipeFormProps {
  recipeId?: Id<"recipes">;
  onCancel: () => void;
  onSave: () => void;
}

export function RecipeForm({ recipeId, onCancel, onSave }: RecipeFormProps) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recipe = useQuery(api.recipes.get, recipeId ? { id: recipeId } : "skip");
  const createRecipe = useMutation(api.recipes.create);
  const updateRecipe = useMutation(api.recipes.update);
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const importFromUrl = useAction(api.importRecipe.importFromUrl);

  const isEditing = !!recipeId;

  const handleImport = async () => {
    if (!importUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      new URL(importUrl.trim());
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importFromUrl({ url: importUrl.trim() });
      setName(result.name);
      setSource(result.source);
      setDescription(result.description);
      setIngredients(result.ingredients);
      setInstructions(result.instructions);
      if (result.imageStorageId) {
        setImageStorageId(result.imageStorageId as Id<"_storage">);
      }
      if (result.imageUrl) {
        setImagePreview(result.imageUrl);
      }
      toast.success("Recipe imported successfully! Review the fields below.");
    } catch (error: any) {
      toast.error(error.message || "Failed to import recipe from URL");
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setSource(recipe.source || "");
      setDescription(recipe.description);
      setIngredients(recipe.ingredients);
      setInstructions(recipe.instructions);
      if (recipe.imageStorageId) {
        setImageStorageId(recipe.imageStorageId);
      }
      if (recipe.imageUrl) {
        setImagePreview(recipe.imageUrl);
      }
    }
  }, [recipe]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await response.json();
      setImageStorageId(storageId as Id<"_storage">);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Failed to upload image");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageStorageId(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();
    if (!stripHtml(name) || !stripHtml(description) || !stripHtml(ingredients) || !stripHtml(instructions)) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (isEditing && recipeId) {
        await updateRecipe({
          id: recipeId,
          name: name.trim(),
          source: source.trim() || undefined,
          description: description.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          imageStorageId: imageStorageId || undefined,
        });
        toast.success("Recipe updated successfully!");
      } else {
        await createRecipe({
          name: name.trim(),
          source: source.trim() || undefined,
          description: description.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          imageStorageId: imageStorageId || undefined,
        });
        toast.success("Recipe created successfully!");
      }
      onSave();
    } catch (error) {
      toast.error("Failed to save recipe");
    }
  };

  return (
    <div className="recipe-form-container">
      <div className="recipe-form-header">
        <h2>{isEditing ? "Edit Recipe" : "Create New Recipe"}</h2>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {!isEditing && (
        <div className="import-card">
          <div className="import-card-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <h3>Import from URL</h3>
          </div>
          <p className="import-card-description">
            Paste a recipe URL and AI will automatically fill in the details below.
          </p>
          <div className="import-card-input-row">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.example.com/recipe/..."
              disabled={isImporting}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleImport();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <span className="btn-spinner" />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </button>
          </div>
        </div>
      )}

      <form className="recipe-form" onSubmit={handleSubmit}>
        {/* Image Upload */}
        <div className="form-group">
          <label>Recipe Image</label>
          <div className="image-upload-area">
            {imagePreview || imageStorageId ? (
              <div className="image-preview-container">
                {imagePreview && (
                  <img src={imagePreview} alt="Recipe preview" className="image-preview" />
                )}
                {!imagePreview && imageStorageId && (
                  <div className="image-preview-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Image attached (save to preview)</span>
                  </div>
                )}
                <button
                  type="button"
                  className="image-remove-btn"
                  onClick={handleRemoveImage}
                  title="Remove image"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="image-upload-dropzone" htmlFor="image-upload">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{isUploading ? "Uploading..." : "Click to upload an image"}</span>
                <span className="image-upload-hint">JPG, PNG, WebP — max 10MB</span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              style={{ display: "none" }}
            />
            {(imagePreview || imageStorageId) && (
              <label htmlFor="image-upload" className="btn btn-secondary image-change-btn">
                Change Image
              </label>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Recipe Name *</label>
          <RichTextEditor
            content={name}
            onChange={setName}
            placeholder="Enter recipe name"
          />
        </div>

        <div className="form-group">
          <label>Source (optional)</label>
          <RichTextEditor
            content={source}
            onChange={setSource}
            placeholder="Website, cookbook, or person"
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <RichTextEditor
            content={description}
            onChange={setDescription}
            placeholder="Brief description of the recipe"
          />
        </div>

        <div className="form-group">
          <label>Ingredients *</label>
          <RichTextEditor
            content={ingredients}
            onChange={setIngredients}
            placeholder="List ingredients"
          />
        </div>

        <div className="form-group">
          <label>Instructions *</label>
          <RichTextEditor
            content={instructions}
            onChange={setInstructions}
            placeholder="Step-by-step instructions"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? "Update Recipe" : "Create Recipe"}
          </button>
        </div>
      </form>
    </div>
  );
}
