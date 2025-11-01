import React, { useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Lead } from '../types';
import { UploadIcon, FileIcon } from './icons';
import * as XLSX from 'xlsx';

const processSpreadsheet = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                // Ensure all data is string
                const stringData = json.map(row => row.map(cell => String(cell)));
                resolve(stringData);
            } catch (error) {
                console.error("Spreadsheet parsing error:", error);
                reject(new Error("Failed to parse spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};


const FileUploader: React.FC<{
    title: string;
    description: string;
    onFileUpload: (file: File) => void;
    isDisabled?: boolean;
    acceptedFileType: string;
}> = ({ title, description, onFileUpload, isDisabled = false, acceptedFileType }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        if (isDisabled) return;
        const file = event.dataTransfer.files?.[0];
        if (file) {
            onFileUpload(file);
        }
    };

    return (
        <div className={`bg-gray-900 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDisabled ? 'border-gray-700 text-gray-600 cursor-not-allowed' : 'border-gray-600 hover:border-blue-500 text-gray-400'}`}>
            <label onDragOver={handleDragOver} onDrop={handleDrop} className="cursor-pointer">
                <div className="flex flex-col items-center">
                    <UploadIcon className={`w-12 h-12 mb-4 ${isDisabled ? 'text-gray-700' : 'text-blue-500'}`} />
                    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                    <p className="mb-4">{description}</p>
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={isDisabled} className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed">
                        Select File
                    </button>
                    <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept={acceptedFileType} disabled={isDisabled} />
                </div>
            </label>
        </div>
    );
};


const LeadTable: React.FC = () => {
    const { state } = useAppContext();
    const { template, leads } = state;

    if (!template || leads.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500 p-8 bg-gray-900 rounded-lg">
                <p>No leads to display. Please upload a template and a leads spreadsheet.</p>
            </div>
        );
    }
    
    return (
        <div className="mt-8 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-800">
                        <tr>
                            {template.map((header) => (
                                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-800">
                        {leads.map((lead, index) => (
                            <tr key={index} className="hover:bg-gray-800 transition-colors">
                                {template.map((header) => (
                                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {lead[header] || ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const acceptedFileTypes = ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

    const handleTemplateUpload = useCallback(async (file: File) => {
        try {
            const data = await processSpreadsheet(file);
            const [header] = data;
            if (header) {
                dispatch({ type: 'SET_TEMPLATE', payload: header });
            } else {
                 alert("Could not find a header row in the template file.");
            }
        } catch (error) {
            alert((error as Error).message);
        }
    }, [dispatch]);

    const handleLeadsUpload = useCallback(async (file: File) => {
        if (!state.template) return;
        try {
            const data = await processSpreadsheet(file);
            const [, ...rows] = data;
            const newLeads: Lead[] = rows.map(row => {
                const lead: Lead = {};
                state.template?.forEach((header, index) => {
                    lead[header] = row[index] || ''; // Ensure value is not undefined
                });
                return lead;
            });
            dispatch({ type: 'ADD_LEADS', payload: newLeads });
        } catch (error) {
            alert((error as Error).message);
        }
    }, [state.template, dispatch]);

    return (
        <div className="p-8 h-full">
            <h2 className="text-4xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-gray-400 mb-8">Manage your lead spreadsheets and data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <FileUploader
                    title="1. Upload Template"
                    description="Upload a spreadsheet (.xlsx, .xls, .csv) with the header row to define your data structure."
                    onFileUpload={handleTemplateUpload}
                    acceptedFileType={acceptedFileTypes}
                />
                <FileUploader
                    title="2. Upload Leads"
                    description="Upload spreadsheets with your lead data. You can add multiple files."
                    onFileUpload={handleLeadsUpload}
                    acceptedFileType={acceptedFileTypes}
                    isDisabled={!state.template}
                />
            </div>
            
            {state.template && (
                <div className="flex items-center gap-4 p-4 mb-4 bg-gray-800 text-blue-300 rounded-lg border border-blue-900">
                    <FileIcon className="w-6 h-6"/>
                    <p className="font-mono text-sm">
                        <span className="font-bold">Active Template:</span> {state.template.join(', ')}
                    </p>
                </div>
            )}

            <LeadTable />
        </div>
    );
};

export default Dashboard;