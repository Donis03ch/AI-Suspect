
import type { Timestamp } from 'firebase/firestore';

export type PlayerType = 'human' | 'ai';

export type Player = {
  uid: string;
  name: string;
  type: PlayerType;
  answer: string | null;
  votesReceived: number;
  roomId?: string;
};

export interface RoomPlayer extends Player {
  answer: string | null; // Answer for the current question
  hasVotedThisRound?: boolean;
  // Add a field to track if the player has submitted an answer for the current question index
  hasAnsweredCurrentQuestion?: boolean; 
  isEliminated?: boolean;
}

export type RoomStatus = 'LOBBY' | 'WAITING_ROOM' | 'QUESTION_DISPLAY' | 'ANSWERING' | 'VOTING' | 'RESULTS' | 'AI_THINKING' | 'FINISHED';

export type Room = {
  id: string;
  name: string;
  hostUid: string;
  players: RoomPlayer[];
  gameCode: string;
  status: RoomStatus;
  currentQuestion: string | null;
  currentQuestionIndex: number;
  maxPlayers: number;
  aiPlayerId: string | null;
  createdAt?: Timestamp | any; // Using 'any' for serverTimestamp() flexibility before conversion
  // Field to track which question index players have answered for, helps AI and answer reset logic
  questionRoundId?: string; 
  isPublic: boolean;
  totalRounds: number;
};

export type GameClientState = 'AUTH' | 'LOBBY' | 'IN_ROOM' | 'LOADING';


export type Vote = {
  voterId: string;
  votedForId: string;
};
