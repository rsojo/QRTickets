import React, { useState } from 'react';
import { CreditCardIcon } from './IconComponents';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
    details: {
        eventName: string;
        ticketTypeName: string;
        price: number;
    };
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess, details }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: ''});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setCardDetails(prev => ({...prev, [name]: value}));
    }

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            onPaymentSuccess();
        }, 2000);
    };

    if (!isOpen) return null;

    const isFormValid = cardDetails.number.length > 15 && cardDetails.expiry.length > 4 && cardDetails.cvv.length > 2;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md text-white overflow-hidden transform transition-all animate-fade-in-up">
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-indigo-300">Proceso de Pago</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Cerrar modal">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 border-y border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-300">Resumen del Pedido</h3>
                    <div className="mt-4 space-y-2 text-gray-400">
                        <div className="flex justify-between">
                            <span>Evento:</span>
                            <span className="font-medium text-white">{details.eventName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tipo de Entrada:</span>
                            <span className="font-medium text-white">{details.ticketTypeName}</span>
                        </div>
                        <div className="flex justify-between text-xl border-t border-dashed border-gray-600 pt-3 mt-3">
                            <span className="font-bold text-white">Total:</span>
                            <span className="font-bold text-indigo-400">${details.price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handlePayment} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Detalles de la Tarjeta</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-300 mb-1">Número de Tarjeta</label>
                            <input type="text" id="cardNumber" name="number" value={cardDetails.number} onChange={handleInputChange} className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500" placeholder="0000 0000 0000 0000" required />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-300 mb-1">Vencimiento (MM/AA)</label>
                                <input type="text" id="cardExpiry" name="expiry" value={cardDetails.expiry} onChange={handleInputChange} className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500" placeholder="MM/AA" required />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="cardCvv" className="block text-sm font-medium text-gray-300 mb-1">CVV</label>
                                <input type="text" id="cardCvv" name="cvv" value={cardDetails.cvv} onChange={handleInputChange} className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500" placeholder="123" required />
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isProcessing || !isFormValid}
                        className="w-full mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        <CreditCardIcon className="w-5 h-5"/>
                        {isProcessing ? 'Procesando Pago...' : `Pagar $${details.price.toFixed(2)}`}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;