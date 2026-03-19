export interface BackendNode {
  id: string;
  type: "topic" | "company" | "supervisor" | "expert";
  entity_id: string | null;
  label: string;
  subtitle: string;
  confidence: number;
  reasoning: string;
  tags: string[];
  data: Record<string, unknown>;
}

export interface BackendEdge {
  from: string;
  to: string;
  type: "belongs_to" | "posted_by" | "supervised_by" | "has_expert";
  label?: string;
}

export interface BackendPath {
  id: string;
  label: string;
  type: "industry" | "academic" | "custom";
  confidence: number;
  reasoning: string;
  node_ids: string[];
}

export interface BackendGraphResponse {
  student_summary: string;
  paths: BackendPath[];
  nodes: BackendNode[];
  edges: BackendEdge[];
  warnings: string[];
}

export const mockBackendResponse: BackendGraphResponse = {
  student_summary: "Anna Schneider, MSc Management Technology and Economics, ETH Zurich",

  paths: [
    {
      id: "path-1",
      label: "AI-driven forecasting at Nestlé",
      type: "industry",
      confidence: 0.92,
      reasoning: "Strong match: supply chain + sustainability + AI. Topic can lead to employment.",
      node_ids: ["n1", "n2", "n3", "n4"],
    },
    {
      id: "path-2",
      label: "Circular packaging at Nestlé",
      type: "industry",
      confidence: 0.88,
      reasoning: "Perfect sustainability fit. Same company, different angle.",
      node_ids: ["n5", "n2", "n6", "n4"],
    },
    {
      id: "path-3",
      label: "Climate risk at Swiss Re",
      type: "industry",
      confidence: 0.79,
      reasoning: "Sustainability match strong. Different industry broadens options.",
      node_ids: ["n7", "n8", "n9", "n10"],
    },
  ],

  nodes: [
    {
      id: "n1",
      type: "topic",
      entity_id: "topic-01",
      label: "AI-driven demand forecasting for perishable goods",
      subtitle: "Nestlé · MSc · Data Science, AI",
      confidence: 0.94,
      reasoning: "Direct match: supply chain + AI. Reduces food waste aligns with sustainability interest.",
      tags: ["msc", "can_lead_to_job"],
      data: {
        degrees: ["msc"],
        fields: ["Data Science", "Artificial Intelligence"],
        employment: "open",
        employmentType: "working_student",
        description: "Develop a ML model to predict demand for short-shelf-life products across Nestlé's European distribution network.",
      },
    },
    {
      id: "n2",
      type: "company",
      entity_id: "company-01",
      label: "Nestlé",
      subtitle: "Consumer Goods, Food & Beverage · 10001+",
      confidence: 0.9,
      reasoning: "Offers real production data access and R&D mentorship.",
      tags: [],
      data: {
        domains: ["Consumer Goods", "Food & Beverage"],
        size: "10001+",
      },
    },
    {
      id: "n3",
      type: "expert",
      entity_id: "expert-01",
      label: "Dr. Sarah Chen",
      subtitle: "Head of Demand Analytics · Nestlé",
      confidence: 0.88,
      reasoning: "Direct expert contact for thesis guidance. Offers interview availability.",
      tags: ["offers_interviews"],
      data: {
        company: "Nestlé",
        title: "Head of Demand Analytics",
        offerInterviews: true,
      },
    },
    {
      id: "n4",
      type: "supervisor",
      entity_id: "supervisor-02",
      label: "Prof. Dr. Sibylle Hechberger",
      subtitle: "ETH Zurich · Computational mechanics, digital twins",
      confidence: 0.72,
      reasoning: "At your university. Computational methods applicable to data-driven thesis work.",
      tags: ["same_university", "shared_across_paths"],
      data: {
        university: "ETH Zurich",
        researchInterests: ["computational mechanics", "digital twins", "structural optimization"],
        fields: ["Mechanical Engineering", "Computer Science"],
      },
    },
    {
      id: "n5",
      type: "topic",
      entity_id: "topic-02",
      label: "Circular packaging design assessment framework",
      subtitle: "Nestlé · MSc · Sustainability, Supply Chain",
      confidence: 0.91,
      reasoning: "Perfect field match: sustainability + supply chain. Quantitative lifecycle assessment.",
      tags: ["msc"],
      data: {
        degrees: ["msc"],
        fields: ["Sustainability", "Supply Chain Management"],
        employment: "no",
        description: "Create a quantitative framework for evaluating environmental impact of alternative packaging materials.",
      },
    },
    {
      id: "n6",
      type: "expert",
      entity_id: "expert-02",
      label: "Maria Fontana",
      subtitle: "Sustainability Packaging Lead · Nestlé",
      confidence: 0.85,
      reasoning: "Expert in sustainable packaging. Direct mentorship for this topic.",
      tags: [],
      data: {
        company: "Nestlé",
        title: "Sustainability Packaging Lead",
        offerInterviews: true,
      },
    },
    {
      id: "n7",
      type: "topic",
      entity_id: "topic-11",
      label: "Climate risk assessment using satellite and IoT data",
      subtitle: "Swiss Re · MSc · Finance, Sustainability",
      confidence: 0.76,
      reasoning: "Sustainability match strong. Finance/insurance adds career diversity.",
      tags: ["msc", "can_lead_to_job"],
      data: {
        degrees: ["msc"],
        fields: ["Finance", "Sustainability"],
        employment: "open",
        description: "Augmenting actuarial catastrophe models with satellite imagery and IoT sensor networks.",
      },
    },
    {
      id: "n8",
      type: "company",
      entity_id: "company-06",
      label: "Swiss Re",
      subtitle: "Insurance, Financial Services · 5001-10000",
      confidence: 0.74,
      reasoning: "Leading reinsurer. Proprietary climate risk datasets available.",
      tags: [],
      data: {
        domains: ["Insurance", "Financial Services"],
        size: "5001-10000",
      },
    },
    {
      id: "n9",
      type: "expert",
      entity_id: "expert-11",
      label: "Expert at Swiss Re",
      subtitle: "Climate risk specialist",
      confidence: 0.73,
      reasoning: "Mentorship in climate risk modeling available.",
      tags: [],
      data: {
        company: "Swiss Re",
        title: "Climate Risk Analyst",
        offerInterviews: true,
      },
    },
    {
      id: "n10",
      type: "supervisor",
      entity_id: "supervisor-01",
      label: "Prof. Dr. Martin Vechev",
      subtitle: "ETH Zurich · Reliable AI, automated reasoning",
      confidence: 0.68,
      reasoning: "At ETH. AI expertise applicable to climate modeling, but not a direct field match.",
      tags: ["same_university"],
      data: {
        university: "ETH Zurich",
        researchInterests: ["reliable AI", "automated reasoning", "program synthesis"],
        fields: ["Computer Science", "Artificial Intelligence"],
      },
    },
  ],

  edges: [
    { from: "n1", to: "n2", type: "belongs_to" },
    { from: "n2", to: "n3", type: "has_expert" },
    { from: "n1", to: "n4", type: "supervised_by" },

    { from: "n5", to: "n2", type: "belongs_to" },
    { from: "n2", to: "n6", type: "has_expert" },
    { from: "n5", to: "n4", type: "supervised_by" },

    { from: "n7", to: "n8", type: "belongs_to" },
    { from: "n8", to: "n9", type: "has_expert" },
    { from: "n7", to: "n10", type: "supervised_by" },
  ],

  warnings: [],
};
