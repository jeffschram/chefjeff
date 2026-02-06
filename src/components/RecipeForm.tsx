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
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recipe = useQuery(api.recipes.get, recipeId ? { id: recipeId } : "skip");
  const createRecipe = useMutation(api.recipes.create);
  const updateRecipe = useMutation(api.recipes.update);
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const importFromUrl = useAction(api.importRecipe.importFromUrl);
  const importFromPhoto = useAction(api.importRecipe.importFromPhoto);

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

  const handleScanPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }

    // Show preview immediately
    const localUrl = URL.createObjectURL(file);
    setScanPreview(localUrl);
    setIsScanning(true);

    try {
      // Upload the image to Convex storage first
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadResponse.json();

      // Now call Claude vision to analyze it
      const result = await importFromPhoto({ storageId: storageId as Id<"_storage"> });
      setName(result.name);
      setSource(result.source);
      setDescription(result.description);
      setIngredients(result.ingredients);
      setInstructions(result.instructions);
      toast.success("Recipe extracted from photo! Review the fields below.");
    } catch (error: any) {
      toast.error(error.message || "Failed to extract recipe from photo");
    } finally {
      setIsScanning(false);
      setScanPreview(null);
      // Reset the file input so the same file can be re-selected
      const target = e.target;
      if (target) target.value = "";
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

      {!isEditing && (
        <div className="import-card scan-card">
          <div className="import-card-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <h3>Scan a Recipe Photo</h3>
          </div>
          <p className="import-card-description">
            Take a picture or upload a photo of a recipe — handwritten, printed, or from a cookbook. AI will read it and fill in the details.
          </p>

          {isScanning && scanPreview ? (
            <div className="scan-preview-area">
              <img src={scanPreview} alt="Scanning…" className="scan-preview-img" />
              <div className="scan-overlay">
                <span className="btn-spinner" />
                <span>Reading recipe…</span>
              </div>
            </div>
          ) : (
            <div className="scan-file-input">
              <input
                type="file"
                accept="image/*"
                onChange={handleScanPhoto}
                disabled={isScanning}
              />
              <span className="scan-file-hint">JPG, PNG, WebP — max 5MB</span>
            </div>
          )}
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
