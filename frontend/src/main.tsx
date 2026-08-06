import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "@/App"
import "@/index.css"

// Dark is the first-run default. Respect an explicit light preference after that.
document.documentElement.classList.toggle(
  "dark",
  localStorage.getItem("mnemosyne-dashboard-theme") !== "light",
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
