# Testdokumentation: AI Suspect

Dieses Dokument enthält die Ergebnisse des End-to-End-Tests und des Abnahmetests für das Spiel "AI Suspect".

---

## End-to-End-Test (E2E)

**Spielname:** AI Suspect
**Ziel:** Spieler müssen durch Textnachrichten herausfinden, welcher Mitspieler eine KI ist.
**Testziel:** Überprüfung, ob das gesamte Spiel von der Anmeldung bis zur KI-Enttarnung reibungslos funktioniert und benutzerfreundlich ist.

### Testperson

- **Rolle:** Entwickler
- **Testumgebung:** Firefox Browser, Windows 11
- **Version:** Spielversion 1.0

### Testschritte und Beobachtungen

#### Phase 1: Einstieg / Spielbeitritt

| Schritt | Erwartetes Ergebnis                                  | Ergebnis    | Bemerkung                                                                                                   |
| :------ | :--------------------------------------------------- | :---------- | :---------------------------------------------------------------------------------------------------------- |
| 1.1     | Nutzer kann sich per E-Mail/Passwort anmelden.       | Erfolgreich | Anmeldung per E-Mail funktioniert einwandfrei.                                                              |
| 1.2     | Nutzer kann sich per Google anmelden.                | Fehlerhaft  | Google-Anmeldung schlägt fehl. (Bekanntes Problem, wird vorerst nicht behoben, da E-Mail als Workaround dient). |
| 1.3     | Nutzer kann einen neuen Raum erstellen (öffentlich/privat). | Erfolgreich | Die Erstellung von Räumen und die Wahl zwischen öffentlich und privat funktioniert.                         |
| 1.4     | Nutzer kann einem privaten Raum per Code beitreten.  | Erfolgreich | Der Beitritt über den Game Code funktioniert wie erwartet.                                                   |
| 1.5     | Nutzer kann öffentliche Räume in der Lobby sehen.    | Erfolgreich | Öffentliche Räume werden korrekt angezeigt.                                                                 |
| 1.6     | Nutzer kann einem öffentlichen Raum beitreten.        | Erfolgreich | Der direkte Beitritt zu öffentlichen Räumen ist möglich.                                                    |

#### Phase 2: Spielablauf

| Schritt | Erwartetes Ergebnis                               | Ergebnis    | Bemerkung                                                              |
| :------ | :------------------------------------------------ | :---------- | :--------------------------------------------------------------------- |
| 2.1     | Host kann das Spiel starten, wenn genug Spieler da sind. | Erfolgreich | Spielstart funktioniert wie erwartet.                                  |
| 2.2     | Die aktuelle Frage wird allen Spielern angezeigt. | Erfolgreich | Fragen werden synchron für alle Spieler angezeigt.                       |
| 2.3     | Spieler können ihre Antworten eingeben und absenden. | Erfolgreich | Die Eingabe und Übermittlung von Antworten funktioniert reibungslos.     |
| 2.4     | KI generiert eine passende Antwort.               | Erfolgreich | Die KI-Antworten passen zur Persona und den Regeln.                      |

#### Phase 3: Abstimmung und Ergebnis

| Schritt | Erwartetes Ergebnis                                     | Ergebnis    | Bemerkung                                                                    |
| :------ | :------------------------------------------------------ | :---------- | :--------------------------------------------------------------------------- |
| 3.1     | Antworten werden in zufälliger Reihenfolge angezeigt. | Erfolgreich | Randomisierung funktioniert und erhöht die Schwierigkeit.                   |
| 3.2     | Spieler können für einen anderen Spieler stimmen.       | Erfolgreich | Abstimmung per Klick funktioniert.                                           |
| 3.3     | Ergebnis der Abstimmung wird korrekt angezeigt.         | Erfolgreich | Der Spieler mit den meisten Stimmen wird korrekt identifiziert.              |
| 3.4     | Das Spiel endet, wenn die KI enttarnt wird.             | Erfolgreich | Die Siegbedingung für Menschen funktioniert.                                 |
| 3.5     | Das Spiel endet, wenn alle Runden gespielt sind und die KI nicht enttarnt wurde. | Erfolgreich | Die Siegbedingung für die KI funktioniert. |
| 3.6     | Ein Spieler, der rausgewählt wird, wird eliminiert.   | Erfolgreich | Eliminierte Spieler können nicht mehr teilnehmen.                            |
| 3.7     | Möglichkeit zum Neustart / Zurück zur Lobby nach Spielende. | Erfolgreich | Neustart und Verlassen des Raumes sind problemlos möglich.                   |

### Fazit (E2E)

Der E2E-Test verlief insgesamt erfolgreich. Das Spiel ist in seinen Kernfunktionen stabil, intuitiv bedienbar und erfüllt den Spielzweck. Das bekannte Problem mit dem Google-Login bleibt bestehen, wird aber aufgrund der funktionierenden E-Mail-Alternative vorerst als nachrangig eingestuft.

---

## Abnahmetest (Acceptance Test)

**Ziel:** Eine fremde Person (nicht aus dem Entwicklungsteam) kann das Spiel ohne Anleitung problemlos spielen und verstehen.
**Testperson:** Externe Testperson ohne Vorkenntnisse des Projekts.

### Ergebnisse

| Testpunkt              | Bewertung      | Kommentar                                                                                                         |
| :--------------------- | :------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Design & UI**        | Positiv        | Das Design wurde als "cool", "übersichtlich" und "ansprechend" beschrieben. Die Navigation war selbsterklärend.     |
| **Einstieg & Lobby**   | Überwiegend Positiv | Der Testproband fand die Option, öffentliche Räume zu sehen und ihnen beizutreten, sehr gut. Die manuelle Eingabe des 5-stelligen Codes für private Räume wurde als "etwas umständlich" empfunden. Ein "Kopieren"-Button für den Code wurde positiv vermerkt. |
| **Spielablauf**        | Positiv        | Das Spielprinzip wurde sofort verstanden. Die Runden waren kurzweilig und die Fragen wurden als witzig empfunden.   |
| **KI-Verhalten**       | Positiv        | Die KI wurde als "schwer zu durchschauen" und "glaubwürdig" beschrieben. Die Antworten waren oft subtil genug, um nicht sofort aufzufallen. |
| **Google-Anmeldung**   | Fehlerhaft     | Der Testproband versuchte zuerst die Google-Anmeldung, die fehlschlug. Er wechselte dann zur E-Mail-Anmeldung.        |

### Verbesserungsvorschläge des Testers

- **Beitritts-Link:** Anstelle eines Codes für private Räume wäre ein direkter Einladungslink wünschenswert, den man teilen kann.
- **Soundeffekte:** Optionale, subtile Soundeffekte (z.B. beim Absenden einer Antwort oder am Ende einer Runde) könnten die Spielerfahrung verbessern.
- **Fehlermeldung bei Google-Login:** Eine klarere Fehlermeldung oder das vorübergehende Ausblenden der Google-Login-Option, bis der Fehler behoben ist.

### Fazit (Abnahmetest)

Der Abnahmetest war erfolgreich. Die Testperson konnte das Spiel ohne Hilfe spielen und hatte Spaß dabei. Die Kernmechanik ist verständlich und motivierend. Die Hauptkritikpunkte sind der fehlerhafte Google-Login und die Verbesserung der Benutzerfreundlichkeit beim Teilen von privaten Räumen.

---

## Technischer Systemtest

**Ziel:** Überprüfung der technischen Kernfunktionen, der Datenkonsistenz in Firestore und der korrekten Zustandsübergänge (State Machine).

### Phase 1: Raum- und Spieler-Management (Firestore-Interaktion)

| Schritt | Erwartetes Ergebnis                                                                 | Ergebnis    | Bemerkung                                                                         |
| :------ | :---------------------------------------------------------------------------------- | :---------- | :-------------------------------------------------------------------------------- |
| 1.1     | Erstellen eines Raumes (Host).                                                      | Erfolgreich | Ein neues Dokument wird in der `rooms`-Collection in Firestore korrekt angelegt. Das `players`-Array enthält Host und KI. |
| 1.2     | Ein zweiter menschlicher Spieler tritt einem Raum bei.                               | Erfolgreich | Das `players`-Array im Firestore-Dokument wird in Echtzeit mit dem neuen Spieler aktualisiert. Alle Clients sehen den neuen Spieler. |
| 1.3     | Ein Spieler verlässt einen Raum.                                                    | Erfolgreich | Der Spieler wird aus dem `players`-Array entfernt. Die UI aller verbleibenden Spieler wird aktualisiert. |
| 1.4     | Der Host verlässt einen Raum mit anderen menschlichen Spielern.                       | Erfolgreich | Der `hostUid` wird an den nächsten menschlichen Spieler in der Liste übergeben. Der alte Host wird aus dem `players`-Array entfernt. |
| 1.5     | Der letzte menschliche Spieler verlässt einen Raum.                                 | Erfolgreich | Das Firestore-Dokument des Raumes wird automatisch gelöscht, um Datenmüll zu vermeiden. |

### Phase 2: Spiel-Zustandsautomaten (State Machine)

| Schritt | Erwartetes Ergebnis                                                                 | Ergebnis    | Bemerkung                                                                         |
| :------ | :---------------------------------------------------------------------------------- | :---------- | :-------------------------------------------------------------------------------- |
| 2.1     | Host startet das Spiel.                                                             | Erfolgreich | Der Raumstatus (`status`) wechselt von `WAITING_ROOM` zu `QUESTION_DISPLAY`.       |
| 2.2     | Automatischer Übergang nach der Fragenanzeige.                                        | Erfolgreich | Nach Ablauf des Timers wechselt `status` zu `ANSWERING`.                         |
| 2.3     | Übergang zur Abstimmung, nachdem alle geantwortet haben.                              | Erfolgreich | Sobald alle aktiven Spieler (`isEliminated: false`) geantwortet haben, wechselt `status` zu `VOTING`. |
| 2.4     | Übergang zu den Ergebnissen, nachdem alle abgestimmt haben.                           | Erfolgreich | Sobald alle aktiven menschlichen Spieler abgestimmt haben, wechselt `status` zu `RESULTS`. |
| 2.5     | Übergang zur nächsten Runde aus den Ergebnissen.                                      | Erfolgreich | Wenn der Host auf "Weiter" klickt, wechselt `status` zurück zu `QUESTION_DISPLAY` und die Spielerdaten werden zurückgesetzt. |
| 2.6     | Spielende durch Enttarnung der KI.                                                  | Erfolgreich | Wenn die KI rausgewählt wird, wechselt `status` direkt zu `FINISHED`.             |
| 2.7     | Spielende nach der letzten Runde.                                                   | Erfolgreich | Nach der letzten Runde wechselt `status` zu `FINISHED`.                           |

### Phase 3: KI-Interaktion (Genkit Flow)

| Schritt | Erwartetes Ergebnis                                                                 | Ergebnis    | Bemerkung                                                                         |
| :------ | :---------------------------------------------------------------------------------- | :---------- | :-------------------------------------------------------------------------------- |
| 3.1     | KI-Antwort wird angefordert.                                                        | Erfolgreich | Der `getReasoningAnswer`-Flow wird ausgelöst. Das Genkit-Modell gibt eine Antwort (1-3 Wörter) zurück, die der Persona entspricht. |
| 3.2     | KI-Antwort wird in Firestore gespeichert.                                             | Erfolgreich | Die Antwort der KI wird korrekt in das `answer`-Feld des KI-Spielerobjekts im `players`-Array eingetragen. |
| 3.3     | Fallback bei KI-Fehler.                                                             | Erfolgreich | Wenn der Genkit-Flow fehlschlägt, wird eine Standardantwort ("Bleep.") in Firestore eingetragen, um das Spiel nicht zu blockieren. |

### Phase 4: Spielmechanik & Randfälle

| Schritt | Erwartetes Ergebnis                                                                 | Ergebnis    | Bemerkung                                                                         |
| :------ | :---------------------------------------------------------------------------------- | :---------- | :-------------------------------------------------------------------------------- |
| 4.1     | Ein Spieler wird eliminiert.                                                        | Erfolgreich | Das `isEliminated`-Flag des Spielers wird in Firestore auf `true` gesetzt. Der Spieler kann nicht mehr antworten oder abstimmen. |
| 4.2     | Abstimmung endet unentschieden (Gleichstand).                                       | Erfolgreich | Kein Spieler wird eliminiert. Das Spiel geht normal in die nächste Runde über.    |
| 4.3     | Antworten werden bei der Abstimmung zufällig sortiert.                                | Erfolgreich | Die Reihenfolge der angezeigten Antworten in der `VOTING`-Phase ist bei jeder Runde anders und nicht an die Spielerliste gebunden. |
| 4.4     | Verlassen des Spiels während einer aktiven Runde.                                     | Erfolgreich | Das Spiel wird für die verbleibenden Spieler nicht unterbrochen. Der verlassende Spieler wird entfernt, und die Logik passt sich an. |
