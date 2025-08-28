# AI-Suspect

## Inhalt
- Einleitung
- Technische Umsetzung

## Einleitung

Unsere Projektarbeit beschäftigt sich mit der Entwicklung und Analyse eines Spiels, in dem der Schwerpunkt auf dem Erkennen einer Künstlichen Intelligenz (KI) liegt. Ziel ist es, eine KI zu implementieren, deren Verhalten von den Spieler:innen erkannt und analysiert werden kann. (Turing-Test)

## Technische Umsetzung

Detaillierte Datei- und Funktionsbeschreibung

### 2.1. `src/app/` – Hauptanwendung (Routing & Layout)

#### `layout.tsx`
- **Zweck**: Dies ist das Wurzel-Layout der Anwendung. Jede Seite wird innerhalb dieser Komponente gerendert.  
- **Objekte/Funktionen**:  
  - `geistSans`, `geistMono`: Lädt die Schriftarten für die Anwendung.  
  - `metadata`: Definiert die Metadaten der Seite (z.B. Titel, Beschreibung) für SEO.  
  - `RootLayout` (React-Komponente): Der Haupt-Container, der:
    - den `AuthProvider` umschliesst, um den Authentifizierungsstatus überall verfügbar zu machen.  
    - den `<Toaster />` rendert, um Benachrichtigungen (Toasts) anzuzeigen.  

#### `page.tsx`
- **Zweck**: Die Startseite der Anwendung.  
- **Objekte/Funktionen**:  
  - `HomePage` (React-Komponente): Eine einfache Komponente, die nur die `GameClient`-Komponente rendert. Dies ist der Einstiegspunkt in die eigentliche Spiellogik.  

---

### 2.2. `src/components/game/` – Die Kernlogik des Spiels

#### `GameClient.tsx`
- **Zweck**: Wichtigste Komponente der gesamten Anwendung. Enthält UI- und Client-seitige Logik für das Spiel (Auth, Lobby, Spielphasen).  

- **State-Objekte (`useState`)**:
  - `gameClientState`: (`'AUTH' | 'LOBBY' | 'IN_ROOM' | 'LOADING'`) – bestimmt die Hauptansicht.  
  - `currentRoom`: (`Room | null`) – Daten des aktuellen Spielraums aus Firestore.  
  - `timer`: (`number`) – Countdown für Antwort- oder Abstimmungszeit.  
  - `currentAnswer`: (`string`) – Eingabe des Spielers.  
  - `isLoading`: (`boolean`) – steuert Ladeanzeigen.  

- **Hooks (`useEffect`)**:
  - Überwacht `currentUser` und `currentRoom`, um `gameClientState` korrekt zu setzen.  
  - Echtzeit-Listener (`onSnapshot`) für den aktuellen Raum in Firestore.  
  - Steuern Timer-Logik und Übergänge zwischen Spielphasen.  

- **Handler-Funktionen (Callbacks)**:
  - `handleCreateRoom`: Erstellt neues Raum-Dokument in Firestore.  
  - `handleJoinRoom`: Tritt mit Code einem Raum bei.  
  - `handleLeaveRoom`: Entfernt Spieler; Hostwechsel oder Löschung bei nur KI.  
  - `handleStartGameInRoom`: Setzt Status auf `QUESTION_DISPLAY` → Spielstart.  
  - `handleAnswerSubmitRoom`: Speichert Antwort des Spielers.  
  - `handleVoteRoom`: Erhöht Stimmenzähler des gewählten Spielers.  

- **KI-Logik**:
  - `useEffect`: In der Phase `ANSWERING` wird `getReasoningAnswer` aus dem AI-Flow aufgerufen → Antwort der KI wird gespeichert.  

- **Render-Funktionen**:
  - `renderAuth()`, `renderLobby()`, `renderWaitingRoom()`,  
    `renderQuestionDisplay()`, `renderAnswering()`, `renderVoting()`, `renderResults()`  
  - `renderContent()`: Wählt basierend auf `gameClientState` und `currentRoom.status` die passende Render-Funktion.  

---

### 2.3. `src/ai/` – Künstliche Intelligenz

#### `genkit.ts`
- **Zweck**: Konfiguration & Initialisierung von Genkit.  
- **Objekte**:
  - `ai`: Zentrale Genkit-Instanz mit `googleAI`-Plugin. Standardmodell (z.B. `googleai/gemini-2.0-flash`).  

#### `flows/reasoning-answer.ts`
- **Zweck**: Definiert die gesamte Logik für KI-Antworten.  
- **Objekte/Funktionen**:
  - `ReasoningAnswerInputSchema` / `ReasoningAnswerOutputSchema` (Zod-Schemata): Struktur für Eingabe (Frage, Beispiele) & Ausgabe (Antwort).  
  - `getReasoningAnswer`: Exportierte Funktion, ruft `reasoningAnswerFlow` auf.  
  - `prompt`: Vorlage mit genauen Regeln (z.B. „nur ein Wort“, „zur Kategorie passend“).  
  - `reasoningAnswerFlow`: Wrapper um den Prompt, leitet Eingabe weiter, gibt Ausgabe zurück.  

---

### 2.4. `src/lib/` & `src/contexts/` – Hilfsmodule und Kontext

#### `lib/firebase.ts`
- **Zweck**: Initialisierung der Firebase-App & Export der Dienste.  
- **Objekte**:
  - `app`: Firebase-App-Instanz.  
  - `auth`: Authentifizierungsdienst.  
  - `db`: Firestore-Dienst.  

#### `lib/questions.ts`
- **Zweck**: Liste von Fragen (Array von Strings).  

#### `contexts/AuthContext.tsx`
- **Zweck**: Authentifizierungszustand & Funktionen bereitstellen.  
- **Objekte/Funktionen**:
  - `AuthContext` (React Context).  
  - `AuthProvider` (Komponente) – stellt `value` bereit.  
  - `useAuth` (Hook).  
  - `value`: Enthält `currentUser`, `loadingAuth`, `signInWithGoogle`, `signOutUser`, etc.  

---

### 2.5. `src/types/` – Datentypen

#### `game.ts`
- **Zweck**: Zentrale Typdefinitionen für das Spiel.  
- **Typen**:
  - `PlayerType`: `'human' | 'ai'`  
  - `Player`: Grundstruktur eines Spielers.  
  - `RoomPlayer`: Spieler mit spielspezifischen Feldern (`answer`, `hasVotedThisRound`).  
  - `RoomStatus`: Zustände eines Spielraums (`'LOBBY'`, `'ANSWERING'`, etc.).  
  - `Room`: Vollständige Struktur eines Firestore-Dokuments in `rooms`.  

---

### 3. Konfigurationsdateien (Wurzelverzeichnis)

- **`package.json`**: Projekt-Metadaten, Scripts (`dev`, `build`), Abhängigkeiten (`next`, `react`, `firebase`, `genkit`).  
- **`netlify.toml`**: Hosting-Konfiguration für Netlify (`command = "npm run build"`, `publish = ".next"`).  
- **`tailwind.config.ts`**: Tailwind-Konfiguration (Farben, Schriftarten, Animationen).  
- **`next.config.ts`**: Next.js-Konfiguration (z.B. TypeScript- und ESLint-Optionen).  
