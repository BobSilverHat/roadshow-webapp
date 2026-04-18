import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Scenario1 from "./pages/Scenario1";
import Scenario2 from "./pages/Scenario2";
import Scenario3 from "./pages/Scenario3";
import Completed from "./pages/Completed";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/scenario/1" component={Scenario1} />
      <Route path="/scenario/2" component={Scenario2} />
      <Route path="/scenario/3" component={Scenario3} />
      <Route path="/completed" component={Completed} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
