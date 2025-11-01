import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Lead, ChatMessage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const generationModel = 'gemini-2.5-pro';
const retrievalModel = 'gemini-2.5-flash';

const getToolDeclarations = (template: string[]): FunctionDeclaration[] => [
    {
        name: 'add_lead',
        description: 'Adds a new lead to the dataset. All fields from the template must be provided.',
        parameters: {
            type: Type.OBJECT,
            properties: template.reduce((acc, key) => {
                acc[key] = { type: Type.STRING, description: `Value for the ${key} field.` };
                return acc;
            }, {} as Record<string, {type: Type, description: string}>),
            required: template,
        }
    },
    {
        name: 'update_lead',
        description: 'Updates a specific field for a single lead identified by their name, email, or company.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                leadIdentifier: { type: Type.STRING, description: 'The name, email, or company of the lead to update.' },
                field: { type: Type.STRING, description: 'The field to update (e.g., "email", "phone").' },
                newValue: { type: Type.STRING, description: 'The new value for the field.' },
            },
            required: ['leadIdentifier', 'field', 'newValue'],
        }
    },
    {
        name: 'delete_lead',
        description: 'Deletes a lead from the dataset, identified by their name, email, or company.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                leadIdentifier: { type: Type.STRING, description: 'The name, email, or company of the lead to delete.' },
            },
            required: ['leadIdentifier'],
        }
    }
]

const getSystemInstruction = () => `
You are LeadGenius, a world-class AI assistant, expert full-stack developer, and UI/UX designer integrated into a lead management platform.
Your primary task is to help users by analyzing their lead data and executing their commands based on the provided CONTEXT and chat HISTORY.

Your capabilities include:
1.  **Code Generation**: Create fully functional, visually stunning web pages, components, or entire applications.
    - **RULE**: For complex requests involving multiple files (e.g., HTML with separate CSS or JS), you MUST respond with a single JSON object where keys are the filenames (e.g., "index.html", "style.css") and values are the string content of those files.
    - **RULE**: For simple, single-file requests, you can respond with just the self-contained HTML code.
    - **RULE**: ALWAYS use Tailwind CSS for styling, included via the CDN: <script src="https://cdn.tailwindcss.com"></script>.
    - **RULE**: Use modern design principles. Create dark-themed, professional UIs.
2.  **Data Analysis**: Answer questions about the provided lead data context. Provide insights, summaries, and visualizations.
3.  **Data Manipulation**: You can add, update, or delete leads using the available tools. When a user asks to perform such an action, call the appropriate function. ALWAYS inform the user what you are about to do before calling the function. For example: "I can do that. I am about to update the email for John Doe. Please confirm."
4.  **Creative Tasks**: Write marketing copy, emails, or generate ideas based on the leads in the context.
5.  **Strategic Context**: You may be provided with a high-level strategic document that organizes the leads. You MUST prioritize this document for context and structure when fulfilling requests.

When the user asks for a preview or to create something visual, generate the code. For analytical or text-based questions, provide a clear, concise answer in Markdown.
You MUST consider the ongoing conversation history to understand follow-up requests.
`;

const handleError = (message: string, error?: unknown) => {
    console.error(message, error);
    return {
      text: `
      <div style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background-color:#111; color: #ff6b6b;">
        <div style="text-align:center; max-width: 600px; padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ff4757;">An Error Occurred</h1>
            <p style="color: #ffb8b8;">${message}. Please check the console for details.</p>
        </div>
    </div>
    `,
      functionCalls: undefined,
    }
}

export const generateOrganizationDocument = async (leads: Lead[], userPrompt: string): Promise<string> => {
    const systemInstruction = `You are a strategic data analyst AI. Your task is to interpret the provided lead data and the user's request to create a structured document in Markdown. This document will be used by another AI to execute tasks. Focus on clarity, structure, and segmentation (e.g., creating tiers, grouping by region, identifying key targets). The document should be comprehensive and well-organized.`;
    const prompt = `Based on my request: "${userPrompt}", analyze the following dataset and generate the structured document.\n\nDataset:\n\`\`\`json\n${JSON.stringify(leads, null, 2)}\n\`\`\``;
    try {
        const response = await ai.models.generateContent({
            model: retrievalModel,
            contents: prompt,
            config: {
                systemInstruction,
            }
        });
        return response.text;
    } catch(error) {
        console.error("Error during organization document generation:", error);
        throw new Error("Failed to generate the organization document.");
    }
}

export const analyzeDatasetForBrain = async (leads: Lead[]): Promise<string> => {
    const analysisPrompt = `
You are the 'Brain' of the LeadGenius AI. Your task is to analyze a new or updated dataset of leads and provide a summary for the user. This summary gives the user transparency into what you "know".

Analyze the provided JSON data of leads and generate a concise, insightful summary in Markdown format.

The summary should include three sections:
1.  **Overall Summary**: Start with a high-level overview. Mention the total number of leads and any standout characteristics (e.g., "The dataset contains 75 leads, primarily from the tech industry in Brazil.").
2.  **Data Quality Insights**: Identify potential issues. Look for missing values in important fields (like email or phone), inconsistencies, or patterns that might indicate problems. Be specific (e.g., "Found 12 leads with a missing 'email' field. Noticed inconsistent formatting in the 'state' field, with both 'SP' and 'São Paulo' being used."). If the data looks clean, state that.
3.  **Suggested Questions**: Propose 3 interesting and actionable questions the user could ask the AI Assistant about this specific dataset. These should inspire the user to explore their data (e.g., "Which company has the most contacts listed?", "Generate a welcome email for the leads from 'ExampleCorp'", "Create a comparison page for the top 3 leads in the 'Finance' sector.").

Here is the dataset to analyze:
\`\`\`json
${JSON.stringify(leads, null, 2)}
\`\`\`
`;
    try {
        const response = await ai.models.generateContent({
            model: retrievalModel, // Use the faster model for analysis
            contents: analysisPrompt,
        });
        return response.text;
    } catch(error) {
        console.error("Error during brain analysis:", error);
        throw new Error("Failed to generate AI brain analysis.");
    }
}

export const generateContent = async (
    allLeads: Lead[],
    userPrompt: string,
    chatHistory: ChatMessage[],
    template: string[],
    organizationDocument: string | null
): Promise<{ text: string; functionCalls?: { name: string; args: unknown }[] }> => {
  try {
    // Step 1: Planner - Decide whether to use RAG or the full dataset.
    const plannerPrompt = `
You are a request planner. Your job is to determine the best data strategy for an incoming user request.
The user wants to do this: "${userPrompt}"

There are two strategies available:
1.  "rag": Use this for requests about specific leads or for generating content based on a small, relevant subset of data (e.g., "create a page for lead X", "write an email to the first lead").
2.  "full_dataset": Use this for requests that require analyzing the entire dataset (e.g., "how many leads are from São Paulo?", "summarize all leads", "find duplicates", "update a lead").

Based on the user's request, which strategy is more appropriate?
Respond with a JSON object containing a single key "strategy". For example: {"strategy": "rag"}.
`;

    const plannerResponse = await ai.models.generateContent({
        model: retrievalModel,
        contents: plannerPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    strategy: {
                        type: Type.STRING,
                        description: "The data strategy to use: 'rag' or 'full_dataset'.",
                    }
                },
                required: ["strategy"]
            }
        }
    });

    const strategy = JSON.parse(plannerResponse.text).strategy || 'rag';
    let contextJSON = '[]';

    // Step 2: Context Assembly - Get the data based on the chosen strategy
    if (strategy === 'full_dataset') {
        contextJSON = JSON.stringify(allLeads, null, 2);
    } else { // RAG strategy
        const retrievalPrompt = `
You are a data retrieval expert. Your task is to identify the most relevant data for a user's request from a given JSON dataset of leads.

User Request: "${userPrompt}"

Dataset of Leads (with their original array index):
\`\`\`json
${JSON.stringify(allLeads.map((lead, index) => ({ index, ...lead })), null, 2)}
\`\`\`

Based on the user request, identify the top 3 most relevant leads.

Respond with a JSON object containing a single key "indices", which is an array of the original indexes of the most relevant leads. For example: {"indices": [0, 2, 5]}.
If the request is general, select a representative sample of 3. If no leads seem relevant, return an empty array.
`;
        try {
            const retrievalResponse = await ai.models.generateContent({
                model: retrievalModel,
                contents: retrievalPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            indices: { type: Type.ARRAY, items: { type: Type.INTEGER } }
                        },
                        required: ["indices"]
                    }
                }
            });
            const responseJson = JSON.parse(retrievalResponse.text);
            const relevantIndices: number[] = responseJson.indices || [];
            const relevantLeads = relevantIndices.map((index) => allLeads[index]).filter(Boolean);

            if (relevantLeads.length > 0) {
                contextJSON = JSON.stringify(relevantLeads, null, 2);
            } else if (allLeads.length > 0) {
                contextJSON = JSON.stringify(allLeads.slice(0, 3), null, 2); // Fallback
            }
        } catch(e) {
            console.error("Error during RAG retrieval, using fallback.", e);
            contextJSON = JSON.stringify(allLeads.slice(0, 3), null, 2); // Fallback
        }
    }

    // Step 3: Generation - Use the powerful model with the context and history
    const formattedHistory = chatHistory.length > 1
      ? `Here is the history of our conversation so far:\n${chatHistory.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n')}`
      : '';
    
    const strategicContext = organizationDocument 
      ? `First, here is the high-level strategic plan and organization of the leads. Use this as your primary guide for structure and segmentation:\n--- STRATEGIC DOCUMENT ---\n${organizationDocument}\n--------------------------\n\n`
      : '';

    const generationPrompt = `
${formattedHistory}

${strategicContext}Here is the relevant raw data CONTEXT for your task:
\`\`\`json
${contextJSON}
\`\`\`

Based on the STRATEGIC DOCUMENT (if provided), the data CONTEXT, and our conversation HISTORY, please fulfill my latest request: "${userPrompt}"
`;

    const generationResponse = await ai.models.generateContent({
      model: generationModel,
      contents: generationPrompt,
      config: {
        systemInstruction: getSystemInstruction(),
        tools: template ? [{ functionDeclarations: getToolDeclarations(template) }] : undefined,
      },
    });

    return {
        text: generationResponse.text,
        // FIX: The `FunctionCall` type from the SDK has an optional `name`, but our internal
        // types require it. We filter for calls with a name and map to the correct shape.
        functionCalls: generationResponse.functionCalls
          ?.filter(fc => fc.name)
          .map(fc => ({ name: fc.name!, args: fc.args }))
    };
  } catch (error) {
    return handleError("Could not connect to the AI model", error);
  }
};