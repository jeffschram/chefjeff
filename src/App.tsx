import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { RecipeList } from "./components/RecipeList";
import { RecipeForm } from "./components/RecipeForm";
import { RecipeView } from "./components/RecipeView";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";

type View = 
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; id: Id<"recipes"> }
  | { type: "view"; id: Id<"recipes"> };

export default function App() {
  const [currentView, setCurrentView] = useState<View>({ type: "list" });

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title" onClick={() => setCurrentView({ type: "list" })}>
            Chef Jeff
          </h1>
          <div className="user-info">
            <span>Welcome, Jeff Schram</span>
          </div>
        </div>
      </header>
      
      <main className="main">
        <Content currentView={currentView} setCurrentView={setCurrentView} />
      </main>
      
      <Toaster />
    </div>
  );
}

function Content({ currentView, setCurrentView }: {
  currentView: View;
  setCurrentView: (view: View) => void;
}) {
  switch (currentView.type) {
    case "list":
      return <RecipeList onCreateNew={() => setCurrentView({ type: "create" })} onViewRecipe={(id) => setCurrentView({ type: "view", id })} />;
    case "create":
      return <RecipeForm onCancel={() => setCurrentView({ type: "list" })} onSave={() => setCurrentView({ type: "list" })} />;
    case "edit":
      return <RecipeForm recipeId={currentView.id} onCancel={() => setCurrentView({ type: "view", id: currentView.id })} onSave={() => setCurrentView({ type: "view", id: currentView.id })} />;
    case "view":
      return <RecipeView recipeId={currentView.id} onEdit={() => setCurrentView({ type: "edit", id: currentView.id })} onBack={() => setCurrentView({ type: "list" })} />;
    default:
      return <RecipeList onCreateNew={() => setCurrentView({ type: "create" })} onViewRecipe={(id) => setCurrentView({ type: "view", id })} />;
  }
}
