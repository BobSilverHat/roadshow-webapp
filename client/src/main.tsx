import { i18nReady } from "./i18n";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Gate the first render on i18n: wait until the active language's namespaces
// are loaded so nothing renders against missing translations. `.finally` so
// the app still mounts even if a namespace fails to load (falls back to keys).
const root = createRoot(document.getElementById("root")!);
i18nReady.finally(() => root.render(<App />));
