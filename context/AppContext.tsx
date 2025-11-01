import React, { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import { Lead, ChatMessage, AppState, ProposedAction } from '../types';

type Action =
  | { type: 'SET_TEMPLATE'; payload: string[] }
  | { type: 'ADD_LEADS'; payload: Lead[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PREVIEW_CONTENT'; payload: string }
  | { type: 'SET_MODEL_LOADING'; payload: boolean }
  | { type: 'RESET_LEADS' }
  | { type: 'EXECUTE_PROPOSED_ACTION'; payload: { actionId: string } }
  | { type: 'UPDATE_ACTION_STATUS'; payload: { actionId: string; status: ProposedAction['status'] } }
  | { type: 'UPDATE_BRAIN_ANALYSIS_START' }
  | { type: 'UPDATE_BRAIN_ANALYSIS_SUCCESS'; payload: string | null }
  | { type: 'ADD_ORGANIZATION_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_ORGANIZATION_DOCUMENT_START' }
  | { type: 'UPDATE_ORGANIZATION_DOCUMENT_SUCCESS'; payload: string | null };


const initialState: AppState = {
  template: null,
  leads: [],
  chatHistory: [],
  organizationChatHistory: [],
  previewContent: `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background-color:#111; color: #999;">
        <div style="text-align:center;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #eee;">AI Preview Panel</h1>
            <p>Your generated content will appear here.</p>
            <p>Instruct the AI to create a website, a component, or analyze your data.</p>
        </div>
    </div>
  `,
  isModelLoading: false,
  isBrainAnalyzing: false,
  isOrganizationGenerating: false,
  brainAnalysis: null,
  organizationDocument: null,
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | undefined>(undefined);

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_TEMPLATE':
      return { ...state, template: action.payload, leads: [], chatHistory: [], brainAnalysis: null, organizationDocument: null, organizationChatHistory: [] }; // Reset on new template
    case 'ADD_LEADS':
      // Avoid duplicates based on all key-value pairs
      const existingLeads = new Set(state.leads.map(lead => JSON.stringify(lead)));
      const newLeads = action.payload.filter(newLead => !existingLeads.has(JSON.stringify(newLead)));
      if (newLeads.length === 0) return state;
      return { ...state, leads: [...state.leads, ...newLeads] };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'SET_PREVIEW_CONTENT':
      return { ...state, previewContent: action.payload };
    case 'SET_MODEL_LOADING':
      return { ...state, isModelLoading: action.payload };
    case 'RESET_LEADS':
      return { ...state, leads: [], brainAnalysis: null, organizationDocument: null, organizationChatHistory: [] };
    case 'UPDATE_BRAIN_ANALYSIS_START':
      return { ...state, isBrainAnalyzing: true };
    case 'UPDATE_BRAIN_ANALYSIS_SUCCESS':
      return { ...state, isBrainAnalyzing: false, brainAnalysis: action.payload };
    case 'ADD_ORGANIZATION_CHAT_MESSAGE':
        return { ...state, organizationChatHistory: [...state.organizationChatHistory, action.payload] };
    case 'UPDATE_ORGANIZATION_DOCUMENT_START':
        return { ...state, isOrganizationGenerating: true };
    case 'UPDATE_ORGANIZATION_DOCUMENT_SUCCESS':
        return { ...state, isOrganizationGenerating: false, organizationDocument: action.payload };
    case 'UPDATE_ACTION_STATUS':
      return {
        ...state,
        chatHistory: state.chatHistory.map(msg => {
          if (msg.proposedAction?.id === action.payload.actionId) {
            return {
              ...msg,
              proposedAction: { ...msg.proposedAction, status: action.payload.status },
            };
          }
          return msg;
        }),
      };
    case 'EXECUTE_PROPOSED_ACTION': {
        const { actionId } = action.payload;
        const message = state.chatHistory.find(msg => msg.proposedAction?.id === actionId);
        if (!message || !message.proposedAction) return state;

        const { name, args } = message.proposedAction.functionCall;
        let updatedLeads = [...state.leads];

        try {
            switch (name) {
                case 'add_lead':
                    if(state.template?.every(key => key in args)) {
                        updatedLeads.push(args);
                    } else {
                        console.error("New lead is missing required template fields.");
                    }
                    break;
                case 'update_lead':
                    const { leadIdentifier, field, newValue } = args;
                    const leadIndexToUpdate = updatedLeads.findIndex(
                        lead => lead['name'] === leadIdentifier || lead['email'] === leadIdentifier || lead['company'] === leadIdentifier
                    );
                    if (leadIndexToUpdate !== -1) {
                        updatedLeads[leadIndexToUpdate] = {
                            ...updatedLeads[leadIndexToUpdate],
                            [field]: newValue
                        };
                    }
                    break;
                case 'delete_lead':
                     const { leadIdentifier: idToDelete } = args;
                     updatedLeads = updatedLeads.filter(
                        lead => lead['name'] !== idToDelete && lead['email'] !== idToDelete && lead['company'] !== idToDelete
                    );
                    break;
                default:
                    console.warn(`Unknown action name: ${name}`);
                    return state;
            }
             // Update status after execution
            const updatedChatHistory = state.chatHistory.map(msg => {
                if (msg.proposedAction?.id === actionId) {
                    return { ...msg, proposedAction: { ...msg.proposedAction, status: 'executed' as const } };
                }
                return msg;
            });
            return { ...state, leads: updatedLeads, chatHistory: updatedChatHistory };
        } catch(e) {
            console.error("Error executing action:", e);
            return state;
        }
    }
    default:
      return state;
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};