import React from 'react';
import type { Event } from '../types';
import { TicketIcon } from './IconComponents';

interface EventCardProps {
  event: Event;
  onSelect: (event: Event) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out">
      <img src={event.image} alt={event.name} className="w-full h-48 object-cover" />
      <div className="p-6">
        <p className="text-sm text-indigo-400 font-semibold">{new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <h3 className="font-orbitron text-2xl font-bold text-white mt-2 truncate">{event.name}</h3>
        <p className="text-gray-400 mt-2 h-12">{event.description}</p>
        <button
          onClick={() => onSelect(event)}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
        >
          <TicketIcon className="w-5 h-5" />
          Obtener Entrada
        </button>
      </div>
    </div>
  );
};

export default EventCard;
