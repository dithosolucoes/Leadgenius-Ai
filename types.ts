export enum AppView {
  Dashboard = 'Dashboard',
  Organization = 'Organization',
  Brain = 'AI Brain',
  AIAssistant = 'AI Assistant',
}

export type Lead = Record<string, string>;

export interface ProposedAction {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionCall: { name: string; args: any };
  status: 'pending' | 'executed' | 'cancelled';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  proposedAction?: ProposedAction;
}

export interface AppState {
  template: string[] | null;
  leads: Lead[];
  chatHistory: ChatMessage[];
  organizationChatHistory: ChatMessage[];
  previewContent: string;
  isModelLoading: boolean;
  isBrainAnalyzing: boolean;
  isOrganizationGenerating: boolean;
  brainAnalysis: string | null;
  organizationDocument: string | null;
}