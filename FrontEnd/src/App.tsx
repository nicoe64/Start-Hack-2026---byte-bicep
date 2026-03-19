// src/App.tsx
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import { ProfilePage } from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import type { BackendGraphResponse } from "@/components/graph/mockGraphData";

const queryClient = new QueryClient();

// Shared state lifted to App so ProfilePage can access graph data
export interface AppSharedState {
  graphData: BackendGraphResponse | null;
  enrichedProfile: Record<string, unknown>;
  websiteProfile: {
    name?: string;
    university?: string;
    degree_level?: string;
    study_program?: string;
    field_interests?: string[];
    skills?: string[];
    graduation_date?: string;
  };
  setGraphData: (d: BackendGraphResponse | null) => void;
  setEnrichedProfile: (p: Record<string, unknown>) => void;
}

const App = () => {
  const [graphData, setGraphData] = useState<BackendGraphResponse | null>(null);
  const [enrichedProfile, setEnrichedProfile] = useState<Record<string, unknown>>({});

  // Static website profile — in production this would come from the backend session
  const websiteProfile = {
    name: "Felix Boyke",
    university: "Technische Hochschule Ingolstadt",
    degree_level: "BSc",
    study_program: "Künstliche Intelligenz",
    field_interests: ["Artificial Intelligence", "Computer Science", "Mechanical Engineering"],
    skills: ["Python", "PyTorch", "Deep Learning", "Reinforcement Learning"],
    graduation_date: "2025",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <Index
                  sharedGraphData={graphData}
                  onGraphDataChange={setGraphData}
                  onEnrichedProfileChange={setEnrichedProfile}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  graphData={graphData}
                  enrichedProfile={enrichedProfile}
                  websiteProfile={websiteProfile}
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
