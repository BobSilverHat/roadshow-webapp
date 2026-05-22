import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Scenario1 from "./pages/Scenario1";
import Scenario2 from "./pages/Scenario2";
import Scenario3 from "./pages/Scenario3";
import Challenge1 from "./pages/Challenge1";
import Challenge2 from "./pages/Challenge2";
import SaltNexus from "./pages/SaltNexus";
import Leaderboard from "./pages/Leaderboard";
import Completed from "./pages/Completed";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/scenario/1" component={Scenario1} />
      <Route path="/scenario/2" component={Scenario2} />
      <Route path="/scenario/3" component={Scenario3} />
      <Route path="/challenge/1" component={Challenge1} />
      <Route path="/challenge/2" component={Challenge2} />
      <Route path="/salt-nexus" component={SaltNexus} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/completed" component={Completed} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="salt-theme"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
