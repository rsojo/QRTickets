import React, { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Ticket from './components/Ticket';
import PaymentModal from './components/PaymentModal';
import { DownloadIcon, QrCodeIcon, TicketIcon, ChevronLeftIcon, HistoryIcon, ChevronRightIcon, CreditCardIcon, CheckCircleIcon, ShareIcon, SpinnerIcon, CancelIcon } from './components/IconComponents';
import EventCard from './components/EventCard';
import { TICKET_TYPES } from './constants';
import type { TicketData, Event, TicketType, User } from './types';
import type { FakeApi } from './api';

interface AppProps {
    api: FakeApi;
    user: User;
}

const App: React.FC<AppProps> = ({ api, user }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    attendeeName: user.name,
    ticketType: TICKET_TYPES[0].name,
  });
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'events' | 'history' | 'redeem'>('events');
  const [ticketHistory, setTicketHistory] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalTicketId, setModalTicketId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [ticketToTransfer, setTicketToTransfer] = useState<TicketData | null>(null);
  const [generatedTransferCode, setGeneratedTransferCode] = useState<string | null>(null);
  
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemMessage, setRedeemMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);
  const modalTicketRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [eventsData, historyData] = await Promise.all([
            api.getEvents(),
            api.getTicketHistory(user.id)
        ]);
        setEvents(eventsData);
        setTicketHistory(historyData);
    } catch (error) {
        console.error("Failed to load data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [api, user.id]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (showPaymentSuccess) {
      const timer = setTimeout(() => setShowPaymentSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentSuccess]);

  useEffect(() => {
    if (redeemMessage) {
        const timer = setTimeout(() => setRedeemMessage(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [redeemMessage]);
  
  const handleQrRefresh = useCallback(async (ticketId: string) => {
    try {
        const refreshedTicket = await api.refreshQrCode(ticketId, user.id);
        if (refreshedTicket) {
            setTicketHistory(prev => prev.map(t => t.ticketId === ticketId ? refreshedTicket : t));
            setTicketData(prev => prev && prev.ticketId === ticketId ? refreshedTicket : prev);
        }
    } catch (error) {
        console.error("Failed to refresh QR code:", error);
    }
  }, [api, user.id]);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setTicketData(null); 
    setFormData({ attendeeName: user.name, ticketType: TICKET_TYPES[0].name });
  };

  const handleBackToList = () => {
    setSelectedEvent(null);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProceedToPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setIsPaymentModalOpen(true);
  };

  const handleFinalizeTicketGeneration = async () => {
    if (!selectedEvent) return;
    setIsPaymentModalOpen(false);
    setIsGenerating(true);
    try {
        const newTicketData = await api.generateTicket(user.id, selectedEvent.id, formData.attendeeName, formData.ticketType);
        setTicketData(newTicketData);
        setTicketHistory(prev => [newTicketData, ...prev]);
        setShowPaymentSuccess(true);
    } catch (error) {
        console.error("Failed to generate ticket:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDownload = useCallback(async (ticketToDownload: TicketData, refToCapture: React.RefObject<HTMLDivElement>) => {
    if (!refToCapture.current) return;
    try {
      const canvas = await html2canvas(refToCapture.current, { backgroundColor: null, scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `entrada_${ticketToDownload.eventName.replace(/\s/g, '_')}_${ticketToDownload.attendeeName.replace(/\s/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al descargar la entrada:', error);
    }
  }, []);
  
  const createAnotherTicket = () => {
    setTicketData(null);
    setFormData({ attendeeName: user.name, ticketType: TICKET_TYPES[0].name });
  }
  
  const handleViewTicket = (ticket: TicketData) => {
    setModalTicketId(ticket.ticketId);
  };
  
  const handleOpenTransferModal = (ticket: TicketData) => {
    setTicketToTransfer(ticket);
    setGeneratedTransferCode(ticket.transferCode || null);
    setIsTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
      setIsTransferModalOpen(false);
      setGeneratedTransferCode(null);
      setTimeout(() => setTicketToTransfer(null), 300);
  };
  
  const handleConfirmTransfer = async () => {
    if (!ticketToTransfer) return;
    try {
        const code = await api.generateTransferCode(ticketToTransfer.ticketId, user.id);
        setGeneratedTransferCode(code);
        const updatedTicket = { ...ticketToTransfer, transferCode: code };
        setTicketToTransfer(updatedTicket);
        setTicketHistory(prev => prev.map(t => t.ticketId === updatedTicket.ticketId ? updatedTicket : t));
    } catch (error) {
        console.error("Failed to generate transfer code:", error);
    }
  };

  const handleCancelTransfer = async (ticketId: string) => {
    setCancellingTicketId(ticketId);
    try {
        const updatedTicket = await api.cancelTransfer(ticketId, user.id);
        setTicketHistory(prev => prev.map(t => t.ticketId === ticketId ? updatedTicket : t));
        
        if (isTransferModalOpen && ticketToTransfer?.ticketId === ticketId) {
            handleCloseTransferModal();
        }
    } catch (error) {
        console.error("Failed to cancel transfer:", error);
    } finally {
        setCancellingTicketId(null);
    }
  };

  const handleRedeemTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemInput.trim()) return;
    const code = redeemInput.trim().toUpperCase();
    try {
        const redeemedTicket = await api.redeemTransferCode(code, user.id);
        setTicketHistory(prev => [redeemedTicket, ...prev.filter(t => t.ticketId !== redeemedTicket.ticketId)]);
        setRedeemInput('');
        setRedeemMessage({ type: 'success', text: `¡Éxito! La entrada para "${redeemedTicket.eventName}" ha sido añadida a tu historial.` });
        setTimeout(() => setActiveTab('history'), 500);
    } catch (error: any) {
        setRedeemMessage({ type: 'error', text: error.message || 'El código de transferencia no es válido o ya ha sido utilizado.' });
    }
  };

  const renderEventList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {events.map(event => (
          <EventCard key={event.id} event={event} onSelect={handleSelectEvent} />
      ))}
    </div>
  );
  
  const renderHistoryList = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-20">
                <SpinnerIcon className="w-16 h-16 text-indigo-400" />
            </div>
        );
    }
    return (
    <div className="space-y-4">
        {ticketHistory.length > 0 ? (
            ticketHistory.map((ticket) => {
                const isPendingTransfer = !!ticket.transferCode;
                return (
                    <div key={ticket.ticketId} 
                         className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                        <div className="flex justify-between items-center">
                            <div onClick={() => handleViewTicket(ticket)} className="flex-grow cursor-pointer pr-4">
                                <h3 className="text-xl font-bold text-white">{ticket.eventName}</h3>
                                <p className="text-gray-400">Asistente: {ticket.attendeeName}</p>
                                <p className="text-gray-400 text-sm">ID: {ticket.ticketId}</p>
                            </div>
                            <div className="flex items-center gap-2 pl-4 flex-shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenTransferModal(ticket); }}
                                    className="p-2 rounded-full hover:bg-gray-600 transition-colors"
                                    title={isPendingTransfer ? "Transferencia en proceso" : "Transferir Entrada"}
                                >
                                    <ShareIcon className="w-5 h-5 text-indigo-400" />
                                </button>
                                <ChevronRightIcon className="w-6 h-6 text-gray-500 cursor-pointer" onClick={() => handleViewTicket(ticket)} />
                            </div>
                        </div>
                        {isPendingTransfer && (
                            <div className="mt-3 pt-3 border-t border-dashed border-gray-700">
                                <p className="text-sm text-yellow-400 font-semibold">Transferencia pendiente</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Comparte este código para completar la transferencia: <strong className="font-mono text-yellow-300 select-all">{ticket.transferCode}</strong>
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCancelTransfer(ticket.ticketId); }}
                                    disabled={cancellingTicketId === ticket.ticketId}
                                    className="mt-3 w-full text-center bg-red-900/70 hover:bg-red-800/90 text-red-200 font-semibold py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {cancellingTicketId === ticket.ticketId ? (
                                        <>
                                            <SpinnerIcon className="w-4 h-4" />
                                            <span>Cancelando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CancelIcon className="w-4 h-4" />
                                            <span>Cancelar Transferencia</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })
        ) : (
            <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-700 rounded-2xl">
                <HistoryIcon className="w-16 h-16 mx-auto text-gray-600"/>
                <h3 className="mt-4 text-xl font-semibold">No tienes entradas en tu historial</h3>
                <p className="mt-2 text-gray-400">Cuando generes o canjees una entrada, aparecerá aquí.</p>
            </div>
        )}
    </div>
)};

const renderRedeemView = () => (
    <div className="max-w-md mx-auto text-center animate-fade-in-up">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-lg">
            <QrCodeIcon className="w-16 h-16 mx-auto text-gray-600"/>
            <h3 className="mt-4 text-2xl font-bold text-indigo-300">Canjear una Entrada</h3>
            <p className="mt-2 text-gray-400">Introduce el código de transferencia que te ha enviado tu amigo para añadir la entrada a tu historial.</p>
            <form onSubmit={handleRedeemTicket} className="mt-6 space-y-4">
                <input
                    type="text"
                    value={redeemInput}
                    onChange={(e) => setRedeemInput(e.target.value)}
                    placeholder="TFR-XXXXXXXX"
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-3 text-center tracking-widest font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    required
                />
                <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                    Canjear Entrada
                </button>
            </form>
            {redeemMessage && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${redeemMessage.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {redeemMessage.text}
                </div>
            )}
        </div>
    </div>
);


  const renderTicketGenerator = () => (
    <>
     <header className="w-full max-w-4xl mb-8">
        <button onClick={handleBackToList} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mb-4">
            <ChevronLeftIcon className="w-5 h-5" />
            Volver a Eventos
        </button>
        <div className="text-center">
            <h1 className="font-orbitron text-4xl sm:text-5xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                {selectedEvent?.name}
            </h1>
            <p className="mt-2 text-lg text-gray-300">
                Estás a punto de generar tu entrada. ¡Qué emoción!
            </p>
        </div>
      </header>
      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-indigo-300">Completa tus Datos</h2>
          <form onSubmit={handleProceedToPayment} className="space-y-6">
             <div>
              <label htmlFor="attendeeName" className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Asistente
              </label>
              <input
                type="text"
                id="attendeeName"
                name="attendeeName"
                value={formData.attendeeName}
                onChange={handleChange}
                placeholder="Ej: Alex Doe"
                className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
              />
            </div>
             <div>
              <label htmlFor="ticketType" className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Entrada
              </label>
              <select
                id="ticketType"
                name="ticketType"
                value={formData.ticketType}
                onChange={handleChange}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
              >
                {TICKET_TYPES.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.name} - ${type.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isGenerating || !formData.attendeeName}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              <CreditCardIcon className="w-5 h-5" />
              {isGenerating ? 'Generando...' : 'Proceder al Pago'}
            </button>
          </form>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[450px]">
          {ticketData ? (
            <div className="w-full flex flex-col items-center gap-6">
                <Ticket ref={ticketRef} data={ticketData} onQrRefresh={handleQrRefresh} />
                <div className="flex flex-col gap-4 w-full max-w-sm">
                    <button
                        onClick={() => handleDownload(ticketData, ticketRef)}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        <DownloadIcon className="w-5 h-5"/>
                        Descargar
                    </button>
                    <button
                        onClick={createAnotherTicket}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        Crear Otra
                    </button>
                     <p className="text-xs text-gray-500 text-center">
                        Nota: La entrada descargada es una copia estática. Para la validación, utiliza el QR dinámico desde esta pantalla.
                    </p>
                </div>
            </div>
          ) : (
             <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-700 rounded-2xl">
                <QrCodeIcon className="w-16 h-16 mx-auto text-gray-600"/>
                <h3 className="mt-4 text-xl font-semibold">Tu entrada aparecerá aquí</h3>
                <p className="mt-2 text-gray-400">Completa el formulario y procede al pago para generar tu entrada.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
  
  const renderTicketModal = () => {
    const modalTicket = ticketHistory.find(t => t.ticketId === modalTicketId);
    if (!modalTicket) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
        <div className="relative bg-gray-900 p-4 sm:p-6 rounded-2xl max-w-md w-full">
            <button onClick={() => setModalTicketId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10" aria-label="Cerrar modal">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-full flex flex-col items-center gap-6 pt-8">
                <Ticket ref={modalTicketRef} data={modalTicket} onQrRefresh={handleQrRefresh} />
                <div className="flex flex-col gap-4 w-full max-w-sm">
                  <button
                      onClick={() => handleDownload(modalTicket, modalTicketRef)}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                      <DownloadIcon className="w-5 h-5"/>
                      Descargar Copia
                  </button>
                  <button
                      onClick={() => handleOpenTransferModal(modalTicket)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                      <ShareIcon className="w-5 h-5"/>
                      {modalTicket.transferCode ? 'Transferencia en Proceso' : 'Transferir a un Amigo'}
                  </button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderTransferModal = () => {
    if (!isTransferModalOpen || !ticketToTransfer) return null;

    const handleCopyCode = () => {
        if (generatedTransferCode) {
            navigator.clipboard.writeText(generatedTransferCode);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md text-white overflow-hidden transform transition-all animate-fade-in-up">
                <div className="p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-indigo-300">Transferir Entrada</h2>
                    <button onClick={handleCloseTransferModal} className="text-gray-400 hover:text-white" aria-label="Cerrar modal">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 border-y border-gray-700">
                    {!generatedTransferCode ? (
                        <>
                            <h3 className="text-lg font-semibold text-center">Confirmar Transferencia</h3>
                            <p className="text-center mt-2 text-gray-400">
                                Estás a punto de transferir tu entrada para <strong className="text-white">{ticketToTransfer.eventName}</strong>. Se generará un código único. La entrada permanecerá en tu historial como "pendiente" hasta que tu amigo la canjee.
                            </p>
                            <div className="mt-6 flex gap-4">
                                <button onClick={handleCloseTransferModal} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 px-4 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={handleConfirmTransfer} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-3 px-4 rounded-lg transition-colors">Generar Código</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold text-center">Código de Transferencia Generado</h3>
                            <p className="text-center mt-2 text-gray-400">
                                Comparte este código con tu amigo. Es de un solo uso.
                            </p>
                            <div className="mt-4 bg-gray-900 p-4 rounded-lg text-center">
                                <p className="font-mono text-2xl tracking-widest text-indigo-400 select-all">{generatedTransferCode}</p>
                            </div>
                            <div className="mt-6 flex gap-4">
                                <button onClick={handleCloseTransferModal} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 px-4 rounded-lg transition-colors">Hecho</button>
                                <button onClick={handleCopyCode} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 font-bold py-3 px-4 rounded-lg transition-colors">Copiar Código</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center w-full">
        {showPaymentSuccess && (
            <div className="fixed top-5 right-5 bg-green-600 text-white py-3 px-5 rounded-lg shadow-lg z-[100] flex items-center gap-3 animate-fade-in-down">
                <CheckCircleIcon className="w-6 h-6" />
                <span className="font-semibold">¡Pago exitoso! Tu entrada ha sido generada.</span>
            </div>
        )}
       {selectedEvent ? (
            renderTicketGenerator()
        ) : (
            <>
                <header className="w-full max-w-5xl text-center mb-10">
                    <div className="flex items-center justify-center gap-4">
                        <TicketIcon className="w-12 h-12 text-indigo-400"/>
                        <h1 className="font-orbitron text-4xl sm:text-5xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                            Plataforma de Eventos
                        </h1>
                    </div>
                    <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
                        {activeTab === 'events' && 'Explora los próximos eventos y consigue tu entrada digital al instante.'}
                        {activeTab === 'history' && 'Consulta todas las entradas que has generado.'}
                        {activeTab === 'redeem' && 'Canjea una entrada que te ha enviado un amigo.'}
                    </p>
                    
                    <nav className="mt-8 flex justify-center border-b border-gray-700">
                        <button 
                            onClick={() => setActiveTab('events')} 
                            className={`px-6 py-3 font-medium text-lg transition-colors ${activeTab === 'events' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            Explorar Eventos
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')} 
                            className={`flex items-center gap-2 px-6 py-3 font-medium text-lg transition-colors ${activeTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <HistoryIcon className="w-5 h-5"/>
                            Mis Entradas
                        </button>
                         <button 
                            onClick={() => setActiveTab('redeem')} 
                            className={`flex items-center gap-2 px-6 py-3 font-medium text-lg transition-colors ${activeTab === 'redeem' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <QrCodeIcon className="w-5 h-5"/>
                            Canjear Entrada
                        </button>
                    </nav>
                </header>

                <main className="w-full max-w-5xl">
                    {isLoading && activeTab === 'events' ? (
                         <div className="flex justify-center items-center p-20">
                            <SpinnerIcon className="w-16 h-16 text-indigo-400" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'events' && renderEventList()}
                            {activeTab === 'history' && renderHistoryList()}
                            {activeTab === 'redeem' && renderRedeemView()}
                        </>
                    )}
                </main>
            </>
        )}
        {renderTicketModal()}
        {renderTransferModal()}
        <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onPaymentSuccess={handleFinalizeTicketGeneration}
            details={{
                eventName: selectedEvent?.name || '',
                ticketTypeName: formData.ticketType,
                price: TICKET_TYPES.find(t => t.name === formData.ticketType)?.price ?? 0,
            }}
        />
    </div>
  );
};

export default App;