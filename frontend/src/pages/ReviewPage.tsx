import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Edit3, MapPin, User, Home, Image, DollarSign, MessageSquare, Plus, X, Sparkles, ArrowLeft, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setCurrentAnalysisId, startAnalysisAsync, } from '../store/appSlice';
import { ExtractedData } from '../types';
import { toast } from 'react-hot-toast';
import MapComponent from '../components/UI/MapComponent';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gsap } from 'gsap';
import "react-datepicker/dist/react-datepicker.css";
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/UI/LoadingScreen';

const MAX_IMAGE_URLS = 8;

const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { theme, isLoading: isGlobalLoading } = useAppSelector((state) => state.app);

  const initialData = location.state?.extractedData || {};
  const hasExtractedData = !!(location.state?.extractedData);

  const [editableData, setEditableData] = useState<ExtractedData>(initialData);
  const [isAutoFilling, setIsAutoFilling] = useState(hasExtractedData);

  // --- Local UI state ---
  const [addressInputValue, setAddressInputValue] = useState(editableData?.address || '');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setCardRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[index] = el;
  }, []);

  const isDark = theme === 'dark';

  // Debouncing for address input
  useEffect(() => {
    if (addressInputValue === editableData.address) return;
    const debounceTimer = setTimeout(() => {
      setEditableData(prev => ({ ...prev, address: addressInputValue }));
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [addressInputValue, editableData.address]);

  // Entrance + auto-fill animation
  useEffect(() => {
    dispatch(setCurrentAnalysisId(null));

    if (hasExtractedData && containerRef.current) {
      const tl = gsap.timeline({
        onComplete: () => setIsAutoFilling(false),
      });

      tl.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );

      const cards = cardRefs.current.filter(Boolean);
      if (cards.length > 0) {
        tl.fromTo(cards,
          { opacity: 0, y: 25, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.12, ease: 'power2.out' },
          '-=0.1'
        );
        tl.fromTo(cards,
          { borderColor: 'rgba(59,130,246,0)' },
          { borderColor: 'rgba(59,130,246,0.5)', duration: 0.3, stagger: 0.08 },
          '-=0.3'
        );
        tl.to(cards, { borderColor: '', duration: 0.4, stagger: 0.08 });
      }
    } else if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  // --- Handlers ---
  const handleInputChange = (field: keyof ExtractedData, value: any) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImageUrl = () => {
    const trimmedUrl = newImageUrl.trim();
    const currentUrls = editableData.image_urls || [];
    if (currentUrls.length >= MAX_IMAGE_URLS) {
      toast.error(`Puedes añadir un máximo de ${MAX_IMAGE_URLS} imágenes.`);
      return;
    }
    if (trimmedUrl && !currentUrls.includes(trimmedUrl)) {
      handleInputChange('image_urls', [...currentUrls, trimmedUrl]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImageUrl = (indexToRemove: number) => {
    const updatedUrls = (editableData.image_urls || []).filter((_, index) => index !== indexToRemove);
    handleInputChange('image_urls', updatedUrls);
  };

  const handleMapUpdate = (newLocation: { lat: number; lng: number; address: string }) => {
    setEditableData(prev => ({ ...prev, address: newLocation.address }));
    setAddressInputValue(newLocation.address);
  };

  const handleSubmit = async () => {
    const isDataSufficient = editableData.address && editableData.description && editableData.price_details;
    if (!isDataSufficient) {
      setShowMissing(true);
      toast.error("Proporciona al menos una dirección, descripción y precio.");
      return;
    }
    setIsStartingAnalysis(true);
    try {
      const newAnalysis = await dispatch(startAnalysisAsync(editableData)).unwrap();
      navigate(`/results/${newAnalysis.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar el análisis.';
      toast.error(errorMessage);
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  if (isGlobalLoading) {
    return <LoadingScreen />;
  }

  const isDataSufficient = editableData.address && editableData.description && editableData.price_details;

  const isFieldFilled = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const missingClass = (field: unknown) =>
    showMissing && !isFieldFilled(field)
      ? (isDark ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-red-400 ring-1 ring-red-400/30')
      : '';

  const requiredBadge = <span className="text-red-400 ml-0.5">*</span>;

  const autoFilledBadge = hasExtractedData && !isAutoFilling ? (
    <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium ml-2">
      <Sparkles size={12} />
      auto
    </span>
  ) : null;

  const emptyHint = (
    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
      Proporciónalo para un mejor análisis
    </p>
  );

  const cardInitialStyle = hasExtractedData ? { opacity: 0 } : {};

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div ref={containerRef} className="max-w-3xl mx-auto" style={{ opacity: hasExtractedData ? 0 : 1 }}>

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 text-sm mb-4 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <div className="flex items-center space-x-3 mb-4">
            <Edit3 size={28} className="text-blue-500" />
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Revisar y editar datos
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Verifica la información extraída antes de ejecutar el análisis completo
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Los campos marcados con <span className="text-red-400">*</span> son obligatorios
          </p>
        </div>

        <div className="space-y-6">

          {/* Property Information */}
          <div ref={setCardRef(0)} style={cardInitialStyle} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center space-x-2 mb-4">
              <Home size={20} className="text-blue-500" />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Información del inmueble
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  URL del anuncio
                  {hasExtractedData && isFieldFilled(editableData.listing_url) && autoFilledBadge}
                </label>
                <input
                  type="url"
                  value={editableData.listing_url || ''}
                  onChange={(e) => handleInputChange('listing_url', e.target.value)}
                  placeholder="https://www.idealista.com/inmueble/..."
                  className={`w-full p-3 border rounded-lg ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
                {hasExtractedData && !isFieldFilled(editableData.listing_url) && emptyHint}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tipo de propiedad
                  {hasExtractedData && isFieldFilled(editableData.property_type) && autoFilledBadge}
                </label>
                <input
                  type="text"
                  value={editableData.property_type || ''}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                  placeholder="Ej: Piso completo"
                  className={`w-full p-3 border rounded-lg ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
                {hasExtractedData && !isFieldFilled(editableData.property_type) && emptyHint}
              </div>
            </div>

            {/* Address + Map */}
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Dirección{requiredBadge}
                {hasExtractedData && isFieldFilled(editableData.address) && autoFilledBadge}
              </label>
              <input
                type="text"
                value={addressInputValue}
                onChange={(e) => setAddressInputValue(e.target.value)}
                placeholder="Ej: Calle Gran Vía 1, Madrid"
                className={`w-full p-3 border rounded-lg ${missingClass(editableData.address)} ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
              />
              {showMissing && !isFieldFilled(editableData.address) && (
                <p className="text-xs mt-1 text-red-400">Este campo es obligatorio</p>
              )}
              {hasExtractedData && !showMissing && !isFieldFilled(editableData.address) && emptyHint}

              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-1.5 text-sm mt-2 transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
              >
                <MapPin size={14} />
                {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                {showMap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showMap && (
                <div className="mt-3">
                  <MapComponent
                    address={editableData.address}
                    theme={theme}
                    className="h-64 rounded-lg"
                    onLocationChange={handleMapUpdate}
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Descripción{requiredBadge}
                {hasExtractedData && isFieldFilled(editableData.description) && autoFilledBadge}
              </label>
              <textarea
                value={editableData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                placeholder="Una breve descripción de la propiedad..."
                className={`w-full p-3 border rounded-lg resize-y ${missingClass(editableData.description)} ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
              />
              {showMissing && !isFieldFilled(editableData.description) && (
                <p className="text-xs mt-1 text-red-400">Este campo es obligatorio</p>
              )}
              {hasExtractedData && !showMissing && !isFieldFilled(editableData.description) && emptyHint}
            </div>
          </div>

          {/* Host Information */}
          <div ref={setCardRef(1)} style={cardInitialStyle} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center space-x-2 mb-4">
              <User size={20} className="text-blue-500" />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Información del anfitrión
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email del anfitrión
                  {hasExtractedData && isFieldFilled(editableData.host_email) && autoFilledBadge}
                </label>
                <input
                  type="email"
                  value={editableData.host_email || ''}
                  onChange={(e) => handleInputChange('host_email', e.target.value)}
                  placeholder="Ej: anfitrion@ejemplo.com"
                  className={`w-full p-3 border rounded-lg ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
                {hasExtractedData && !isFieldFilled(editableData.host_email) && emptyHint}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Teléfono del anfitrión
                  {hasExtractedData && isFieldFilled(editableData.host_phone) && autoFilledBadge}
                </label>
                <input
                  type="tel"
                  value={editableData.host_phone || ''}
                  onChange={(e) => handleInputChange('host_phone', e.target.value)}
                  placeholder="Ej: +34 612 345 678"
                  className={`w-full p-3 border rounded-lg ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
                {hasExtractedData && !isFieldFilled(editableData.host_phone) && emptyHint}
              </div>
            </div>
          </div>

          {/* Communication */}
          <div ref={setCardRef(2)} style={cardInitialStyle} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare size={20} className="text-blue-500" />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Comunicaciones
              </h2>
            </div>
            <textarea
              value={editableData.communication_text || ''}
              onChange={(e) => handleInputChange('communication_text', e.target.value)}
              rows={4}
              placeholder="Pega aquí los mensajes o comunicaciones con el anfitrión..."
              className={`w-full p-3 border rounded-lg resize-y ${isDark
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
            />
            {hasExtractedData && !isFieldFilled(editableData.communication_text) && emptyHint}
          </div>

          {/* Image URLs */}
          <div ref={setCardRef(3)} style={cardInitialStyle} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center space-x-2 mb-4">
              <Image size={20} className="text-blue-500" />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                URLs de imágenes
                {hasExtractedData && isFieldFilled(editableData.image_urls) && autoFilledBadge}
              </h2>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                placeholder="https://ejemplo.com/imagen.jpg"
                className={`flex-grow p-3 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              />
              <button
                onClick={handleAddImageUrl}
                className="bg-yellow-400 text-gray-900 p-3 rounded-lg hover:bg-yellow-500 transition-colors flex-shrink-0"
                aria-label="Añadir URL de imagen"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(editableData.image_urls || []).map((imgUrl, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden">
                  {/* Thumbnail */}
                  <img
                    src={imgUrl}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-20 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden');
                    }}
                  />
                  {/* Fallback for broken images */}
                  <div hidden className={`w-full h-20 flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <Image size={20} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                  </div>
                  {/* Hover overlay: open + delete */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                      aria-label="Ver imagen"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleRemoveImageUrl(index)}
                      className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-full text-white transition-colors"
                      aria-label={`Eliminar imagen ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Details */}
          <div ref={setCardRef(4)} style={cardInitialStyle} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign size={20} className="text-blue-500" />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Detalles de precio{requiredBadge}
                {hasExtractedData && isFieldFilled(editableData.price_details) && autoFilledBadge}
              </h2>
            </div>
            <textarea
              value={editableData.price_details || ''}
              onChange={(e) => handleInputChange('price_details', e.target.value)}
              rows={4}
              placeholder="Ej: 850 EUR/mes, fianza 2 meses, gastos incluidos excepto luz"
              className={`w-full p-3 border rounded-lg ${missingClass(editableData.price_details)} ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
            {showMissing && !isFieldFilled(editableData.price_details) && (
              <p className="text-xs mt-1 text-red-400">Este campo es obligatorio</p>
            )}
            {hasExtractedData && !showMissing && !isFieldFilled(editableData.price_details) && emptyHint}
          </div>

          {/* Reviews Display */}
          {(editableData.reviews && editableData.reviews.length > 0) && (
            <div ref={setCardRef(5)} style={cardInitialStyle} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare size={20} className="text-blue-500" />
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reseñas extraídas</h2>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                Las reseñas se incluyen en el análisis pero no se pueden editar aquí.
              </p>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {editableData.reviews.map((review, index) => (
                  <div key={index} className={`p-3 rounded-md text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{review.reviewer_name} - {review.review_date}</p>
                    <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{review.review_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing fields warning */}
          {!isDataSufficient && (
            <div className={`${isDark ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-100/50 text-yellow-800'} text-center p-4 rounded-lg text-sm`}>
              Para mejores resultados, proporciona al menos una dirección, descripción y precio.
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isStartingAnalysis || isAutoFilling}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isStartingAnalysis ? (
              <>
                <LoadingSpinner size="sm" color="text-gray-900" />
                <span>Iniciando análisis...</span>
              </>
            ) : (
              <span>Iniciar análisis completo</span>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
