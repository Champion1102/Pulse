import { io, Socket } from 'socket.io-client';

export type Ack<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; error: string };

export function connect(): Socket {
  return io({ transports: ['websocket', 'polling'] });
}

export function emit<T = Record<string, unknown>>(socket: Socket, event: string, payload: unknown = {}): Promise<Ack<T>> {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload, (err: Error | null, res: Ack<T>) => {
      resolve(err ? { ok: false, error: 'The server did not respond. Check your connection.' } : res);
    });
  });
}
