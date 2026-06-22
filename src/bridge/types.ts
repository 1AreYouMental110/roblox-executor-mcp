import type { WebSocket } from "ws";

export type InstanceRole = "primary" | "secondary";

export interface RobloxClient {
  clientId: string;
  username: string;
  userId: number;
  placeId: number;
  jobId: string;
  placeName: string;
  transport: "ws" | "http";
  ws?: WebSocket;
  lastHttpPoll: number;
  // HTTP fallback transport: a FIFO queue of pending command JSON strings (was a
  // single slot that silently dropped commands on rapid/parallel dispatch), plus
  // an optional long-poll waiter invoked the instant a command is queued so a
  // held /poll request returns immediately instead of waiting for the next tick.
  pendingHttpCommands: string[];
  pendingPollResolve: ((commands: string[]) => void) | null;
}

export interface RobloxResponse {
  id: string;
  output?: string;
  error?: string;
  [key: string]: unknown;
}

export type ResponseResolver = (data: RobloxResponse) => void;

export const NO_CLIENT_SENTINEL = null;
export const INVALID_CLIENT_SENTINEL = "INVALID_CLIENT";
export type DispatchResult = string | null | "INVALID_CLIENT";
