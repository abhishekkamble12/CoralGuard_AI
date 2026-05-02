export type RiskLevel = "Low" | "Elevated" | "Critical";

export interface ReasoningStep {
  agent_name: string;
  action: string;
  output: string;
  timestamp: string;
}

export interface AnalysisResult {
  analysis_id: number;
  vision: { class_name: string; confidence: number; probabilities: Record<string, number> };
  environment: { cluster: string; risk_score: number; notes: string };
  fusion: { final_risk: RiskLevel; confidence: number; reasoning: string; recommended_action: string };
  report: {
    summary: string;
    scientific_reasoning: string;
    recommended_action: string;
    precautionary_measures?: string;
    authority_action_needed?: boolean;
    confidence: number;
    risk_level?: string;
    validation?: {
      is_valid: boolean;
      feedback: string;
      suggested_revisions: string[];
    };
  };
  reasoning_log: ReasoningStep[];
  alerts: Array<{ id: number; channel: string; status: string; target: string }>;
}

export interface AlertItem {
  id: number;
  analysis_id: number;
  risk_level: string;
  confidence: number;
  channel: string;
  target: string;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  total_analyses: number;
  active_alerts: number;
  recent_analyses: Array<{
    id: number;
    risk_level: string;
    confidence: number;
    class_name: string;
    created_at: string;
  }>;
}
