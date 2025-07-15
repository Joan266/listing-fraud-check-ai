// src/components/InputForm.tsx
// src/components/InputForm.tsx
import type { AnalysisData } from '../types'; 
import React, { useState } from 'react';
import { Search, FileText, Image, MessageSquare, Clipboard, Shield } from 'lucide-react';

interface InputFormProps {
  onAnalyze: (data: AnalysisData) => void;
  isLoading: boolean; 
}
const InputForm: React.FC<InputFormProps> = ({ onAnalyze, isLoading }) => {
  const [formData, setFormData] = useState<AnalysisData>({
    address: '',
    description: '',
    imageUrls: '',
    hostConversation: '',
    rawListing: ''
  });

  const handleInputChange = (field: keyof AnalysisData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRawListingPaste = (value: string) => {
    setFormData(prev => ({
      ...prev,
      rawListing: value
    }));

    // Simple auto-parsing logic
    if (value.trim()) {
      // Extract potential address
      const addressMatch = value.match(/(?:dirección|ubicación|address|calle|street)[:\s]+([^\n,]+)/i);
      if (addressMatch) {
        setFormData(prev => ({
          ...prev,
          address: addressMatch[1].trim()
        }));
      }

      // Extract potential price and description
      const lines = value.split('\n').filter(line => line.trim());
      if (lines.length > 2) {
        setFormData(prev => ({
          ...prev,
          description: lines.slice(0, 3).join(' ').substring(0, 200) + '...'
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.address.trim() || formData.rawListing.trim()) {
      onAnalyze(formData);
    }
  };

  const isFormValid = formData.address.trim() || formData.rawListing.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Raw Listing Paste Area */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <Clipboard className="inline w-4 h-4 mr-1" />
          Contenido del Anuncio
        </label>
        <textarea
          value={formData.rawListing}
          onChange={(e) => handleRawListingPaste(e.target.value)}
          placeholder="Copia y pega aquí el contenido de la página del anuncio para autocompletar el formulario..."
          className="w-full h-24 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder-slate-500 bg-slate-50 transition-all duration-200 hover:border-slate-400"
        />
        <p className="text-xs text-slate-500 mt-1">
          Pega el contenido completo del anuncio y los campos se completarán automáticamente
        </p>
      </div>

      {/* Address Field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <Search className="inline w-4 h-4 mr-1" />
          Dirección
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Ingresa la dirección de la propiedad"
            className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-slate-400"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <FileText className="inline w-4 h-4 mr-1" />
          Descripción del Anuncio
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Descripción completa de la propiedad..."
          className="w-full h-20 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-slate-400"
        />
      </div>

      {/* Image URLs Field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <Image className="inline w-4 h-4 mr-1" />
          URLs de las Imágenes
        </label>
        <textarea
          value={formData.imageUrls}
          onChange={(e) => handleInputChange('imageUrls', e.target.value)}
          placeholder="URLs de las imágenes del anuncio (una por línea)..."
          className="w-full h-16 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-slate-400"
        />
      </div>

      {/* Host Conversation Field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <MessageSquare className="inline w-4 h-4 mr-1" />
          Conversación con el Anfitrión
        </label>
        <textarea
          value={formData.hostConversation}
          onChange={(e) => handleInputChange('hostConversation', e.target.value)}
          placeholder="Copia aquí la conversación que hayas tenido con el propietario..."
          className="w-full h-20 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-slate-400"
        />
      </div>

      {/* Analyze Button */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Analizando...</span>
          </>
        ) : (
          <>
            <Shield className="w-5 h-5" />
            <span>Analizar Anuncio</span>
          </>
        )}
      </button>
    </form>
  );
};

export default InputForm;