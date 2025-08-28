
"use client";

import type { Player, Room, GameClientState, RoomPlayer } from '@/types/game';
import { questions } from '@/lib/questions';
import { getReasoningAnswer, ReasoningAnswerInput } from '@/ai/flows/reasoning-answer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bot, User, CheckCircle, XCircle, Vote as VoteIcon, Brain, MessageSquare, Play, TimerIcon, Loader2, LogOut, Mail, KeyRound, UserPlus, Home, Users, PlusCircle, LogInIcon, Copy, Check, Send, AlertTriangle, Hourglass, Settings2, List, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp, updateDoc, arrayUnion, query, where, getDocs, arrayRemove, deleteDoc, runTransaction, addDoc, orderBy, limit } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { Slider } from "@/components/ui/slider"
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

const AI_PLAYER_NAME = "Agent AI";
const ANSWER_TIME_LIMIT = 45; // seconds
const VOTE_TIME_LIMIT = 30; // seconds
const ABSOLUTE_MAX_PLAYERS = 20; 
const DEFAULT_MAX_PLAYERS = 5;
const MIN_PLAYERS_FOR_ROOM = 2;
const QUESTION_DISPLAY_TIME_LIMIT = 5; 
const DEFAULT_ROUNDS = 5;
const MAX_ROUNDS = 10;
const MIN_ROUNDS = 1;

const generateRoomCode = () => Math.random().toString(36).substring(2, 7).toUpperCase();

export default function GameClient() {
  const { currentUser, signInWithGoogle, signUpWithEmail, signInWithEmail, signOutUser, loadingAuth } = useAuth();

  const [gameClientState, setGameClientState] = useState<GameClientState>('LOADING');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  const [roomNameToCreate, setRoomNameToCreate] = useState('');
  const [maxPlayersForNewRoom, setMaxPlayersForNewRoom] = useState<number>(DEFAULT_MAX_PLAYERS);
  const [totalRounds, setTotalRounds] = useState(DEFAULT_ROUNDS);
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [gameCodeToJoin, setGameCodeToJoin] = useState('');

  const [timer, setTimer] = useState<number>(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [votedOutPlayerInRoom, setVotedOutPlayerInRoom] = useState<RoomPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(false); 

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { toast } = useToast();

  const [shuffledVotingPlayers, setShuffledVotingPlayers] = useState<RoomPlayer[]>([]);

  const roomListenerUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const publicRoomsUnsubscribeRef = useRef<Unsubscribe | null>(null);


  const resetGameAndRoom = useCallback(() => {
    if (roomListenerUnsubscribeRef.current) {
      roomListenerUnsubscribeRef.current();
      roomListenerUnsubscribeRef.current = null;
    }
    if (publicRoomsUnsubscribeRef.current) {
        publicRoomsUnsubscribeRef.current();
        publicRoomsUnsubscribeRef.current = null;
    }
    setCurrentRoom(null);
    setTimer(0);
    setCurrentAnswer('');
    setVotedOutPlayerInRoom(null);
  }, []);

  useEffect(() => {
    if (loadingAuth) {
      setGameClientState('LOADING');
    } else if (!currentUser) {
      setGameClientState('AUTH');
      if (currentRoom) resetGameAndRoom();
    } else if (currentUser && !currentRoom) {
      setGameClientState('LOBBY');
    } else if (currentUser && currentRoom) {
      setGameClientState('IN_ROOM');
    }
  }, [currentUser, currentRoom, loadingAuth, resetGameAndRoom]);

    useEffect(() => {
    if (gameClientState === 'LOBBY' && db && !publicRoomsUnsubscribeRef.current) {
      const q = query(
        collection(db, "rooms"),
        where("isPublic", "==", true),
        where("status", "==", "WAITING_ROOM"),
        limit(10)
      );
      
      publicRoomsUnsubscribeRef.current = onSnapshot(q, (querySnapshot) => {
        const rooms: Room[] = [];
        querySnapshot.forEach((doc) => {
          rooms.push({ id: doc.id, ...doc.data() } as Room);
        });
        setPublicRooms(rooms);
      }, (error) => {
        console.error("Error fetching public rooms: ", error);
        toast({ title: "Error", description: "Could not fetch public rooms.", variant: "destructive" });
      });

    } else if (gameClientState !== 'LOBBY' && publicRoomsUnsubscribeRef.current) {
      publicRoomsUnsubscribeRef.current();
      publicRoomsUnsubscribeRef.current = null;
    }
    
    return () => {
        if (publicRoomsUnsubscribeRef.current) {
          publicRoomsUnsubscribeRef.current();
          publicRoomsUnsubscribeRef.current = null;
        }
      };
  }, [gameClientState, db, toast]);

  useEffect(() => {
    if (currentRoom?.id && db) {
      if (roomListenerUnsubscribeRef.current) {
          roomListenerUnsubscribeRef.current();
          roomListenerUnsubscribeRef.current = null;
      }
      setIsLoading(true); 
      const roomRef = doc(db, 'rooms', currentRoom.id);
      roomListenerUnsubscribeRef.current = onSnapshot(roomRef, (docSnap) => {
        setIsLoading(false); 
        if (docSnap.exists()) {
          const roomData = docSnap.data() as Room;
          setCurrentRoom(roomData);
        } else {
          toast({ title: "Room Closed", description: "The room you were in no longer exists.", variant: "destructive" });
          resetGameAndRoom();
        }
      }, (error) => {
        setIsLoading(false); 
        console.error("Error listening to room:", error);
        toast({ title: "Connection Error", description: "Lost connection to the room.", variant: "destructive" });
        resetGameAndRoom();
      });

      return () => {
        if (roomListenerUnsubscribeRef.current) {
          roomListenerUnsubscribeRef.current();
          roomListenerUnsubscribeRef.current = null;
        }
      };
    } else {
      if (roomListenerUnsubscribeRef.current) {
        roomListenerUnsubscribeRef.current();
        roomListenerUnsubscribeRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [currentRoom?.id, db, resetGameAndRoom, toast]);


  const handleCreateRoom = useCallback(async () => {
    if (!currentUser || !db) {
      toast({ title: "Authentication Error", description: "User or database not available.", variant: "destructive" });
      return;
    }
    if (roomNameToCreate.trim() === '') {
      toast({ title: "Room Name Error", description: "Please enter a room name.", variant: "destructive" });
      return;
    }
    if (maxPlayersForNewRoom < MIN_PLAYERS_FOR_ROOM || maxPlayersForNewRoom > ABSOLUTE_MAX_PLAYERS) {
      toast({ title: "Player Limit Error", description: `Room must have between ${MIN_PLAYERS_FOR_ROOM} and ${ABSOLUTE_MAX_PLAYERS} players.`, variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const hostPlayer: RoomPlayer = {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email || "Host Player",
      type: 'human',
      answer: null,
      votesReceived: 0,
      hasAnsweredCurrentQuestion: false,
      isEliminated: false,
    };

    const aiPlayer: RoomPlayer | null = maxPlayersForNewRoom > 1 ? { // AI only if max players allows for more than just host
        uid: `ai-${Date.now()}`,
        name: AI_PLAYER_NAME,
        type: 'ai',
        answer: null,
        votesReceived: 0,
        hasAnsweredCurrentQuestion: false,
        isEliminated: false,
    } : null;

    const initialPlayers = [hostPlayer];
    if (aiPlayer) {
        initialPlayers.push(aiPlayer);
    }
    
    // Ensure there's capacity for the AI player if one is being added
    if (aiPlayer && initialPlayers.length > maxPlayersForNewRoom) {
        toast({ title: "Player Limit Error", description: "Cannot add AI player; it would exceed the chosen maximum player count.", variant: "destructive" });
        setIsLoading(false);
        return;
    }


    const newRoomId = doc(collection(db, 'rooms')).id;
    const gameCode = generateRoomCode();

    const newRoomData: Room = {
      id: newRoomId,
      name: roomNameToCreate,
      hostUid: currentUser.uid,
      players: initialPlayers,
      gameCode: gameCode,
      status: 'WAITING_ROOM',
      currentQuestion: null,
      currentQuestionIndex: 0, 
      questionRoundId: `q0-${Date.now()}`,
      maxPlayers: maxPlayersForNewRoom,
      totalRounds: totalRounds,
      aiPlayerId: aiPlayer?.uid || null,
      createdAt: serverTimestamp(),
      isPublic: isPublicRoom,
    };

    try {
      await setDoc(doc(db, 'rooms', newRoomId), newRoomData);
      setCurrentRoom(newRoomData); 
      setRoomNameToCreate('');
      toast({ title: "Room Created!", description: `Room "${newRoomData.name}" (${isPublicRoom ? 'Public' : `Code: ${gameCode}`}) created.` });
    } catch (error) {
      console.error("Error creating room:", error);
      toast({ title: "Room Creation Failed", description: "Could not create room. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, roomNameToCreate, maxPlayersForNewRoom, totalRounds, toast, db, isPublicRoom]);

  const handleJoinPublicRoom = useCallback(async (roomId: string) => {
    if (!currentUser || !db) {
      toast({ title: "Authentication Error", description: "User or database not available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDocSnap = await getDoc(roomRef);

      if (!roomDocSnap.exists()) {
        toast({ title: "Join Failed", description: "This room no longer exists.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      let roomData = roomDocSnap.data() as Room;
      roomData.id = roomDocSnap.id;

      if (roomData.players.find(p => p.uid === currentUser.uid)) {
        toast({ title: "Already in Room", description: "You are already in this room." });
        setCurrentRoom(roomData);
        setIsLoading(false);
        return;
      }

      if (roomData.players.length >= roomData.maxPlayers) {
        toast({ title: "Join Failed", description: "Room is full.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (roomData.status !== 'WAITING_ROOM') {
        toast({ title: "Join Failed", description: "Game has already started in this room.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const joiningPlayer: RoomPlayer = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email || `Player ${roomData.players.length + 1}`,
        type: 'human',
        answer: null,
        votesReceived: 0,
        hasAnsweredCurrentQuestion: false,
        isEliminated: false,
      };

      await updateDoc(roomRef, {
        players: arrayUnion(joiningPlayer)
      });
      
      const updatedRoomSnap = await getDoc(roomRef);
      if (updatedRoomSnap.exists()) {
        const finalRoomData = updatedRoomSnap.data() as Room;
        finalRoomData.id = updatedRoomSnap.id;
        setCurrentRoom(finalRoomData);
        toast({ title: "Joined Room!", description: `Successfully joined room "${finalRoomData.name}".` });
      } else {
        toast({ title: "Error joining", description: "Room data could not be fetched after joining.", variant: "destructive" });
        resetGameAndRoom();
      }

    } catch (error) {
      console.error("Error joining public room:", error);
      toast({ title: "Join Failed", description: "Could not join room. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, db, toast, resetGameAndRoom]);

  const handleJoinRoom = useCallback(async () => {
    if (!currentUser || !db) {
      toast({ title: "Authentication Error", description: "User or database not available.", variant: "destructive" });
      return;
    }
    if (gameCodeToJoin.trim() === '') {
      toast({ title: "Game Code Error", description: "Please enter a game code.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const roomsRef = collection(db, "rooms");
      const q = query(roomsRef, where("gameCode", "==", gameCodeToJoin.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "Join Failed", description: "Room not found or invalid code.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const roomDocSnap = querySnapshot.docs[0];
      let roomData = roomDocSnap.data() as Room;
      roomData.id = roomDocSnap.id; // Ensure ID is part of the object

      if (roomData.players.find(p => p.uid === currentUser.uid)) {
        toast({ title: "Already in Room", description: "You are already in this room." });
        setCurrentRoom(roomData);
        setIsLoading(false);
        return;
      }

      if (roomData.players.length >= roomData.maxPlayers) {
        toast({ title: "Join Failed", description: "Room is full.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
       if (roomData.status !== 'WAITING_ROOM') {
        toast({ title: "Join Failed", description: "Game has already started in this room.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const joiningPlayer: RoomPlayer = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email || `Player ${roomData.players.length + 1}`,
        type: 'human',
        answer: null,
        votesReceived: 0,
        hasAnsweredCurrentQuestion: false,
        isEliminated: false,
      };
      
      const roomRef = doc(db, 'rooms', roomDocSnap.id);
      await updateDoc(roomRef, {
        players: arrayUnion(joiningPlayer)
      });
      
      // Fetch the updated room data to ensure the local state is perfectly in sync
      const updatedRoomSnap = await getDoc(roomRef);
      if (updatedRoomSnap.exists()) {
        const finalRoomData = updatedRoomSnap.data() as Room;
        finalRoomData.id = updatedRoomSnap.id;
        setCurrentRoom(finalRoomData); 
        toast({ title: "Joined Room!", description: `Successfully joined room "${finalRoomData.name}".` });
      } else {
        toast({ title: "Error joining", description: "Room data could not be fetched after joining.", variant: "destructive"});
        resetGameAndRoom();
      }
      
    } catch (error) {
      console.error("Error joining room:", error);
      toast({ title: "Join Failed", description: "Could not join room. Please try again.", variant: "destructive" });
    } finally {
      setGameCodeToJoin('');
      setIsLoading(false);
    }
  }, [currentUser, gameCodeToJoin, toast, db, resetGameAndRoom]);

  const handleLeaveRoom = useCallback(async () => {
    if (!currentRoom || !currentUser || !db) return;
    setIsLoading(true);
    const roomToLeaveName = currentRoom.name;

    if (roomListenerUnsubscribeRef.current) {
        roomListenerUnsubscribeRef.current();
        roomListenerUnsubscribeRef.current = null;
    }

    try {
        const roomRef = doc(db, 'rooms', currentRoom.id);
        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);

            if (!roomSnap.exists()) {
                return;
            }

            const roomData = roomSnap.data() as Room;
            
            const remainingPlayers = roomData.players.filter(p => p.uid !== currentUser.uid);
            const humanPlayersLeft = remainingPlayers.filter(p => p.type === 'human');

            if (humanPlayersLeft.length === 0) {
                // Last human is leaving, delete the room.
                transaction.delete(roomRef);
                toast({ title: "Room Closed", description: `Room "${roomToLeaveName}" was closed as no human players remain.` });
            } else {
                // Other humans remain, update the room.
                let newHostUid = roomData.hostUid;
                if (roomData.hostUid === currentUser.uid && humanPlayersLeft.length > 0) {
                    // The host is leaving, assign a new host from the remaining human players.
                    newHostUid = humanPlayersLeft[0].uid;
                }
                
                const updatePayload = {
                    players: remainingPlayers,
                    hostUid: newHostUid,
                };
                
                toast({ title: "Left Room", description: "You have left the room." });
                transaction.update(roomRef, updatePayload);
            }
        });
        
        resetGameAndRoom();
    } catch (error) {
        console.error("Error leaving room:", error);
        toast({ title: "Leave Room Failed", description: "Could not leave the room. Please try again.", variant: "destructive" });
        // Attempt to reset state even on failure to avoid being stuck.
        resetGameAndRoom();
    } finally {
        setIsLoading(false);
    }
  }, [currentRoom, currentUser, toast, db, resetGameAndRoom]);


  const handleStartGameInRoom = useCallback(async () => {
    if (!currentRoom || !currentUser || currentRoom.hostUid !== currentUser.uid || !db) {
      toast({ title: "Start Game Error", description: "Only the host can start the game, or DB not available.", variant: "destructive" });
      return;
    }
    
    const humanPlayerCount = currentRoom.players.filter(p => p.type === 'human').length;
    
    if (currentRoom.players.length < 2 && humanPlayerCount < 1) {
        toast({ title: "Not Enough Players", description: `Need at least 1 human and 1 AI to start. Check room settings.`, variant: "destructive" });
        return;
    }


    setIsLoading(true);
    try {
      const firstQuestion = questions[Math.floor(Math.random() * questions.length)];
      const roomRef = doc(db, 'rooms', currentRoom.id);
      const newQuestionRoundId = `q0-${Date.now()}`;
      await updateDoc(roomRef, {
        status: 'QUESTION_DISPLAY',
        currentQuestion: firstQuestion,
        currentQuestionIndex: 0, 
        questionRoundId: newQuestionRoundId,
        players: currentRoom.players.map(p => ({ ...p, answer: null, votesReceived: 0, hasVotedThisRound: false, hasAnsweredCurrentQuestion: false, isEliminated: false })),
      });
    } catch (error) {
      console.error("Error starting game:", error);
      toast({ title: "Start Game Failed", description: "Could not start game.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentRoom, currentUser, toast, db]);


  const handleAdvanceRound = useCallback(async () => {
    if (!currentRoom || !currentUser || currentRoom.hostUid !== currentUser.uid || !db) return;
    setIsLoading(true);

    try {
        const roomRef = doc(db, 'rooms', currentRoom.id);
        
        let playersAfterElimination = [...currentRoom.players];
        if (votedOutPlayerInRoom && votedOutPlayerInRoom.type === 'human') {
            playersAfterElimination = playersAfterElimination.map(p => 
                p.uid === votedOutPlayerInRoom.uid ? { ...p, isEliminated: true } : p
            );
        }
        
        const isLastRound = (currentRoom.currentQuestionIndex + 1) >= currentRoom.totalRounds;

        if (isLastRound) {
             await updateDoc(roomRef, { 
                status: 'FINISHED', 
                players: playersAfterElimination,
             });
             toast({ title: "Game Over!", description: "All rounds have been played." });
        } else {
            const nextRoundIndex = currentRoom.currentQuestionIndex + 1;
            const nextQuestion = questions[Math.floor(Math.random() * questions.length)];
            const newQuestionRoundId = `q${nextRoundIndex}-${Date.now()}`;
            
            await updateDoc(roomRef, {
                status: 'QUESTION_DISPLAY',
                currentQuestion: nextQuestion,
                currentQuestionIndex: nextRoundIndex,
                questionRoundId: newQuestionRoundId,
                players: playersAfterElimination.map(p => ({ 
                    ...p, 
                    answer: null, 
                    votesReceived: 0, 
                    hasVotedThisRound: false, 
                    hasAnsweredCurrentQuestion: false 
                })),
            });
        }
    } catch (error) {
        console.error("Error advancing round:", error);
        toast({ title: "Game Error", description: "Could not proceed to next round.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [currentRoom, currentUser, toast, db, votedOutPlayerInRoom]);


  const handleAnswerSubmitRoom = useCallback(async () => {
    if (!currentRoom || !currentUser || !db || currentRoom.status !== 'ANSWERING') return;

    const playerSelf = currentRoom.players.find(p => p.uid === currentUser.uid);
    if (!playerSelf || playerSelf.type !== 'human' || playerSelf.isEliminated) {
      toast({ title: "Submission Error", description: "Only active human players can submit answers.", variant: "destructive" });
      return;
    }
    if (playerSelf.hasAnsweredCurrentQuestion) {
      toast({ title: "Already Answered", description: "You've already submitted an answer for this round.", variant: "warning" });
      return;
    }
    if (currentAnswer.trim() === '') {
      toast({ title: "Empty Answer", description: "Please provide an answer.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const roomRef = doc(db, 'rooms', currentRoom.id);
      const currentRoomDoc = await getDoc(roomRef);
      if (!currentRoomDoc.exists()) return;
      const currentPlayers = currentRoomDoc.data()?.players as RoomPlayer[] || currentRoom.players;
      
      const newPlayers = currentPlayers.map(p =>
        p.uid === currentUser.uid ? { ...p, answer: currentAnswer, hasAnsweredCurrentQuestion: true } : p
      );

      await updateDoc(roomRef, {
        players: newPlayers,
      });
      setCurrentAnswer(''); 
      toast({title: "Answer Transmitted!", variant: "default"});
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast({ title: "Answer Submission Failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentAnswer, currentRoom, currentUser, toast, db]);

  const handleVoteRoom = useCallback(async (votedPlayerId: string) => {
    if (!currentRoom || !currentUser || !db || currentRoom.status !== 'VOTING') return;
    const votingPlayer = currentRoom.players.find(p => p.uid === currentUser.uid);

    if (!votingPlayer || votingPlayer.type !== 'human' || votingPlayer.hasVotedThisRound || votingPlayer.isEliminated) {
      toast({ title: "Vote Error", description: "You cannot vote, have already voted, or have been eliminated.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const roomRef = doc(db, 'rooms', currentRoom.id);
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) {
          throw new Error("Room does not exist!");
        }
        const roomData = roomSnap.data() as Room;

        if (roomData.status !== 'VOTING') {
            toast({ title: "Vote Error", description: "Voting phase has already ended.", variant: "warning" });
            throw new Error("Voting phase has ended.");
        }
        const currentVotingPlayerInTransaction = roomData.players.find(p => p.uid === currentUser.uid);
        if (!currentVotingPlayerInTransaction || currentVotingPlayerInTransaction.hasVotedThisRound) {
            toast({ title: "Vote Error", description: "You have already voted in this round.", variant: "warning" });
            throw new Error("You have already voted in this round.");
        }

        const newPlayers = roomData.players.map(p => {
          let newVotesReceived = p.votesReceived || 0;
          let newHasVotedThisRound = p.hasVotedThisRound;

          if (p.uid === votedPlayerId) {
            newVotesReceived += 1;
          }
          if (p.uid === currentUser.uid) {
            newHasVotedThisRound = true;
          }
          return { ...p, votesReceived: newVotesReceived, hasVotedThisRound: newHasVotedThisRound };
        });
        
        transaction.update(roomRef, { players: newPlayers });
      });
      toast({title: "Vote Cast!", description: "Your vote has been recorded.", variant: "default"});
    } catch (error: any) {
      console.error("Error casting vote:", error);
      if (error.message !== "Voting phase has ended." && error.message !== "You have already voted in this round.") {
         toast({ title: "Vote Failed", description: error.message || "Could not cast vote.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentRoom, currentUser, toast, db]);

  // AI answers logic
  useEffect(() => {
    if (!currentRoom || currentRoom.status !== 'ANSWERING' || !currentRoom.aiPlayerId || !db || !currentRoom.currentQuestion || !currentUser) return;

    const aiPlayer = currentRoom.players.find(p => p.uid === currentRoom.aiPlayerId);
    
    if (aiPlayer && !aiPlayer.hasAnsweredCurrentQuestion && currentRoom.questionRoundId) {
      const roomRef = doc(db, 'rooms', currentRoom.id);
      const currentQuestionRoundForAI = currentRoom.questionRoundId;

      const getAnswer = async () => {
        const aiInput: ReasoningAnswerInput = { 
          question: currentRoom.currentQuestion!,
        };
        return getReasoningAnswer(aiInput);
      };

      getAnswer()
        .then(async (response) => {
          const currentRoomDoc = await getDoc(roomRef);
          if (!currentRoomDoc.exists()) return;
          const freshRoomData = currentRoomDoc.data() as Room;

          if (freshRoomData.status !== 'ANSWERING' || freshRoomData.questionRoundId !== currentQuestionRoundForAI) {
            return; 
          }
          const freshAiPlayer = freshRoomData.players.find(p => p.uid === freshRoomData.aiPlayerId);
          if (!freshAiPlayer || freshAiPlayer.hasAnsweredCurrentQuestion) {
            return; 
          }

          const newPlayers = freshRoomData.players.map(p =>
            p.uid === freshRoomData.aiPlayerId ? { ...p, answer: response.answer, hasAnsweredCurrentQuestion: true } : p
          );
          await updateDoc(roomRef, { players: newPlayers });
        })
        .catch(async (error) => {
          console.error("AI Error:", error);
          toast({ title: "AI Error", description: "The AI failed to provide an answer.", variant: "destructive" });
          
          // Fallback answer if AI fails
          const currentRoomDoc = await getDoc(roomRef);
          if (!currentRoomDoc.exists()) return;
          const freshRoomData = currentRoomDoc.data() as Room;

          if (freshRoomData.status !== 'ANSWERING' || freshRoomData.questionRoundId !== currentQuestionRoundForAI) {
            return;
          }
          const freshAiPlayer = freshRoomData.players.find(p => p.uid === freshRoomData.aiPlayerId);
          if (!freshAiPlayer || freshAiPlayer.hasAnsweredCurrentQuestion) { // Check again
            return;
          }
          
          const newPlayers = freshRoomData.players.map(p =>
            p.uid === freshRoomData.aiPlayerId ? { ...p, answer: "Bleep.", hasAnsweredCurrentQuestion: true } : p
          );
          await updateDoc(roomRef, { players: newPlayers });
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.status, currentRoom?.aiPlayerId, currentRoom?.currentQuestion, currentRoom?.questionRoundId, currentRoom?.players, db, toast]);


 useEffect(() => {
    if (!currentRoom || !currentUser || !db || currentRoom.hostUid !== currentUser.uid) {
      return; 
    }

    const roomRef = doc(db, 'rooms', currentRoom.id);

    if (timer === 0) { 
      if (currentRoom.status === 'QUESTION_DISPLAY') {
        updateDoc(roomRef, { status: 'ANSWERING' }).catch(console.error);
      } else if (currentRoom.status === 'ANSWERING') {
        updateDoc(roomRef, { status: 'VOTING' }).catch(console.error);
      } else if (currentRoom.status === 'VOTING') {
        if (votedOutPlayerInRoom?.type === 'ai') {
          updateDoc(roomRef, { status: 'FINISHED' }).catch(console.error);
        } else {
          updateDoc(roomRef, { status: 'RESULTS' }).catch(console.error);
        }
      }
    } else { 
        if (currentRoom.status === 'ANSWERING') {
            const activeHumanPlayers = currentRoom.players.filter(p => p.type === 'human' && !p.isEliminated);
            const aiPlayer = currentRoom.players.find(p => p.uid === currentRoom.aiPlayerId);
            
            const allHumansAnswered = activeHumanPlayers.every(p => p.hasAnsweredCurrentQuestion);
            const aiAnswered = aiPlayer ? aiPlayer.hasAnsweredCurrentQuestion : true;

            if (activeHumanPlayers.length > 0 && allHumansAnswered && aiAnswered) {
                 updateDoc(roomRef, { status: 'VOTING' }).catch(console.error);
            }
        } else if (currentRoom.status === 'VOTING') {
            const activeHumanPlayers = currentRoom.players.filter(p => p.type === 'human' && !p.isEliminated);
            const allHumansVoted = activeHumanPlayers.every(p => p.hasVotedThisRound);
             if (activeHumanPlayers.length > 0 && allHumansVoted) {
                if (votedOutPlayerInRoom?.type === 'ai') {
                  updateDoc(roomRef, { status: 'FINISHED' }).catch(console.error);
                } else {
                  updateDoc(roomRef, { status: 'RESULTS' }).catch(console.error);
                }
            }
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, currentRoom?.status, currentRoom?.players, currentRoom?.hostUid, currentUser?.uid, db, votedOutPlayerInRoom]); 

  useEffect(() => {
    if (!currentRoom) {
      setTimer(0);
      return;
    }
    if(currentRoom.status === 'QUESTION_DISPLAY' || currentRoom.status === 'ANSWERING') {
        const playerSelf = currentRoom.players.find(p => p.uid === currentUser?.uid);
        if (playerSelf && playerSelf.type === 'human' && !playerSelf.hasAnsweredCurrentQuestion) {
             setCurrentAnswer(''); 
        }
    }
    
    // When results are shown, if AI is voted out, end the game immediately.
    if(currentRoom.status === 'RESULTS' && votedOutPlayerInRoom?.type === 'ai') {
      const roomRef = doc(db, 'rooms', currentRoom.id);
      updateDoc(roomRef, { status: 'FINISHED' }).catch(console.error);
      toast({ title: "Success! The AI was identified!", variant: "default" });
    }


    switch (currentRoom.status) {
      case 'QUESTION_DISPLAY':
        setTimer(QUESTION_DISPLAY_TIME_LIMIT);
        break;
      case 'ANSWERING':
        setTimer(ANSWER_TIME_LIMIT);
        break;
      case 'VOTING':
        setTimer(VOTE_TIME_LIMIT);
        break;
      default:
        setTimer(0); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.status, currentRoom?.questionRoundId]); 

  useEffect(() => {
    if (timer > 0) {
      const intervalId = setInterval(() => {
        setTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [timer]);


  // Determine voted out player
  useEffect(() => {
    if (currentRoom && (currentRoom.status === 'VOTING' || currentRoom.status === 'RESULTS' || currentRoom.status === 'FINISHED')) {
      const maxVotes = Math.max(0, ...currentRoom.players.map(p => p.votesReceived || 0));
      const mostVotedPlayers = currentRoom.players.filter(p => (p.votesReceived || 0) === maxVotes && maxVotes > 0);
      const votedOut = mostVotedPlayers.length === 1 ? mostVotedPlayers[0] : null;
      setVotedOutPlayerInRoom(votedOut);
    } else {
      setVotedOutPlayerInRoom(null); 
    }
  }, [currentRoom?.status, currentRoom?.players]);

  // Shuffle players for voting round
  useEffect(() => {
    if (currentRoom && currentRoom.status === 'VOTING' && currentRoom.questionRoundId) {
        const activePlayers = currentRoom.players.filter(p => !p.isEliminated);
        const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
        setShuffledVotingPlayers(shuffled);
    } else {
        setShuffledVotingPlayers([]);
    }
  }, [currentRoom?.status, currentRoom?.players, currentRoom?.questionRoundId]);


  const timeLimitForCurrentState = useMemo(() => {
    if (!currentRoom) return 0;
    if (currentRoom.status === 'ANSWERING') return ANSWER_TIME_LIMIT;
    if (currentRoom.status === 'VOTING') return VOTE_TIME_LIMIT;
    if (currentRoom.status === 'QUESTION_DISPLAY') return QUESTION_DISPLAY_TIME_LIMIT;
    return 0;
  }, [currentRoom?.status]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        if (isSignUp) {
        await signUpWithEmail(authEmail, authPassword);
        } else {
        await signInWithEmail(authEmail, authPassword);
        }
    } finally {
        setIsLoading(false);
        setAuthEmail('');
        setAuthPassword('');
    }
  };

  const copyGameCode = () => {
    if(currentRoom?.gameCode) {
      navigator.clipboard.writeText(currentRoom.gameCode)
      .then(() => {
        setIsCopied(true);
        toast({title: "Game Code Copied!", description: `${currentRoom.gameCode} copied to clipboard.`});
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => toast({title: "Copy Failed", description: "Could not copy code.", variant: "destructive"}));
    }
  }
  
  const renderAuth = () => (
    <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">
          {isSignUp ? 'Create Your Agent Persona' : 'Agent Sign-In'}
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          {isSignUp ? 'Join the ranks and outwit the AI!' : 'Welcome back, Agent. Time to play.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="auth-email">Agent Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="auth-email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="agent@secret.hq" required className="pl-10 bg-input/70" disabled={isLoading}/>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="auth-password">Password</Label>
             <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="auth-password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="●●●●●●●●" required className="pl-10 bg-input/70" disabled={isLoading}/>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5" /> : <LogInIcon className="mr-2 h-5 w-5" />)}
            {isSignUp ? 'Register Agent' : 'Access HQ'}
          </Button>
        </form>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or use alternative access</span>
          </div>
        </div>
        <Button onClick={signInWithGoogle} variant="outline" className="w-full border-accent/50 hover:bg-accent/10 text-accent hover:text-accent-foreground" disabled={isLoading || gameClientState === 'LOADING'}>
            {isLoading && gameClientState === 'LOADING' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.8 0 265.5S110.3 19 244 19c70.8 0 132.8 29.2 177.2 76.2L360 150.1c-28.2-26.1-69.3-42.3-116-42.3-93 0-169.4 74.8-169.4 166.2s76.4 166.2 169.4 166.2c99.3 0 145.3-65.1 149.6-98.5H244v-73.9h236.1c2.6 13.2 4.1 27.8 4.1 43.9z"></path>
          </svg>}
          Sign in with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center pt-4">
        <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-accent" disabled={isLoading}>
          {isSignUp ? 'Already an Agent? Access HQ' : "New Recruit? Register Here"}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderLobby = () => (
    <div className="w-full max-w-4xl space-y-8">
        <Card className="shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
                <CardTitle className="text-3xl font-bold text-center text-primary">Agent Lobby</CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                Welcome, <span className="font-semibold text-accent">{currentUser?.displayName || currentUser?.email}!</span> Ready for a new mission?
                </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 p-6">
                <div className="space-y-4 p-4 border border-dashed border-accent/30 rounded-lg shadow-sm bg-secondary/30 hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-semibold text-accent flex items-center"><PlusCircle className="mr-2 h-6 w-6" />Initiate New Operation</h3>
                  
                  <div>
                    <Label htmlFor="room-name-create" className="text-sm font-medium text-muted-foreground">Operation Name</Label>
                    <Input
                        id="room-name-create"
                        value={roomNameToCreate}
                        onChange={(e) => setRoomNameToCreate(e.target.value)}
                        placeholder="e.g., 'Operation Whisper'"
                        disabled={isLoading}
                        className="text-base bg-input/70 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-players-create" className="text-sm font-medium text-muted-foreground">Max Agents ( {maxPlayersForNewRoom} / {ABSOLUTE_MAX_PLAYERS} )</Label>
                     <Slider
                        id="max-players-create"
                        min={MIN_PLAYERS_FOR_ROOM}
                        max={ABSOLUTE_MAX_PLAYERS}
                        step={1}
                        value={[maxPlayersForNewRoom]}
                        onValueChange={(value) => setMaxPlayersForNewRoom(value[0])}
                        disabled={isLoading}
                        className="my-2.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total-rounds-create" className="text-sm font-medium text-muted-foreground">Rounds ( {totalRounds} )</Label>
                     <Slider
                        id="total-rounds-create"
                        min={MIN_ROUNDS}
                        max={MAX_ROUNDS}
                        step={1}
                        value={[totalRounds]}
                        onValueChange={(value) => setTotalRounds(value[0])}
                        disabled={isLoading}
                        className="my-2.5"
                    />
                  </div>
                   <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="public-room-switch" className="text-sm font-medium text-muted-foreground flex items-center">Public Room?</Label>
                    <Switch
                        id="public-room-switch"
                        checked={isPublicRoom}
                        onCheckedChange={setIsPublicRoom}
                        disabled={isLoading}
                    />
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-lg !mt-4" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Home className="mr-2 h-5 w-5" />} Create Room
                  </Button>
                </div>

                <div className="space-y-4 p-4 border border-dashed border-primary/30 rounded-lg shadow-sm bg-secondary/30 hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-semibold text-primary flex items-center"><LogInIcon className="mr-2 h-6 w-6"/>Join Private Operation</h3>
                  <div>
                    <Label htmlFor="game-code-join" className="text-sm font-medium text-muted-foreground">Access Code</Label>
                    <Input
                        id="game-code-join"
                        value={gameCodeToJoin}
                        onChange={(e) => setGameCodeToJoin(e.target.value.toUpperCase())}
                        placeholder="Enter 5-digit code"
                        maxLength={5}
                        disabled={isLoading}
                        className="text-base tracking-widest bg-input/70 placeholder:tracking-normal mt-1"
                    />
                  </div>
                  <Button onClick={handleJoinRoom} className="w-full py-3 text-lg !mt-[12rem]" disabled={isLoading}> 
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Users className="mr-2 h-5 w-5" />} Join Room
                  </Button>
                </div>
            </CardContent>
             <CardFooter className="flex-col space-y-2 pt-6 border-t border-border/30">
                <Button onClick={signOutUser} variant="outline" className="w-full text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isLoading}>
                {isLoading && gameClientState === 'LOADING' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />} Stand Down (Sign Out)
                </Button>
            </CardFooter>
        </Card>
        <Card className="shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
                <CardTitle className="text-3xl font-bold text-center text-primary flex items-center justify-center">
                    <List className="mr-3 h-8 w-8" /> Public Operations
                </CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                    Join an ongoing public mission.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72 w-full p-4">
                    {publicRooms.length > 0 ? (
                        <div className="space-y-4">
                            {publicRooms.map(room => (
                                <div key={room.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md shadow-sm border border-border/30">
                                    <div>
                                        <p className="font-semibold text-foreground">{room.name}</p>
                                        <p className="text-sm text-muted-foreground">Host: {room.players.find(p => p.uid === room.hostUid)?.name || 'Unknown'}</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm font-medium text-foreground">{room.players.length} / {room.maxPlayers}</span>
                                        <Button onClick={() => handleJoinPublicRoom(room.id)} disabled={isLoading}>Join</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                            <Users className="h-12 w-12 mb-4" />
                            <p className="font-semibold">No public rooms available right now.</p>
                            <p className="text-xs mt-1">Why not create one?</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );

  const renderWaitingRoom = () => {
    if (!currentRoom) return <p>Error: No room data!</p>;
    const isHost = currentUser?.uid === currentRoom.hostUid;
    const humanPlayerCount = currentRoom.players.filter(p => p.type === 'human').length;
    const minHumansNeeded = currentRoom.aiPlayerId ? 1 : MIN_PLAYERS_FOR_ROOM;
    const canStart = isHost && humanPlayerCount >= minHumansNeeded && currentRoom.players.length >= MIN_PLAYERS_FOR_ROOM;


    return (
      <Card className="w-full max-w-lg shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold text-center text-primary">Operation Briefing: {currentRoom.name}</CardTitle>
          <CardDescription className="text-center flex items-center justify-center pt-1 text-muted-foreground">
            {!currentRoom.isPublic ? 
            <>Access Code: <span className="font-bold text-accent mx-1.5 select-all">{currentRoom.gameCode}</span>
            <Button variant="ghost" size="icon" onClick={copyGameCode} className="h-7 w-7 ml-1 text-muted-foreground hover:text-accent" title={isCopied ? "Copied!" : "Copy game code"}>
              {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16}/>}
            </Button></>
            : <span>Public Room</span>
            }
          </CardDescription>
           <p className="text-center text-sm text-muted-foreground">Agents Assembled: ({currentRoom.players.length}/{currentRoom.maxPlayers}) &bull; Rounds: {currentRoom.totalRounds}</p>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto p-4">
          <h4 className="font-semibold text-lg text-center text-foreground/90">Agents in Room:</h4>
          <ul className="space-y-2 p-1">
            {currentRoom.players.map(player => (
              <li key={player.uid} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md shadow-sm border border-border/30">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-muted-foreground/50 shadow-md">
                     <AvatarImage src={`https://placehold.co/40x40/${player.type === 'ai' ? 'A080A0' : '80A0A0'}/FFFFFF.png?text=${player.name.substring(0,1).toUpperCase()}`} data-ai-hint="abstract letter" />
                    <AvatarFallback className="bg-muted">{player.name.substring(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{player.name} {player.uid === currentRoom.hostUid && <span className="text-xs text-accent font-semibold">(Lead Agent)</span>}</span>
                </div>
                 {player.type === 'ai' && <Bot size={20} className="text-primary animate-pulse" />}
                 {player.type === 'human' && <User size={20} className="text-green-400" />}
              </li>
            ))}
          </ul>
           {currentRoom.players.length < currentRoom.maxPlayers && (
            <p className="text-sm text-muted-foreground text-center pt-2">Awaiting {currentRoom.maxPlayers - currentRoom.players.length} more agent(s)...</p>
          )}
        </CardContent>
        <CardFooter className="flex-col space-y-3 pt-4 border-t border-border/30">
          {isHost && (
            <Button
              onClick={handleStartGameInRoom}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6"
              disabled={isLoading || !canStart}
              title={!canStart ? `Need ${MIN_PLAYERS_FOR_ROOM} total players and ${minHumansNeeded} human(s) to start.` : "Commence Operation"}
            >
              {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Play className="mr-2 h-6 w-6" />} Commence Operation
            </Button>
          )}
          {!isHost && <p className="text-md text-muted-foreground text-center">Awaiting Lead Agent ({currentRoom.players.find(p=>p.uid === currentRoom.hostUid)?.name || 'Lead'}) to start.</p>}
          <Button onClick={handleLeaveRoom} variant="outline" className="w-full text-muted-foreground hover:border-primary hover:bg-primary/10 hover:text-primary" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />} Abort Mission (Leave)
          </Button>
          <Button onClick={signOutUser} variant="link" className="w-full text-xs text-muted-foreground/70 hover:text-destructive" disabled={isLoading}>
            <LogOut className="mr-1 h-3 w-3" /> Go Off Grid (Sign Out)
        </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderQuestionDisplay = () => (
    <Card className="w-full max-w-xl text-center shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-primary text-3xl font-bold">Incoming Transmission!</CardTitle>
         <CardDescription className="text-lg pt-1 text-muted-foreground">Operation: {currentRoom?.name} - Round: { (currentRoom?.currentQuestionIndex ?? 0) + 1} / {currentRoom?.totalRounds}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <p className="text-2xl my-6 font-medium leading-relaxed text-foreground/90">{currentRoom?.currentQuestion}</p>
        <div className="flex items-center justify-center space-x-3 text-accent">
            <Hourglass size={28} className="animate-spin duration-[2000ms]" />
            <p className="text-xl font-semibold">Prepare response... {timer}s</p>
        </div>
        <Progress value={(timer / QUESTION_DISPLAY_TIME_LIMIT) * 100} className="w-full mt-6 h-3 [&>div]:bg-accent shadow-inner" />
      </CardContent>
      <CardFooter className="flex-col space-y-3 pt-6 border-t border-border/30 mt-0">
        <Button onClick={handleLeaveRoom} variant="outline" className="w-full text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />} Abort Mission (Leave)
        </Button>
      </CardFooter>
    </Card>
  );

  const renderAnswering = () => {
    if (!currentRoom) return <p>Loading turn...</p>;
    const playerSelf = currentRoom.players.find(p => p.uid === currentUser?.uid);
    const canAnswer = playerSelf && playerSelf.type === 'human' && !playerSelf.hasAnsweredCurrentQuestion && !playerSelf.isEliminated;

    return (
      <Card className="w-full max-w-xl shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary text-center text-2xl font-semibold">Intel Required!</CardTitle>
          <CardDescription className="text-center text-lg pt-1 text-muted-foreground italic">"{currentRoom.currentQuestion}"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {playerSelf?.type === 'human' ? (
            playerSelf.isEliminated ? (
              <div className="text-center py-6 space-y-3">
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <p className="text-xl text-muted-foreground">You have been eliminated.</p>
                <p className="text-sm text-muted-foreground">Observe the remaining agents.</p>
              </div>
            ) : canAnswer ? (
            <form onSubmit={(e) => { e.preventDefault(); handleAnswerSubmitRoom(); }} className="space-y-4">
              <Label htmlFor="answer-input" className="text-md sr-only">Your Response:</Label>
              <div className="flex space-x-3">
                <Input
                    id="answer-input"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Your witty response..."
                    disabled={isLoading || !canAnswer}
                    className="flex-grow min-h-[56px] text-xl bg-input/70 border-border/70 focus:border-accent focus:ring-accent"
                    maxLength={50} 
                />
                <Button type="submit" className="min-h-[56px] bg-accent hover:bg-accent/90 text-accent-foreground px-6 text-lg" disabled={isLoading || !canAnswer}>
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Transmit your response. Make it count.</p>
            </form>
            ) : (
                 <div className="text-center py-6 space-y-3">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <p className="text-xl text-muted-foreground">Intel Transmitted. Awaiting other agents...</p>
                </div>
            )
          ) : ( 
             <div className="text-center py-6 space-y-3">
                <Bot className="h-16 w-16 text-accent mx-auto animate-pulse" />
                <p className="text-xl text-muted-foreground">{AI_PLAYER_NAME} is formulating...</p>
            </div>
          )}
           <div className="mt-8">
              <div className="flex justify-between items-center mb-1 text-sm text-muted-foreground">
                <span className="flex items-center font-medium"><TimerIcon size={16} className="mr-1.5 text-primary"/>Time Remaining</span>
                <span className="font-semibold text-lg text-primary">{timer}s</span>
              </div>
              <Progress value={(timer / ANSWER_TIME_LIMIT) * 100} className="w-full h-3 [&>div]:bg-primary shadow-inner" />
            </div>
        </CardContent>
        <CardFooter className="pt-6 border-t border-border/30">
            <Button onClick={handleLeaveRoom} variant="outline" className="w-full text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />} Abort Mission (Leave)
            </Button>
        </CardFooter>
      </Card>
    );
  };
  
  const renderVoting = () => {
    if (!currentRoom) return <p>Loading voting...</p>;
    const myPlayerData = currentRoom.players.find(p => p.uid === currentUser?.uid);
    const canVote = myPlayerData && myPlayerData.type === 'human' && !myPlayerData.hasVotedThisRound && !myPlayerData.isEliminated;
    const playersToDisplay = shuffledVotingPlayers.length > 0 ? shuffledVotingPlayers : currentRoom.players.filter(p => !p.isEliminated);

    return (
      <Card className="w-full max-w-2xl shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary text-2xl text-center font-bold">Identify the Impostor!</CardTitle>
          <CardDescription className="text-center pt-1 text-md text-muted-foreground">
            Review agent responses. Who is the AI? <br/> Question: <em className="text-foreground/80">"{currentRoom.currentQuestion}"</em>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto p-2 sm:p-4">
          {myPlayerData?.isEliminated && (
             <div className="text-center py-4 my-2 rounded-lg bg-secondary/50">
                <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                <p className="text-lg text-muted-foreground mt-2">You have been eliminated and cannot vote.</p>
              </div>
          )}
          {playersToDisplay.map((player, index) => (
            <Card key={player.uid} className={`p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-lg transition-shadow bg-secondary/40 rounded-lg border border-transparent ${player.uid === currentUser?.uid ? 'opacity-70 ring-1 ring-primary/30' : 'hover:border-accent/50'}`}>
              <div className="flex items-center space-x-3 mb-2 sm:mb-0 w-full sm:w-auto">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-muted-foreground/30 shadow-md">
                  <AvatarImage src={`https://placehold.co/48x48/9CA3AF/FFFFFF.png?text=?`} data-ai-hint="mystery person"/>
                  <AvatarFallback className="bg-muted">?</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="text-md text-foreground/90 italic">Response: "{player.answer || 'No response logged.'}"</p>
                </div>
              </div>
              {player.uid !== currentUser?.uid && ( 
                <Button
                  onClick={() => handleVoteRoom(player.uid)}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0 py-2.5 px-5 text-sm sm:text-base"
                  disabled={isLoading || !canVote}
                >
                  {(isLoading && !canVote) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <VoteIcon className="mr-2 h-4 w-4" />} Vote
                </Button>
              )}
               {player.uid === currentUser?.uid && (
                  <span className="text-xs text-muted-foreground self-center sm:self-auto pt-2 sm:pt-0">(Your Answer)</span>
              )}
            </Card>
          ))}
        </CardContent>
         <CardFooter className="flex-col items-center space-y-3 pt-4 border-t border-border/30">
           <div className="w-full flex justify-between items-center mb-1 text-sm text-muted-foreground">
              <span className="flex items-center font-medium"><TimerIcon size={16} className="mr-1.5 text-primary"/>Time Remaining to Vote</span>
              <span className="font-semibold text-lg text-primary">{timer}s</span>
            </div>
            <Progress value={(timer / VOTE_TIME_LIMIT) * 100} className="w-full h-3 [&>div]:bg-primary shadow-inner" />
            <p className="text-xs text-muted-foreground mt-2">
              {currentRoom.players.filter(p => p.type === 'human' && !p.isEliminated && p.hasVotedThisRound).length} of {currentRoom.players.filter(p=>p.type === 'human' && !p.isEliminated).length} active human agents have voted.
            </p>
            <Button onClick={handleLeaveRoom} variant="outline" className="w-full text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive mt-4" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />} Abort Mission (Leave)
            </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderResults = () => {
    if (!currentRoom) return <p>Loading results...</p>;

    return (
      <Card className="w-full max-w-lg text-center shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-primary text-3xl font-bold">Debriefing!</CardTitle>
          <CardDescription className="text-md pt-1 text-muted-foreground">Operation: {currentRoom.name} - Round: {(currentRoom.currentQuestionIndex ?? 0) + 1} / {currentRoom.totalRounds}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {votedOutPlayerInRoom ? (
            <>
              <p className="text-xl text-foreground">Agent identified: <span className="font-bold text-accent text-2xl">{votedOutPlayerInRoom.name}</span></p>
              <div className="flex justify-center my-6">
                {votedOutPlayerInRoom.type === 'ai' ? (
                  <CheckCircle className="h-24 w-24 text-green-400 drop-shadow-lg" />
                ) : (
                  <XCircle className="h-24 w-24 text-red-500 drop-shadow-lg" />
                )}
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {votedOutPlayerInRoom.type === 'ai'
                  ? "🎉 Success! The AI Impostor is Neutralized! 🎉"
                  : `Agent ${votedOutPlayerInRoom.name} has been eliminated.`}
              </p>
            </>
          ) : (
            <>
             <AlertTriangle className="h-24 w-24 text-yellow-400 mx-auto my-6 drop-shadow-lg" />
             <p className="text-xl font-semibold text-foreground">Indecisive Outcome! No single agent identified.</p>
             <p className="text-lg text-muted-foreground pt-2">The AI evades detection for another round!</p>
            </>

          )}
           <div className="mt-6 border-t border-border/30 pt-4 space-y-2">
            <h5 className="text-lg font-semibold mb-2 text-accent">Agent Responses & Votes:</h5>
            {currentRoom.players.map(p => (
              <div key={p.uid} className={`text-sm text-left py-2.5 px-3 bg-secondary/50 rounded-md flex justify-between items-center shadow-sm border border-border/30 ${p.isEliminated ? 'opacity-50' : ''}`}>
                <div className="flex items-center">
                 {p.type === 'ai' ? <Bot size={18} className="text-primary mr-2 shrink-0"/> : <User size={18} className="text-green-400 mr-2 shrink-0"/>}
                  <div>
                    <span className="font-medium mr-1.5 text-foreground">{p.name}{p.isEliminated ? ' (Eliminated)' : ''}:</span> <em className="text-muted-foreground">"{p.answer || 'No Data'}"</em>
                  </div>
                </div>
                <span className="font-semibold text-foreground/80">Votes: {p.votesReceived || 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-3 pt-6 border-t border-border/30">
          {currentUser?.uid === currentRoom.hostUid && (
            <Button onClick={handleAdvanceRound} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Continue to Next Round"}
            </Button>
          )}
          {currentUser?.uid !== currentRoom.hostUid && (
             <p className="text-md text-muted-foreground">Awaiting Lead Agent for next steps...</p>
          )}
          <Button onClick={handleLeaveRoom} variant="outline" className="w-full text-muted-foreground hover:border-primary hover:bg-primary/10 hover:text-primary" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} Return to Lobby
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  const renderFinished = () => {
    if (!currentRoom) return <p>Loading results...</p>;
    const aiInRoom = currentRoom.players.find(p => p.type === 'ai');
    const wasAiVotedOut = votedOutPlayerInRoom?.type === 'ai';
    const winnerMessage = wasAiVotedOut ? "Congratulations! The humans have successfully identified the AI." : "Mission Failed. The AI has outsmarted the human agents.";
    
    return (
      <Card className="w-full max-w-lg text-center shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-primary text-3xl font-bold">Game Over!</CardTitle>
          <CardDescription className="text-md pt-1 text-muted-foreground">{winnerMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="flex justify-center my-6">
            {wasAiVotedOut ? (
              <CheckCircle className="h-24 w-24 text-green-400 drop-shadow-lg" />
            ) : (
              <XCircle className="h-24 w-24 text-red-500 drop-shadow-lg" />
            )}
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {wasAiVotedOut ? "Humans Win!" : "AI Wins!"}
          </p>
          {aiInRoom && <p className="text-lg text-muted-foreground pt-2">The AI was <span className="font-semibold text-foreground">{aiInRoom.name}</span>.</p>}
          <div className="mt-6 border-t border-border/30 pt-4 space-y-2">
            <h5 className="text-lg font-semibold mb-2 text-accent">Final Standings:</h5>
            {currentRoom.players.map(p => (
              <div key={p.uid} className={`text-sm text-left py-2.5 px-3 bg-secondary/50 rounded-md flex items-center shadow-sm border border-border/30 ${p.isEliminated ? 'opacity-50' : ''}`}>
                {p.type === 'ai' ? <Bot size={18} className="text-primary mr-2 shrink-0"/> : <User size={18} className="text-green-400 mr-2 shrink-0"/>}
                <span className="font-medium mr-1.5 text-foreground">{p.name}{p.isEliminated ? ' (Eliminated)' : ''}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-3 pt-6 border-t border-border/30">
          {currentUser?.uid === currentRoom.hostUid && (
            <Button onClick={handleStartGameInRoom} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <RefreshCcw className="mr-2 h-6 w-6" />} Play Again
            </Button>
          )}
          {currentUser?.uid !== currentRoom.hostUid && (
             <p className="text-md text-muted-foreground">Awaiting Lead Agent to start a new game...</p>
          )}
          <Button onClick={handleLeaveRoom} variant="outline" className="w-full text-muted-foreground hover:border-primary hover:bg-primary/10 hover:text-primary" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} Return to Lobby
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (gameClientState === 'LOADING' || (loadingAuth && !currentUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
        <Loader2 className="h-24 w-24 text-primary animate-spin" />
        <p className="mt-8 text-2xl text-muted-foreground tracking-wider">Initializing Systems...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (gameClientState) {
      case 'AUTH':
        return renderAuth();
      case 'LOBBY':
        return renderLobby();
      case 'IN_ROOM':
        if (!currentRoom) return renderLobby(); 
        switch (currentRoom.status) {
          case 'WAITING_ROOM':
            return renderWaitingRoom();
          case 'QUESTION_DISPLAY':
            return renderQuestionDisplay();
          case 'ANSWERING':
            return renderAnswering();
          case 'VOTING':
            return renderVoting();
          case 'RESULTS':
            return renderResults();
          case 'FINISHED':
            return renderFinished();
          default: 
             resetGameAndRoom(); 
             return renderLobby();
        }
      default:
        return <p>Unknown client state: {gameClientState}</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30 text-foreground font-sans">
      <header className="my-8 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)] flex items-center justify-center">
          <Bot className="mr-2 md:mr-4 h-12 w-12 md:h-16 md:w-16 text-accent animate-pulse duration-[2500ms]"/> AI Suspect
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-2 italic">Unmask the digital phantom.</p>
      </header>

      <main className="w-full flex flex-col items-center px-2">
        {isLoading && gameClientState !== 'LOADING' && (
            <div className="fixed top-5 right-5 z-50 bg-card/70 backdrop-blur-sm p-2.5 rounded-full shadow-xl">
                <Loader2 className="h-8 w-8 text-primary animate-spin"/>
            </div>
        )}
        {renderContent()}
      </main>

      { gameClientState === 'IN_ROOM' && currentRoom && (currentRoom.status !== 'WAITING_ROOM' && currentRoom.status !== 'LOBBY' ) && (
        <Card className="mt-8 w-full max-w-4xl shadow-xl bg-card/70 backdrop-blur-sm border-border/40">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-lg text-primary flex justify-between items-center">
                <span>Agent Status Monitor - Op: {currentRoom.name}</span>
                <span className="text-sm text-muted-foreground">Round: {currentRoom.currentQuestionIndex + 1} / {currentRoom.totalRounds}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {currentRoom.players.map((p, index) => {
              const isSensitivePhase = currentRoom.status === 'ANSWERING' || currentRoom.status === 'VOTING';
              const displayName = isSensitivePhase ? `Agent ${index + 1}` : p.name;
              const displayAvatarText = isSensitivePhase ? `A${index+1}` : p.name.substring(0,1).toUpperCase();
              const avatarColor = isSensitivePhase ? '9CA3AF' : (p.type === 'ai' ? 'A080A0' : '80A0A0');

              let statusText = <span className="text-muted-foreground">Standby</span>;
              let statusStyle = '';

              if (p.isEliminated) {
                  statusText = <span className="flex items-center text-red-400/90"><XCircle size={14} className="mr-1"/>Eliminated</span>;
                  statusStyle = 'opacity-50';
              } else {
                  switch(currentRoom.status) {
                    case 'ANSWERING':
                        statusText = p.hasAnsweredCurrentQuestion ? <span className="flex items-center text-green-400/90"><Check size={14} className="mr-1"/>Intel Received</span> : <span className="flex items-center text-muted-foreground"><Hourglass size={12} className="mr-1 animate-spin"/>Formulating...</span>;
                        if(p.hasAnsweredCurrentQuestion) statusStyle = 'border-green-500/70 ring-1 ring-green-500/50';
                        break;
                    case 'VOTING':
                        if (p.type === 'human') {
                            statusText = p.hasVotedThisRound ? <span className="flex items-center text-blue-400/90"><CheckCircle size={14} className="mr-1"/>Vote Logged</span> : <span className="flex items-center text-muted-foreground"><VoteIcon size={12} className="mr-1"/>Deliberating...</span>;
                            if(p.hasVotedThisRound) statusStyle = 'border-blue-500/70 ring-1 ring-blue-500/50';
                        } else {
                            statusText = <span className="flex items-center text-muted-foreground"><Brain size={12} className="mr-1"/>Observing...</span>;
                        }
                        break;
                    case 'RESULTS':
                    case 'FINISHED':
                        statusText = p.answer ? <span className="text-foreground/80">Response: "{p.answer}"</span> : <span className="text-muted-foreground italic">No Response</span>;
                        break;
                  }
              }

              return (
                <div key={p.uid} className={`p-3 rounded-lg border bg-secondary/40 shadow-sm transition-opacity ${statusStyle}`}>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Avatar className="h-8 w-8 border border-muted-foreground/20">
                       <AvatarImage src={`https://placehold.co/32x32/${avatarColor}/FFFFFF.png?text=${displayAvatarText}`} data-ai-hint="abstract letter anonymous"/>
                      <AvatarFallback className="text-xs bg-muted">{displayAvatarText}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold truncate text-sm text-foreground/90" title={displayName}>{displayName}</span>
                    {!isSensitivePhase && !p.isEliminated && (p.type === 'ai' ? <Bot size={16} className="text-primary shrink-0" /> : <User size={16} className="text-green-400 shrink-0" />)}
                  </div>
                  <p className="text-xs truncate">{statusText}</p>
                   { (currentRoom.status === 'VOTING' || currentRoom.status === 'RESULTS' || currentRoom.status === 'FINISHED') && <p className="text-xs text-muted-foreground mt-0.5">Votes Rcvd: {p.votesReceived || 0}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
       <footer className="mt-12 mb-6 text-center text-xs text-muted-foreground/80">
        <p>&copy; {new Date().getFullYear()} AI Suspect Initiative. Trust No One.</p>
      </footer>
    </div>
  );
}
