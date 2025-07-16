import { EVENTS } from './events';
import type { Event, TicketData, User } from './types';
import { TICKET_TYPES } from './constants';

const FAKE_LATENCY = 300; // ms

const fakeAsync = <T>(data: T, latency: number = FAKE_LATENCY): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), latency));

const generateTicketId = () => `T${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const generateQrValue = (ticketId: string, attendeeName: string, timestamp: number) => {
    const payload = { ticketId, attendeeName, timestamp };
    return JSON.stringify(payload);
};

interface DbUser extends User {
    password?: string;
}

class FakeDatabase {
    private users: Record<string, DbUser> = {};
    private tickets: Record<string, TicketData> = {};
    private pendingTransfers: Record<string, string> = {}; // { transferCode: ticketId }

    constructor() {
        this.load();
    }

    private load() {
        const defaultUsers: Record<string, DbUser> = {
            'user-1': { id: 'user-1', name: 'Alex Doe', password: 'password' },
            'user-2': { id: 'user-2', name: 'Jane Smith', password: 'password' }
        };

        try {
            const storedUsersData = localStorage.getItem('db_users');
            let loadedUsers = storedUsersData ? JSON.parse(storedUsersData) : {};
            
            let needsSave = !storedUsersData;
            for (const key in defaultUsers) {
                if (!loadedUsers[key]) {
                    // If default user doesn't exist, add it
                    loadedUsers[key] = defaultUsers[key];
                    needsSave = true;
                } else if (!loadedUsers[key].password) {
                    // If default user exists but without a password, add it
                    loadedUsers[key].password = defaultUsers[key].password;
                    needsSave = true;
                }
            }

            this.users = loadedUsers;
            this.tickets = JSON.parse(localStorage.getItem('db_tickets') || '{}');
            this.pendingTransfers = JSON.parse(localStorage.getItem('db_pendingTransfers') || '{}');
            
            if (needsSave) {
                this.save();
            }
        } catch (e) {
            console.error("Failed to load fake DB from localStorage, resetting to defaults", e);
            this.users = defaultUsers;
            this.tickets = {};
            this.pendingTransfers = {};
            this.save();
        }
    }

    private save() {
        localStorage.setItem('db_users', JSON.stringify(this.users));
        localStorage.setItem('db_tickets', JSON.stringify(this.tickets));
        localStorage.setItem('db_pendingTransfers', JSON.stringify(this.pendingTransfers));
    }
    
    findUserByCredentials(name: string, pass: string): User | undefined {
        const userRecord = Object.values(this.users).find(u => u.name.toLowerCase() === name.toLowerCase());

        if (userRecord && userRecord.password === pass) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...userToReturn } = userRecord;
            return userToReturn;
        }
        return undefined;
    }
    
    getUserById(id: string): DbUser | undefined {
        return this.users[id];
    }

    getTicket(id: string): TicketData | undefined { return this.tickets[id]; }
    
    getUserTickets(userId: string): TicketData[] {
        return Object.values(this.tickets)
            .filter(t => t.userId === userId)
            .sort((a, b) => b.qrGenerationTimestamp - a.qrGenerationTimestamp);
    }
    
    saveTicket(ticket: TicketData): TicketData {
        this.tickets[ticket.ticketId] = ticket;
        this.save();
        return ticket;
    }
    
    createTransfer(ticketId: string): string {
        const existingTransfer = Object.entries(this.pendingTransfers).find(([, tId]) => tId === ticketId);
        if (existingTransfer) {
            return existingTransfer[0];
        }
        
        const code = `TFR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        this.pendingTransfers[code] = ticketId;
        
        const ticket = this.getTicket(ticketId);
        if(ticket) {
            ticket.transferCode = code;
            this.saveTicket(ticket);
        }
        
        this.save();
        return code;
    }
    
    findTicketByTransferCode(code: string): TicketData | undefined {
        const ticketId = this.pendingTransfers[code];
        return ticketId ? this.getTicket(ticketId) : undefined;
    }
    
    completeTransfer(code: string, newUserId: string, newUserName: string): TicketData | null {
        const ticketId = this.pendingTransfers[code];
        if (!ticketId) return null;
        
        const ticket = this.getTicket(ticketId);
        if (!ticket) return null;

        delete this.pendingTransfers[code];
        delete ticket.transferCode;
        
        ticket.userId = newUserId;
        ticket.attendeeName = newUserName;
        this.saveTicket(ticket);
        this.save();

        return ticket;
    }

    cancelTransfer(ticketId: string): TicketData | null {
        const ticket = this.getTicket(ticketId);
        if (!ticket || !ticket.transferCode) {
            return null; // Nothing to cancel
        }

        const code = ticket.transferCode;
        if (this.pendingTransfers[code] === ticketId) {
            delete this.pendingTransfers[code];
        }
        
        delete ticket.transferCode;
        
        this.saveTicket(ticket);
        this.save();
        return ticket;
    }
}

export class FakeApi {
    private db = new FakeDatabase();

    async login(username: string, password: string): Promise<User> {
        const user = this.db.findUserByCredentials(username, password);
        if (!user) {
            // Simulate check latency on failure
            await new Promise(resolve => setTimeout(resolve, 1000));
            throw new Error("Usuario o contraseña no válidos.");
        }
        return fakeAsync(user);
    }

    async getEvents(): Promise<Event[]> {
        return fakeAsync(EVENTS);
    }

    async getTicketHistory(userId: string): Promise<TicketData[]> {
        const tickets = this.db.getUserTickets(userId);
        return fakeAsync(tickets);
    }
    
    async refreshQrCode(ticketId: string, userId: string): Promise<TicketData | null> {
        const ticket = this.db.getTicket(ticketId);
        if (!ticket || ticket.userId !== userId) {
            throw new Error("Ticket not found or access denied.");
        }
        
        const newTimestamp = Date.now();
        ticket.qrGenerationTimestamp = newTimestamp;
        ticket.qrValue = generateQrValue(ticket.ticketId, ticket.attendeeName, newTimestamp);
        
        this.db.saveTicket(ticket);
        return fakeAsync(ticket, 50);
    }

    async generateTicket(userId: string, eventId: string, attendeeName: string, ticketTypeName: string): Promise<TicketData> {
        const event = EVENTS.find(e => e.id === eventId);
        if (!event) throw new Error("Event not found");

        const ticketType = TICKET_TYPES.find(t => t.name === ticketTypeName);
        if (!ticketType) throw new Error("Ticket type not found");

        const ticketId = generateTicketId();
        const timestamp = Date.now();
        const qrValue = generateQrValue(ticketId, attendeeName, timestamp);

        const newTicket: TicketData = {
            userId,
            ticketId,
            eventName: event.name,
            eventDate: event.date,
            attendeeName,
            ticketType: ticketTypeName,
            price: ticketType.price,
            qrGenerationTimestamp: timestamp,
            qrValue,
        };

        this.db.saveTicket(newTicket);
        return fakeAsync(newTicket);
    }

    async generateTransferCode(ticketId: string, userId: string): Promise<string> {
        const ticket = this.db.getTicket(ticketId);
        if (!ticket || ticket.userId !== userId) {
            throw new Error("Ticket not found or you do not own this ticket.");
        }
        const code = this.db.createTransfer(ticketId);
        return fakeAsync(code);
    }
    
    async redeemTransferCode(code: string, newUserId: string): Promise<TicketData> {
        const ticketToRedeem = this.db.findTicketByTransferCode(code);
        
        if (!ticketToRedeem) {
            throw new Error("Código de transferencia no válido o ya utilizado.");
        }
        
        if (ticketToRedeem.userId === newUserId) {
            throw new Error("No puedes canjear tu propia entrada.");
        }
        
        const newUser = this.db.getUserById(newUserId);
        if (!newUser) {
            throw new Error("No se pudo encontrar al usuario que canjea la entrada.");
        }

        const redeemedTicket = this.db.completeTransfer(code, newUserId, newUser.name);
        if (!redeemedTicket) throw new Error("No se pudo completar la transferencia.");

        return fakeAsync(redeemedTicket);
    }

    async cancelTransfer(ticketId: string, userId: string): Promise<TicketData> {
        const ticket = this.db.getTicket(ticketId);
        if (!ticket || ticket.userId !== userId) {
            throw new Error("Ticket not found or you do not own this ticket.");
        }
        
        const updatedTicket = this.db.cancelTransfer(ticketId);
        if (!updatedTicket) {
            throw new Error("Failed to cancel transfer. The ticket may not have a pending transfer.");
        }
        
        return fakeAsync(updatedTicket, 100);
    }
}