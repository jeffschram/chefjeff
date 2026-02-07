import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { RecipeList } from "./components/RecipeList";
import { RecipeForm } from "./components/RecipeForm";
import { RecipeView } from "./components/RecipeView";

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title" onClick={() => navigate("/")}>
            Chef Jeff
          </h1>
          <div className="user-info">
            <span>Welcome, Jeff Schram</span>
          </div>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/new" element={<RecipeForm />} />
          <Route path="/recipe/:id" element={<RecipeView />} />
          <Route path="/recipe/:id/edit" element={<RecipeForm />} />
        </Routes>
      </main>

      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#262019',
            border: '1px solid #3a322a',
            color: '#e8ddd0',
            fontFamily: "'Outfit', system-ui, sans-serif",
          },
        }}
      />
    </div>
  );
}
