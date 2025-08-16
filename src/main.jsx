import "@/assets/stylesheets/reset.scss"
import "@/assets/stylesheets/variables.scss";
import "@/assets/stylesheets/base.scss";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client"

import App from "./App.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
)
