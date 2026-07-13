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
import BrandLogo from '../components/UI/BrandLogo';

const MAX_IMAGE_URLS = 8;

const card = {
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.03)',
  padding: '24px',
} as React.CSSProperties;

const inputStyle = {
  width: '100%',
  background: '#0A0E15',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#E7ECF3',
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  fontSize: 14,
  padding: '12px',
  outline: 'none',
  transition: 'border-color 0.15s',
} as React.CSSProperties;

const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isLoading: isGlobalLoading } = useAppSelector((state) => state.app);

  const initialData = location.state?.extractedData || {};
  const hasExtractedData = !!(location.state?.extractedData);

  const [editableData, setEditableData] = useState<ExtractedData>(initialData);
  const [isAutoFilling, setIsAutoFilling] = useState(hasExtractedData);

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

  useEffect(() => {
    if (addressInputValue === editableData.address) return;
    const debounceTimer = setTimeout(() => {
      setEditableData(prev => ({ ...prev, address: addressInputValue }));
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [addressInputValue, editableData.address]);

  useEffect(() => {
    dispatch(setCurrentAnalysisId(null));

    if (hasExtractedData && containerRef.current) {
      const tl = gsap.timeline({ onComplete: () => setIsAutoFilling(false) });
      tl.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      const cards = cardRefs.current.filter(Boolean);
      if (cards.length > 0) {
        tl.fromTo(cards, { opacity: 0, y: 25, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.12, ease: 'power2.out' }, '-=0.1');
        tl.fromTo(cards, { borderColor: 'rgba(53,212,138,0)' }, { borderColor: 'rgba(53,212,138,0.5)', duration: 0.3, stagger: 0.08 }, '-=0.3');
        tl.to(cards, { borderColor: '', duration: 0.4, stagger: 0.08 });
      }
    } else if (containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    }
  }, []);

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

  if (isGlobalLoading) return <LoadingScreen />;

  const isDataSufficient = editableData.address && editableData.description && editableData.price_details;

  const isFieldFilled = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const missingBorder = (field: unknown) =>
    showMissing && !isFieldFilled(field) ? '1px solid rgba(241,106,106,0.6)' : inputStyle.border as string;

  const requiredBadge = <span style={{ color: '#F16A6A', marginLeft: 2 }}>*</span>;

  const autoFilledBadge = hasExtractedData && !isAutoFilling ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#35D48A', fontWeight: 500, marginLeft: 8 }}>
      <Sparkles size={11} /> auto
    </span>
  ) : null;

  const emptyHint = (
    <p style={{ fontSize: 12, marginTop: 4, color: '#6B7385' }}>Proporciónalo para un mejor análisis</p>
  );

  const cardInitialStyle = hasExtractedData ? { opacity: 0 } : {};
  const theme = 'dark';

  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <div ref={containerRef} style={{ maxWidth: 768, margin: '0 auto', opacity: hasExtractedData ? 0 : 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 16, color: '#9AA3B2', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Edit3 size={28} style={{ color: '#35D48A' }} />
            <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 28, margin: 0 }}>
              Revisar y editar datos
            </h1>
          </div>
          <p style={{ fontSize: 16, color: '#9AA3B2', margin: 0 }}>
            Verifica la información extraída antes de ejecutar el análisis completo
          </p>
          <p style={{ fontSize: 12, marginTop: 8, color: '#6B7385' }}>
            Los campos marcados con <span style={{ color: '#F16A6A' }}>*</span> son obligatorios
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Property Information */}
          <div ref={setCardRef(0)} style={{ ...card, ...cardInitialStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Home size={20} style={{ color: '#35D48A' }} />
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: 0 }}>Información del inmueble</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#C6CDD9' }}>
                  URL del anuncio{hasExtractedData && isFieldFilled(editableData.listing_url) && autoFilledBadge}
                </label>
                <input type="url" value={editableData.listing_url || ''} onChange={(e) => handleInputChange('listing_url', e.target.value)}
                  placeholder="https://www.idealista.com/inmueble/..." style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                {hasExtractedData && !isFieldFilled(editableData.listing_url) && emptyHint}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#C6CDD9' }}>
                  Tipo de propiedad{hasExtractedData && isFieldFilled(editableData.property_type) && autoFilledBadge}
                </label>
                <input type="text" value={editableData.property_type || ''} onChange={(e) => handleInputChange('property_type', e.target.value)}
                  placeholder="Ej: Piso completo" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                {hasExtractedData && !isFieldFilled(editableData.property_type) && emptyHint}
              </div>
            </div>

            {/* Address */}
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#C6CDD9' }}>
                Dirección{requiredBadge}{hasExtractedData && isFieldFilled(editableData.address) && autoFilledBadge}
              </label>
              <input type="text" value={addressInputValue} onChange={(e) => setAddressInputValue(e.target.value)}
                placeholder="Ej: Calle Gran Vía 1, Madrid"
                style={{ ...inputStyle, border: missingBorder(editableData.address) }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = missingBorder(editableData.address); }}
              />
              {showMissing && !isFieldFilled(editableData.address) && (
                <p style={{ fontSize: 12, marginTop: 4, color: '#F16A6A' }}>Este campo es obligatorio</p>
              )}
              {hasExtractedData && !showMissing && !isFieldFilled(editableData.address) && emptyHint}
              <button type="button" onClick={() => setShowMap(!showMap)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8, color: '#35D48A', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MapPin size={14} />
                {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                {showMap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showMap && (
                <div style={{ marginTop: 12 }}>
                  <MapComponent address={editableData.address} theme={theme} className="h-64 rounded-lg" onLocationChange={handleMapUpdate} />
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#C6CDD9' }}>
                Descripción{requiredBadge}{hasExtractedData && isFieldFilled(editableData.description) && autoFilledBadge}
              </label>
              <textarea value={editableData.description || ''} onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4} placeholder="Una breve descripción de la propiedad..."
                style={{ ...inputStyle, resize: 'vertical', border: missingBorder(editableData.description) }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = missingBorder(editableData.description); }}
              />
              {showMissing && !isFieldFilled(editableData.description) && (
                <p style={{ fontSize: 12, marginTop: 4, color: '#F16A6A' }}>Este campo es obligatorio</p>
              )}
              {hasExtractedData && !showMissing && !isFieldFilled(editableData.description) && emptyHint}
            </div>
          </div>

          {/* Host Information */}
          <div ref={setCardRef(1)} style={{ ...card, ...cardInitialStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <User size={20} style={{ color: '#35D48A' }} />
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: 0 }}>Información del anfitrión</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#C6CDD9' }}>
                  Email{hasExtractedData && isFieldFilled(editableData.host_email) && autoFilledBadge}
                </label>
                <input type="email" value={editableData.host_email || ''} onChange={(e) => handleInputChange('host_email', e.target.value)}
                  placeholder="Ej: anfitrion@ejemplo.com" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                {hasExtractedData && !isFieldFilled(editableData.host_email) && emptyHint}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#C6CDD9' }}>
                  Teléfono{hasExtractedData && isFieldFilled(editableData.host_phone) && autoFilledBadge}
                </label>
                <input type="tel" value={editableData.host_phone || ''} onChange={(e) => handleInputChange('host_phone', e.target.value)}
                  placeholder="Ej: +34 612 345 678" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                {hasExtractedData && !isFieldFilled(editableData.host_phone) && emptyHint}
              </div>
            </div>
          </div>

          {/* Communication */}
          <div ref={setCardRef(2)} style={{ ...card, ...cardInitialStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MessageSquare size={20} style={{ color: '#35D48A' }} />
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: 0 }}>Comunicaciones</h2>
            </div>
            <textarea value={editableData.communication_text || ''} onChange={(e) => handleInputChange('communication_text', e.target.value)}
              rows={4} placeholder="Pega aquí los mensajes o comunicaciones con el anfitrión..."
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            {hasExtractedData && !isFieldFilled(editableData.communication_text) && emptyHint}
          </div>

          {/* Image URLs */}
          <div ref={setCardRef(3)} style={{ ...card, ...cardInitialStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Image size={20} style={{ color: '#35D48A' }} />
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: 0 }}>
                URLs de imágenes{hasExtractedData && isFieldFilled(editableData.image_urls) && autoFilledBadge}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                placeholder="https://ejemplo.com/imagen.jpg"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              <button onClick={handleAddImageUrl} aria-label="Añadir URL de imagen"
                style={{ background: '#35D48A', color: '#08130D', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                <Plus size={24} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {(editableData.image_urls || []).map((imgUrl, index) => (
                <div key={index} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}
                  onMouseEnter={e => { const ov = e.currentTarget.querySelector('.img-overlay') as HTMLElement; if (ov) ov.style.opacity = '1'; }}
                  onMouseLeave={e => { const ov = e.currentTarget.querySelector('.img-overlay') as HTMLElement; if (ov) ov.style.opacity = '0'; }}
                >
                  <img src={imgUrl} alt={`Foto ${index + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden');
                    }}
                  />
                  <div hidden style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <Image size={20} style={{ color: '#6B7385' }} />
                  </div>
                  <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <a href={imgUrl} target="_blank" rel="noopener noreferrer"
                      style={{ padding: 6, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', display: 'flex' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => handleRemoveImageUrl(index)} aria-label={`Eliminar imagen ${index + 1}`}
                      style={{ padding: 6, background: 'rgba(241,106,106,0.8)', borderRadius: '50%', color: 'white', border: 'none', cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Details */}
          <div ref={setCardRef(4)} style={{ ...card, ...cardInitialStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <DollarSign size={20} style={{ color: '#35D48A' }} />
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: 0 }}>
                Detalles de precio{requiredBadge}{hasExtractedData && isFieldFilled(editableData.price_details) && autoFilledBadge}
              </h2>
            </div>
            <textarea value={editableData.price_details || ''} onChange={(e) => handleInputChange('price_details', e.target.value)}
              rows={4} placeholder="Ej: 850 EUR/mes, fianza 2 meses, gastos incluidos excepto luz"
              style={{ ...inputStyle, resize: 'vertical', border: missingBorder(editableData.price_details) }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = missingBorder(editableData.price_details); }}
            />
            {showMissing && !isFieldFilled(editableData.price_details) && (
              <p style={{ fontSize: 12, marginTop: 4, color: '#F16A6A' }}>Este campo es obligatorio</p>
            )}
            {hasExtractedData && !showMissing && !isFieldFilled(editableData.price_details) && emptyHint}
          </div>

          {/* Reviews */}
          {(editableData.reviews && editableData.reviews.length > 0) && (
            <div ref={setCardRef(5)} style={{ ...card, ...cardInitialStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <MessageSquare size={20} style={{ color: '#35D48A' }} />
                <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: 0 }}>Reseñas extraídas</h2>
              </div>
              <p style={{ fontSize: 13, color: '#9AA3B2', marginBottom: 16 }}>
                Las reseñas se incluyen en el análisis pero no se pueden editar aquí.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 192, overflowY: 'auto' }}>
                {editableData.reviews.map((review, index) => (
                  <div key={index} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                    <p style={{ fontWeight: 600, color: '#C6CDD9', margin: '0 0 4px' }}>{review.reviewer_name} — {review.review_date}</p>
                    <p style={{ color: '#9AA3B2', margin: 0 }}>{review.review_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {!isDataSufficient && (
            <div style={{ background: 'rgba(242,184,75,0.08)', border: '1px solid rgba(242,184,75,0.25)', borderRadius: 10, padding: 16, textAlign: 'center', fontSize: 14, color: '#F2B84B' }}>
              Para mejores resultados, proporciona al menos una dirección, descripción y precio.
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={isStartingAnalysis || isAutoFilling}
            style={{
              width: '100%', background: '#35D48A', color: '#08130D',
              fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 16,
              padding: '16px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 12px 30px rgba(53,212,138,0.3)',
              opacity: isStartingAnalysis || isAutoFilling ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {isStartingAnalysis ? (
              <>
                <LoadingSpinner size="sm" color="text-ink" />
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
