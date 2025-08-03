import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import UrlForensicsStep from './analysis-steps/UrlForensicStep';
import PriceAnalysisStep from './analysis-steps/PriceAnalysisSteps';
import ReviewsAnalysisStep from './analysis-steps/ReviewsAnalysisStep';
import GenericAnalysisStep from './analysis-steps/GenericAnalysisStep';

// Mock data type
interface AnalysisStep {
    job_name: string;
    description: string;
    status: string;
    inputs_used: Record<string, any>;
    result: Record<string, any>;
}

// --- Helper function to format job names ---
const formatJobName = (snakeCaseName: string): string => {
    return snakeCaseName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

interface AnalysisRunbookProps {
    steps: AnalysisStep[];
    theme?: 'light' | 'dark';
}

export const AnalysisRunbook: React.FC<AnalysisRunbookProps> = ({ steps, theme = 'light' }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    
    // --- 1. Sorting the analysis steps for better readability ---
    const sortedSteps = useMemo(() => {
        const statusOrder: { [key: string]: number } = { 'COMPLETED': 1, 'SKIPPED': 2, 'ERROR': 3 };
        return [...steps].sort((a, b) => (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4));
    }, [steps]);

    const toggleStep = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200";
        switch (status) {
            case 'COMPLETED': 
                return `${baseClasses} ${theme === 'dark' ? 'bg-green-400/20 text-green-400 border border-green-400/30' : 'bg-green-100 text-green-800 border border-green-200'}`;
            case 'SKIPPED': 
                return `${baseClasses} ${theme === 'dark' ? 'bg-gray-700 text-gray-300 border border-gray-600' : 'bg-gray-100 text-gray-700 border border-gray-200'}`;
            case 'ERROR': 
                return `${baseClasses} ${theme === 'dark' ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-800 border border-red-200'}`;
            default: 
                return `${baseClasses} ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-blue-100 text-blue-800 border border-blue-200'}`;
        }
    };

    const renderStepContent = (step: AnalysisStep) => {
        switch (step.job_name) {
            case 'url_forensics':
                return (
                    <UrlForensicsStep
                        inputs_used={step.inputs_used}
                        result={step.result}
                        theme={theme}
                    />
                );
            case 'price_sanity_check':
                return (
                    <PriceAnalysisStep
                        inputs_used={step.inputs_used}
                        result={step.result}
                        theme={theme}
                    />
                );
            case 'listing_reviews_analysis':
                return (
                    <ReviewsAnalysisStep
                        inputs_used={step.inputs_used}
                        result={step.result}
                        theme={theme}
                    />
                );
            default:
                return (
                    <GenericAnalysisStep
                        job_name={step.job_name}
                        description={step.description}
                        status={step.status}
                        inputs_used={step.inputs_used}
                        result={step.result}
                        theme={theme}
                    />
                );
        }
    };

    return (
        <div className={`border rounded-xl shadow-sm transition-all duration-300 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Forensic Analysis Details
                </h2>
                <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {steps.filter(s => s.status === 'COMPLETED').length} analysis steps completed
                </p>
            </div>
            
            <div className="p-6">
                <div className="space-y-3">
                    {sortedSteps.map((step, index) => {
                        const isExpanded = expandedSteps.has(index);
                    
                        return (
                            <div 
                                key={index} 
                                className={`rounded-lg border transition-all duration-200 ${
                                    theme === 'dark' 
                                        ? 'bg-gray-900/50 border-gray-700 hover:border-yellow-400/50' 
                                        : 'bg-gray-50/50 border-gray-200 hover:border-yellow-300'
                                }`}
                            >
                                <button
                                    onClick={() => toggleStep(index)}
                                    className={`w-full p-4 text-left flex items-center justify-between transition-colors duration-200 ${
                                        theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/50'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {formatJobName(step.job_name)}
                                            </h3>
                                            <span className={getStatusBadge(step.status)}>
                                                {step.status}
                                            </span>
                                        </div>
                                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {step.description}
                                        </p>
                                    </div>
                                    <div className={`ml-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'rotate-0'} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <div className="p-4">
                                            {renderStepContent(step)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};