// src/lib/api.ts
import type { BackendGraphResponse } from "@/components/graph/mockGraphData";

const API_BASE = "http://localhost:8000";

export interface ChatResponse {
  response: string;
  intent: string;
  enriched_profile: Record<string, unknown>;
  graph: BackendGraphResponse | null;
  question_count: number;
  max_questions: number;
  suggestions: Record<string, unknown>[];
  follow_up_questions: Record<string, unknown>[];
}

export async function sendMessage(
  sessionId: string,
  message: string,
  selectedNodes: string[] = []
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      selected_nodes: selectedNodes,
    }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getGraph(sessionId: string): Promise<BackendGraphResponse> {
  const res = await fetch(`${API_BASE}/api/graph/${sessionId}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
