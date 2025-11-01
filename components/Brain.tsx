import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BrainIcon } from './icons';

// Add TypeScript declaration for the 'marked' library loaded from CDN
declare global {
    interface Window { marked: { parse: (markdown: string) => string }; }
}

const Brain: React.FC = () => {
    const { state } = useAppContext();
    const { leads, template, isBrainAnalyzing, brainAnalysis } = state;

    const renderStatus = () => {
        if (isBrainAnalyzing) {
            return (
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-900 border border-blue-700 rounded-lg">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-300">Analyzing...</span>
                </div>
            );
        }
        if (leads.length > 0) {
            return (
                <div className="flex items-center gap-3 px-4 py-2 bg-green-900 border border-green-700 rounded-lg">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-medium text-green-300">Ready & Up-to-Date</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-400">Awaiting Data</span>
            </div>
        );
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-4xl font-bold text-white mb-2">AI Brain</h2>
                    <p className="text-gray-400">An overview of the AI's current knowledge and analysis of your data.</p>
                </div>
                {renderStatus()}
            </div>
            
            <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Current Data Context</h3>
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-400">Leads Loaded:</span>
                        <span className="font-mono text-lg font-bold text-blue-400">{leads.length}</span>
                    </div>
                    {template && (
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-400">Template Fields:</span>
                            <span className="font-mono text-lg font-bold text-orange-400">{template.length}</span>
                        </div>
                    )}
                </div>
                {template && (
                    <div className="mt-4">
                        <p className="font-mono text-xs text-gray-500 bg-black p-3 rounded-md">{template.join(', ')}</p>
                    </div>
                )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 min-h-[400px] flex flex-col">
                {brainAnalysis ? (
                    <div
                        className="prose prose-lg prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(brainAnalysis) : brainAnalysis }}
                    />
                ) : isBrainAnalyzing ? (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 m-auto">
                        <BrainIcon className="w-16 h-16 mb-4 animate-pulse text-blue-500" />
                        <p className="text-lg">The AI is analyzing your data...</p>
                        <p>This may take a moment.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 m-auto">
                        <BrainIcon className="w-16 h-16 mb-4 text-gray-600" />
                        <h3 className="text-xl font-semibold text-white mb-2">The Brain is Idle</h3>
                        <p>Upload a template and leads on the Dashboard to begin analysis.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Brain;