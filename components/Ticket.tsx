import React, { forwardRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TicketData } from '../types';

interface TicketProps {
  data: TicketData;
  onQrRefresh: (ticketId: string) => void;
}

const QR_LIFESPAN_SECONDS = 600; // 10 minutes

const Ticket = forwardRef<HTMLDivElement, TicketProps>(({ data, onQrRefresh }, ref) => {
  const { eventName, attendeeName, ticketType, eventDate, ticketId, qrValue, qrGenerationTimestamp, price } = data;

  const [timeLeft, setTimeLeft] = useState(QR_LIFESPAN_SECONDS);

  useEffect(() => {
    const calculateRemaining = () => {
        const elapsedSeconds = (Date.now() - qrGenerationTimestamp) / 1000;
        return Math.max(0, QR_LIFESPAN_SECONDS - elapsedSeconds);
    };
    
    const remainingOnMount = calculateRemaining();
    setTimeLeft(remainingOnMount);
    
    // Timer to trigger the central refresh logic
    const refreshTimeoutId = setTimeout(() => {
        onQrRefresh(ticketId);
    }, remainingOnMount * 1000);

    // Timer to update the UI countdown every second
    const countdownTimerId = setInterval(() => {
        setTimeLeft(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(refreshTimeoutId);
      clearInterval(countdownTimerId);
    };
  }, [qrGenerationTimestamp, ticketId, onQrRefresh]);

  const progressPercentage = (timeLeft / QR_LIFESPAN_SECONDS) * 100;

  return (
    <div
      ref={ref}
      className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm text-white overflow-hidden"
    >
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
        <h2 className="font-orbitron text-2xl uppercase tracking-widest">{eventName}</h2>
        <p className="text-purple-200 text-sm">ENTRADA DE EVENTO</p>
      </div>

      <div className="p-6 flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <QRCodeSVG
            value={qrValue}
            size={180}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="w-full text-center mt-4">
            <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000 linear" 
                    style={{ width: `${progressPercentage}%` }}>
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
                Este código se renueva automáticamente. Expira en {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
        </div>

        <div className="w-full text-center mt-4 border-t border-dashed border-gray-600 pt-6">
          <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                  <p className="text-xs text-gray-400 uppercase">ASISTENTE</p>
                  <p className="font-semibold text-lg">{attendeeName}</p>
              </div>
              <div>
                  <p className="text-xs text-gray-400 uppercase">TIPO / PRECIO</p>
                  <p className="font-semibold text-lg">{ticketType} - ${price.toFixed(2)}</p>
              </div>
              <div>
                  <p className="text-xs text-gray-400 uppercase">FECHA</p>
                  <p className="font-semibold text-lg">{eventDate}</p>
              </div>
              <div>
                  <p className="text-xs text-gray-400 uppercase">ID ENTRADA</p>
                  <p className="font-mono text-sm">{ticketId}</p>
              </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-900 px-6 py-2 text-center text-xs text-gray-500">
        Presente este QR en la entrada del evento.
      </div>
    </div>
  );
});

Ticket.displayName = 'Ticket';
export default Ticket;