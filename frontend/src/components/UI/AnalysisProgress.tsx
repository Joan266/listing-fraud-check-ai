import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAppSelector } from '../../hooks/redux';

interface StepProgress {
  job_name: string;
  status: string;
  description?: string;
}

const JOB_LABELS: Record<string, string> = {
  geocode: 'Verificación de dirección',
  place_details: 'Detalles del lugar',
  neighborhood_analysis: 'Análisis del barrio',
  reputation_check: 'Reputación del anfitrión',
  description_plagiarism_check: 'Detección de plagio',
  description_analysis: 'Análisis de descripción',
  communication_analysis: 'Análisis de comunicaciones',
  listing_reviews_analysis: 'Análisis de reseñas',
  reverse_image_search: 'Búsqueda inversa de imágenes',
  ai_image_detection: 'Detección de imágenes IA',
  price_sanity_check: 'Análisis de precio',
  host_profile_check: 'Perfil del anfitrión',
  online_presence_analysis: 'Presencia online',
  url_forensics: 'Análisis forense de URL',
  catastro_check: 'Registro del Catastro',
};

const ALL_JOBS = Object.keys(JOB_LABELS);

interface AnalysisProgressProps {
  checkId: string;
  sessionId: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ checkId, sessionId }) => {
  const { theme } = useAppSelector((state) => state.app);
  const [completedSteps, setCompletedSteps] = useState<StepProgress[]>([]);
  const [isDone, setIsDone] = useState(false);

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const eventSource = new EventSource(
      `${baseURL}/api/v1/analysis/${checkId}/stream?session_id=${sessionId}`,
    );

    eventSource.addEventListener('step_complete', (event) => {
      const data: StepProgress = JSON.parse(event.data);
      setCompletedSteps((prev) => {
        if (prev.some((s) => s.job_name === data.job_name)) return prev;
        return [...prev, data];
      });
    });

    eventSource.addEventListener('done', () => {
      setIsDone(true);
      eventSource.close();
    });

    eventSource.addEventListener('error', () => {
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [checkId, sessionId, baseURL]);

  const progress = Math.round((completedSteps.length / ALL_JOBS.length) * 100);

  return (
    <div className={`h-full flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-yellow-400/30 rounded-full animate-ping" />
            <BrandLogo size={40} />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
            {isDone ? '¡Análisis completado!' : 'Analizando tu anuncio...'}
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {completedSteps.length} de {ALL_JOBS.length} verificaciones completadas
          </p>
        </div>

        <div className="w-full mb-6">
          <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {ALL_JOBS.map((jobName) => {
            const step = completedSteps.find((s) => s.job_name === jobName);
            const isCompleted = !!step;
            const isError = step?.status === 'ERROR';
            const isSkipped = step?.status === 'SKIPPED';

            return (
              <div
                key={jobName}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 ${
                  isCompleted
                    ? theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    : theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                }`}
              >
                <span className={`text-sm ${
                  isCompleted
                    ? theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {JOB_LABELS[jobName] || jobName}
                </span>
                <span>
                  {isError ? (
                    <AlertCircle size={16} className="text-red-400" />
                  ) : isSkipped ? (
                    <span className="text-xs text-gray-400">OMITIDO</span>
                  ) : isCompleted ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <Clock size={16} className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'} />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
