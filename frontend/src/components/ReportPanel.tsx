import React from 'react';
import ReportView from './ReportView';
import type { AnalysisResult } from '../types';
import { Shield, MapPin, Brain, TrendingUp,Radar } from 'lucide-react';

interface ReportPanelProps {
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
}

const ReportPanel: React.FC<ReportPanelProps> = ({ isAnalyzing, analysisResult }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 min-h-[600px] transform hover:shadow-xl transition-all duration-300">
      {/* Initial State */}
      {!isAnalyzing && !analysisResult && (
        <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <div className="relative">
              <Shield className="w-12 h-12 text-indigo-500" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Protect Your Rental Search
          </h3>
          <p className="text-gray-600 mb-6">
            Enter a rental listing to receive a comprehensive fraud analysis and trust score.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-900">Análisis de ubicación</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <Radar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-900">Detección de fraude</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-900">Trust Score</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-500 border-t-transparent shadow-lg"></div>
            <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Analizando...
          </h3>
          <p className="text-slate-600 mb-6">
            Ejecutando algoritmos de detección de fraude
          </p>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-center space-x-2">
              <MapPin className="w-4 h-4 text-indigo-500 animate-bounce" />
              <span>Verificando ubicación</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-4 h-4 text-purple-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span>Analizando imágenes</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Brain className="w-4 h-4 text-indigo-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span>Evaluando comunicación</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600 animate-bounce" style={{ animationDelay: '0.3s' }} />
              <span>Calculando Trust Score</span>
            </div>
          </div>
        </div>
      )}

      {/* Results State */}
      {!isAnalyzing && analysisResult && (
        <div className="animate-slideInUp">
          <ReportView analysisResult={analysisResult} />
        </div>
      )}
    </div>
  );
};

export default ReportPanel;