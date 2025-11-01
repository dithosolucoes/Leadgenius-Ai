import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateOrganizationDocument } from '../services/geminiService';
import { SendIcon, OrganizationIcon, AiIcon } from './icons';
import { ChatMessage as ChatMessageType } from '../types';

// Add TypeScript declaration for the 'marked' library loaded from CDN
declare global {
    interface Window { marked: { parse: (markdown: string) => string }; }
}

const OrgChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
    const { role, content } = message;
    const isUser = role === 'user';

    return (
        <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <AiIcon className="w-5 h-5 text-white" />
                </div>
            )}
            <div className={`max-w-xl p-4 rounded-xl ${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                 <p className="text-sm whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    );
};


const Organization: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [prompt, setPrompt] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [state.organizationChatHistory, state.isOrganizationGenerating]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || state.isOrganizationGenerating || state.leads.length === 0) return;
        
        const userMessage = { role: 'user' as const, content: prompt };
        dispatch({ type: 'ADD_ORGANIZATION_CHAT_MESSAGE', payload: userMessage });
        dispatch({ type: 'UPDATE_ORGANIZATION_DOCUMENT_START' });
        
        const currentPrompt = prompt;
        setPrompt('');

        try {
            const documentText = await generateOrganizationDocument(state.leads, currentPrompt);
            dispatch({ type: 'UPDATE_ORGANIZATION_DOCUMENT_SUCCESS', payload: documentText });
            const modelMessage = { role: 'model' as const, content: `I've updated the strategic document based on your request.` };
            dispatch({ type: 'ADD_ORGANIZATION_CHAT_MESSAGE', payload: modelMessage });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            const modelErrorMessage = { role: 'model' as const, content: `Sorry, I failed to generate the document: ${errorMessage}` };
            dispatch({ type: 'ADD_ORGANIZATION_CHAT_MESSAGE', payload: modelErrorMessage });
            dispatch({ type: 'UPDATE_ORGANIZATION_DOCUMENT_SUCCESS', payload: state.organizationDocument }); // Revert loading state
        }
    };
    
    const getPlaceholderText = () => {
        if (state.leads.length === 0) return "Upload leads in the Dashboard to get started...";
        return "e.g., 'Separate my leads into tiers based on company size.'";
    }

    const isChatDisabled = state.isOrganizationGenerating || state.leads.length === 0;

    return (
        <div className="flex h-full bg-gray-900">
            <div className="flex flex-col w-[40%] flex-shrink-0 border-r border-gray-800">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">Organization AI</h2>
                    <p className="text-sm text-gray-400">Structure your leads into a strategic document.</p>
                </div>
                <div ref={chatContainerRef} className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {state.organizationChatHistory.map((msg, index) => (
                        <OrgChatMessage key={index} message={msg} />
                    ))}
                    {state.isOrganizationGenerating && (
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center animate-pulse">
                                <AiIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="max-w-xl p-4 rounded-xl bg-gray-800 text-gray-400">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-800">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={getPlaceholderText()}
                            disabled={isChatDisabled}
                            className="flex-1 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white placeholder-gray-500 disabled:cursor-not-allowed"
                        />
                        <button type="submit" disabled={isChatDisabled || !prompt.trim()} className="p-3 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors">
                           <SendIcon className="w-6 h-6"/>
                        </button>
                    </form>
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-black p-8 overflow-y-auto">
                 <h3 className="text-2xl font-bold text-white mb-4">Strategic Document</h3>
                 <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 flex-1">
                    {state.organizationDocument ? (
                        <div
                            className="prose prose-lg prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(state.organizationDocument) : state.organizationDocument }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-gray-500 h-full">
                            <OrganizationIcon className="w-16 h-16 mb-4 text-gray-600" />
                            <h3 className="text-xl font-semibold text-white mb-2">Your document is empty</h3>
                            <p>Use the chat to instruct the AI on how to organize your leads.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default Organization;