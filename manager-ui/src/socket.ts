import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

export const socket = io(API_BASE_URL, {
    transports: ['websocket'],
});