import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
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
import Login from "@/pages/login";
import Why from "@/pages/why";

import { StillProvider } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DevPanel } from "@/components/dev-panel";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <span className="text-faint-ink animate-pulse">Still…</span>
    </div>
  );
}

// Everything except /login lives behind authentication.
function ProtectedApp() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, user, location, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null; // redirecting to /login

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

// /login redirects to home when the visitor is already signed in.
function LoginRoute() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) setLocation("/");
  }, [isLoading, user, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (user) return null;
  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route path="/why" component={Why} />
      <Route component={ProtectedApp} />
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
            <AuthProvider>
              <SvgNoise />
              <Router />
              <DevPanel />
            </AuthProvider>
          </WouterRouter>
        </StillProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
