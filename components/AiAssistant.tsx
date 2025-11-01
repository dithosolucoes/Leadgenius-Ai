import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateContent } from '../services/geminiService';
import { SendIcon, AiIcon, DesktopIcon, TabletIcon, MobileIcon } from './icons';
import { ChatMessage as ChatMessageType, ProposedAction } from '../types';

// Add TypeScript declaration for the 'marked' library loaded from CDN
declare global {
    interface Window { marked: { parse: (markdown: string) => string }; }
}

const ChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
    const { role, content, proposedAction } = message;
    const { dispatch } = useAppContext();
    const isUser = role === 'user';

    const handleConfirm = (actionId: string) => {
        dispatch({ type: 'EXECUTE_PROPOSED_ACTION', payload: { actionId } });
    };

    const handleCancel = (actionId: string) => {
        dispatch({ type: 'UPDATE_ACTION_STATUS', payload: { actionId, status: 'cancelled' } });
    };

    return (
        <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center">
                    <AiIcon className="w-5 h-5 text-white" />
                </div>
            )}
            <div className={`max-w-xl p-4 rounded-xl ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                {isUser ? (
                    <p className="text-sm whitespace-pre-wrap">{content}</p>
                ) : (
                    <div
                        className="prose prose-sm prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(content) : content }}
                    />
                )}
                {proposedAction && (
                    <div className="mt-4 border-t border-gray-700 pt-3">
                        {proposedAction.status === 'pending' && (
                             <div className="flex items-center gap-3">
                                <p className="text-xs text-yellow-400">Awaiting confirmation:</p>
                                <button onClick={() => handleConfirm(proposedAction.id)} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-500">
                                    Confirm
                                </button>
                                <button onClick={() => handleCancel(proposedAction.id)} className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-500">
                                    Cancel
                                </button>
                            </div>
                        )}
                         {proposedAction.status === 'executed' && (
                             <p className="text-xs text-green-400">✓ Action executed successfully.</p>
                         )}
                         {proposedAction.status === 'cancelled' && (
                            <p className="text-xs text-gray-500">✗ Action cancelled.</p>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

const AiAssistant: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [prompt, setPrompt] = useState('');
    const [previewWidth, setPreviewWidth] = useState('100%');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [state.chatHistory, state.isModelLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || state.isModelLoading || state.leads.length === 0 || !state.template) return;
        
        const userMessage = { role: 'user' as const, content: prompt };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMessage });
        dispatch({ type: 'SET_MODEL_LOADING', payload: true });
        
        const currentPrompt = prompt;
        setPrompt('');

        const modelResponse = await generateContent(state.leads, currentPrompt, [...state.chatHistory, userMessage], state.template, state.organizationDocument);
        
        // Handle function calls first
        if (modelResponse.functionCalls && modelResponse.functionCalls.length > 0) {
            const action = modelResponse.functionCalls[0];
            const proposedAction: ProposedAction = {
                id: `action_${Date.now()}`,
                functionCall: { name: action.name, args: action.args },
                status: 'pending',
            };
            dispatch({
                type: 'ADD_CHAT_MESSAGE',
                payload: {
                    role: 'model' as const,
                    content: modelResponse.text,
                    proposedAction,
                }
            });
            dispatch({ type: 'SET_MODEL_LOADING', payload: false });
            return;
        }


        let chatResponseContent = modelResponse.text;
        let isMultiFileProject = false;

        try {
            const parsedJson = JSON.parse(modelResponse.text);
            // Heuristic to check if it's a multi-file object
            if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson) && Object.keys(parsedJson).some(k => k.includes('.'))) {
                
                const files = parsedJson as Record<string, string>;
                const fileNames = Object.keys(files);
                const htmlFile = fileNames.find(f => f.endsWith('.html') || f.endsWith('.htm'));

                if (htmlFile) {
                    isMultiFileProject = true;
                    chatResponseContent = `I've generated a project with the following files: ${fileNames.join(', ')}.`;
                    
                    let finalHtml = files[htmlFile];
                    
                    // Inject CSS
                    for (const fileName of fileNames) {
                        if (fileName.endsWith('.css')) {
                             finalHtml = finalHtml.replace('</head>', `<style>${files[fileName]}</style></head>`);
                        }
                    }

                    // Inject JS
                     for (const fileName of fileNames) {
                        if (fileName.endsWith('.js')) {
                            finalHtml = finalHtml.replace('</body>', `<script>${files[fileName]}</script></body>`);
                        }
                    }
                    dispatch({ type: 'SET_PREVIEW_CONTENT', payload: finalHtml });
                }
            }
        } catch (error) {
            // Not a JSON object, or not the format we expect. Treat as single file/text.
        }
        
        if (!isMultiFileProject) {
            let codeForPreview: string | null = null;
            const responseText = modelResponse.text.trim();

            // Regex to find ```html ... ``` or ``` ... ``` blocks
            const codeBlockRegex = /```(?:html)?\s*([\s\S]*?)\s*```/;
            const match = responseText.match(codeBlockRegex);
            
            if (match && match[1]) {
                // If a markdown code block is found, use its content
                const extractedCode = match[1].trim();
                if (extractedCode.startsWith('<')) {
                    codeForPreview = extractedCode;
                }
            } else if (responseText.startsWith('<')) {
                // Fallback for raw HTML responses without markdown fences
                codeForPreview = responseText;
            }

            if (codeForPreview) {
                chatResponseContent = `I've generated a preview for your request: "${currentPrompt}"`;
                dispatch({ type: 'SET_PREVIEW_CONTENT', payload: codeForPreview });
            }
        }

        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'model' as const, content: chatResponseContent } });
        dispatch({ type: 'SET_MODEL_LOADING', payload: false });
    };
    
    const getPlaceholderText = () => {
        if (state.leads.length === 0) return "Upload leads in the Dashboard to get started...";
        return "e.g., 'Create a webpage for the top 3 leads from Brazil'";
    }

    const isChatDisabled = state.isModelLoading || state.leads.length === 0;

    const ResponsiveButton: React.FC<{
        label: string;
        width: string;
        currentWidth: string;
        setWidth: (width: string) => void;
        children: React.ReactNode;
    }> = ({ label, width, currentWidth, setWidth, children }) => (
        <button
            onClick={() => setWidth(width)}
            title={label}
            className={`p-2 rounded-md transition-colors ${
                currentWidth === width ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex h-full bg-gray-900">
            <div className="flex flex-col w-[30%] flex-shrink-0 border-r border-gray-800">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">AI Assistant</h2>
                    <p className="text-sm text-gray-400">Chat with your leads data and create anything.</p>
                </div>
                <div ref={chatContainerRef} className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {state.chatHistory.map((msg, index) => (
                        <ChatMessage key={index} message={msg} />
                    ))}
                    {state.isModelLoading && (
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center animate-pulse">
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
                            className="flex-1 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-gray-500 disabled:cursor-not-allowed"
                        />
                        <button type="submit" disabled={isChatDisabled || !prompt.trim()} className="p-3 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors">
                           <SendIcon className="w-6 h-6"/>
                        </button>
                    </form>
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-black">
                <div className="p-2 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full bg-red-500 ml-2"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
                        <ResponsiveButton label="Desktop" width="100%" currentWidth={previewWidth} setWidth={setPreviewWidth}>
                            <DesktopIcon className="w-5 h-5" />
                        </ResponsiveButton>
                        <ResponsiveButton label="Tablet" width="768px" currentWidth={previewWidth} setWidth={setPreviewWidth}>
                            <TabletIcon className="w-5 h-5" />
                        </ResponsiveButton>
                        <ResponsiveButton label="Mobile" width="375px" currentWidth={previewWidth} setWidth={setPreviewWidth}>
                            <MobileIcon className="w-5 h-5" />
                        </ResponsiveButton>
                    </div>
                     <div className="w-24"></div> {/* Spacer */}
                </div>
                <div className="flex-1 flex justify-center items-start p-4 bg-gray-900 overflow-auto">
                    <iframe
                        srcDoc={state.previewContent}
                        title="AI Preview"
                        className="h-full bg-white border-2 border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ease-in-out"
                        style={{ width: previewWidth }}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
};

export default AiAssistant;