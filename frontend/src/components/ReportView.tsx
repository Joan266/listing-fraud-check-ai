import React from 'react';
import type { AnalysisResult } from '../types';
import { Map, Marker } from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Eye, 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Image,
  MessageSquare,
  DollarSign,
  Home,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface ReportViewProps {
  analysisResult: AnalysisResult;
}

const ReportView: React.FC<ReportViewProps> = ({ analysisResult }) => {
  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-600';
  };

  const getTrustScoreBackground = (score: number) => {
    if (score >= 80) return 'from-emerald-400 to-emerald-500';
    if (score >= 60) return 'from-amber-400 to-amber-500';
    return 'from-rose-400 to-rose-500';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 80) return 'Alta Confianza';
    if (score >= 60) return 'Confianza Moderada';
    return 'Baja Confianza';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertTriangle;
      case 'medium': return AlertCircle;
      case 'low': return Info;
      default: return Info;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image': return Image;
      case 'communication': return MessageSquare;
      case 'pricing': return DollarSign;
      case 'location': return MapPin;
      default: return Home;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'image': return 'Análisis de Imagen';
      case 'communication': return 'Análisis de Comunicación';
      case 'pricing': return 'Análisis de Precios';
      case 'location': return 'Análisis de Ubicación';
      default: return 'General';
    }
  };

  // Group alerts by category
  const alertsByCategory = analysisResult.alerts.reduce((acc, alert) => {
    if (!acc[alert.category]) {
      acc[alert.category] = [];
    }
    acc[alert.category].push(alert);
    return acc;
  }, {} as Record<string, typeof analysisResult.alerts>);

  return (
    <><div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-800">Ubicación</h3>
          {analysisResult.location.verified && (
            <CheckCircle className="w-4 h-4 text-emerald-500 animate-pulse" />
          )}
        </div>

        <div className="bg-slate-200 rounded-lg h-48 relative shadow-inner">
          <Map
            defaultCenter={{ lat: analysisResult.location.lat, lng: analysisResult.location.lng }}
            defaultZoom={15}
            mapId="fraud-check-map"
            streetViewControl={false}
            className="w-full h-full"
          >
            <Marker position={{ lat: analysisResult.location.lat, lng: analysisResult.location.lng }} />
          </Map>
        </div>
        <div className="bg-slate-200 rounded-lg h-32 relative shadow-inner">
          <iframe
            className="w-full h-full border-0 rounded-lg"
            loading="lazy"
            allowFullScreen
            src={`https://www.google.com/maps/embed/v1/streetview?key={import.meta.env.VITE_Maps_API_KEY}&location=${analysisResult.location.lat},${analysisResult.location.lng}&heading=235&pitch=10&fov=90`}>
          </iframe>
        </div>
      </div>

      <div className="bg-slate-200 rounded-lg h-32 flex items-center justify-center relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-300 to-slate-400"></div>
        <div className="relative z-10 text-center">
          <Eye className="w-6 h-6 text-slate-600 mx-auto mb-1" />
          <p className="text-sm font-medium text-slate-700">Street View</p>
        </div>
      </div>
    </div><div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Trust Score</h3>
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>

        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Circular Progress */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-200" />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(analysisResult.trustScore / 100) * 314} 314`}
                className={`${getTrustScoreColor(analysisResult.trustScore)} transition-all duration-2000 drop-shadow-sm`}
                strokeLinecap="round" />
            </svg>

            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getTrustScoreColor(analysisResult.trustScore)}`}>
                {analysisResult.trustScore}
              </span>
              <span className="text-sm text-slate-500">/ 100</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className={`text-lg font-semibold ${getTrustScoreColor(analysisResult.trustScore)}`}>
            {getTrustScoreLabel(analysisResult.trustScore)}
          </p>
        </div>
      </div><div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Resumen Ejecutivo</h3>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 shadow-sm">
          <p className="text-slate-700 leading-relaxed">
            {analysisResult.executiveSummary}
          </p>
        </div>
      </div><div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Alertas Detectadas</h3>
        <div className="space-y-4">
          {Object.entries(alertsByCategory).map(([category, alerts]) => {
            const CategoryIcon = getCategoryIcon(category);
            return (
              <div key={category} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="w-4 h-4 text-slate-600" />
                    <h4 className="font-medium text-slate-800">
                      {getCategoryLabel(category)}
                    </h4>
                    <span className="text-sm text-slate-500">
                      ({alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'})
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {alerts.map((alert) => {
                    const SeverityIcon = getSeverityIcon(alert.severity);
                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} transform hover:scale-[1.01] transition-transform duration-200`}
                      >
                        <div className="flex items-start space-x-3">
                          <SeverityIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium">{alert.title}</h5>
                            <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div></>
  );
};

export default ReportView;