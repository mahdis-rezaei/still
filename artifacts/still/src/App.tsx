import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Paste from "@/pages/paste";
import Entries from "@/pages/entries";
import Processing from "@/pages/processing";
import Result from "@/pages/result";
import History from "@/pages/history";

import { StillProvider } from "@/lib/store";
import { DevPanel } from "@/components/dev-panel";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/paste" component={Paste} />
      <Route path="/entries" component={Entries} />
      <Route path="/processing" component={Processing} />
      <Route path="/result" component={Result} />
      <Route path="/history" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SvgNoise() {
  return (
    <svg className="noise-overlay" xmlns="http://www.w3.org/2000/svg">
      <filter id="noiseFilter">
        <feTurbulence 
          type="fractalNoise" 
          baseFrequency="0.8" 
          numOctaves="3" 
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StillProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <SvgNoise />
            <Router />
            <DevPanel />
          </WouterRouter>
        </StillProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
