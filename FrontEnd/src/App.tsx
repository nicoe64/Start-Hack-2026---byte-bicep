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

const WEBSITE_PROFILE = {
  name: "Felix Boyke",
  university: "Technische Hochschule Ingolstadt",
  degree_level: "BSc",
  study_program: "Artificial Intelligence",
  field_interests: ["Artificial Intelligence", "Computer Science", "Mechanical Engineering"],
  skills: ["Python", "PyTorch", "Deep Learning", "Reinforcement Learning"],
  graduation_date: "2025",
};

const App = () => {
  const [graphData, setGraphData] = useState<BackendGraphResponse | null>(null);
  const [enrichedProfile, setEnrichedProfile] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

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
                  graphData={graphData}
                  onGraphDataChange={setGraphData}
                  onEnrichedProfileChange={setEnrichedProfile}
                  messages={messages}
                  onMessagesChange={setMessages}
                  chatInput={chatInput}
                  onChatInputChange={setChatInput}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  graphData={graphData}
                  enrichedProfile={enrichedProfile}
                  websiteProfile={WEBSITE_PROFILE}
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
