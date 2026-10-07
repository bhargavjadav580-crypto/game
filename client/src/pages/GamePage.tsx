import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { soundManager } from '../utils/sound';
import '../styles/buttons.css';
import './GamePage.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    snapshot,
    connected,
    submitAnswer,
    startGame,
    requestRematch,
    leaveRoom,
    rejoinRoom,
    toast,
  } = useSocket();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  // Attempt rejoin if no active snapshot
  useEffect(() => {
    if (!snapshot) {
      const storedRoom = localStorage.getItem('qlyvora_room');
      const storedToken = localStorage.getItem('qlyvora_token');
      if (storedRoom && storedToken && storedRoom === code) {
        rejoinRoom(storedRoom, storedToken).then((res) => {
          if (!res.ok) {
            navigate('/join');
          }
        });
      } else {
        navigate('/join');
      }
    }
  }, [snapshot, code, navigate, rejoinRoom]);

  // Reset selected option whenever questionIndex changes
  useEffect(() => {
    setSelectedOption(null);
    setSubmitting(false);
  }, [snapshot?.questionIndex]);

  // Timer countdown computed from endsAt and clock offset
  useEffect(() => {
    if (!snapshot?.endsAt) {
      setTimeLeftMs(0);
      return;
    }

    const clockOffset = Date.now() - snapshot.serverNow;

    const updateTimer = () => {
      const estimatedServerNow = Date.now() - clockOffset;
      const remaining = Math.max(0, (snapshot.endsAt ?? 0) - estimatedServerNow);
      setTimeLeftMs(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 50);
    return () => clearInterval(interval);
  }, [snapshot?.endsAt, snapshot?.serverNow]);

  // Keyboard shortcut listener (1-4 and A-D)
  useEffect(() => {
    if (snapshot?.phase !== 'QUESTION_ACTIVE') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedOption !== null || submitting) return;
      let optIdx: number | null = null;
      if (e.key === '1' || e.key.toLowerCase() === 'a') optIdx = 0;
      if (e.key === '2' || e.key.toLowerCase() === 'b') optIdx = 1;
      if (e.key === '3' || e.key.toLowerCase() === 'c') optIdx = 2;
      if (e.key === '4' || e.key.toLowerCase() === 'd') optIdx = 3;

      if (optIdx !== null && snapshot.currentQuestion) {
        handleSelectOption(optIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapshot?.phase, snapshot?.currentQuestion, selectedOption, submitting]);

  const selfPlayer = useMemo(() => {
    return snapshot?.players.find((p) => p.id === snapshot.selfId);
  }, [snapshot?.players, snapshot?.selfId]);

  const isHost = selfPlayer?.isHost ?? false;

  // Trigger sound effects on phase change
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.phase === 'STARTING') {
      soundManager.playCountdownTick();
    } else if (snapshot.phase === 'REVEAL') {
      const myAnswer = selfPlayer?.currentAnswer;
      if (myAnswer) {
        if (myAnswer.correct) {
          soundManager.playCorrect();
        } else {
          soundManager.playWrong();
        }
      } else {
        soundManager.playTimeUp();
      }
    } else if (snapshot.phase === 'FINISHED') {
      soundManager.playWinner();
    }
  }, [snapshot?.phase, selfPlayer?.currentAnswer]);

  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  const handleSelectOption = async (index: number) => {
    if (selectedOption !== null || submitting || !snapshot?.currentQuestion) return;
    setSelectedOption(index);
    setSubmitting(true);
    soundManager.playSelect();

    try {
      await submitAnswer(snapshot.currentQuestion.id, index);
    } catch {
      // Revert if socket failed
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
    localStorage.removeItem('qlyvora_room');
    localStorage.removeItem('qlyvora_token');
    navigate('/');
  };

  if (!snapshot) {
    return (
      <main className="game-container">
        <div className="game-card text-center">
          <p className="loading-text">Connecting to game session…</p>
        </div>
      </main>
    );
  }

  // 1. COUNTDOWN / STARTING PHASE
  if (snapshot.phase === 'STARTING') {
    const countdownSec = Math.max(1, Math.ceil(timeLeftMs / 1000));
    return (
      <main className="game-container">
        <div className="countdown-card">
          <p className="countdown-subtitle">GET READY!</p>
          <div className="countdown-number" key={countdownSec}>
            {countdownSec}
          </div>
          <p className="countdown-hint">Game is starting…</p>
        </div>
      </main>
    );
  }

  // 2. QUESTION ACTIVE PHASE
  if (snapshot.phase === 'QUESTION_ACTIVE') {
    const q = snapshot.currentQuestion;
    const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / 8000) * 100));
    const secondsRemaining = (timeLeftMs / 1000).toFixed(1);

    return (
      <main className="game-container">
        <div className="game-wrapper">
          {!connected && <div className="connection-banner">Reconnecting…</div>}

          <div className="game-header">
            <span className="question-category">{q?.category || 'General Knowledge'}</span>
            <div className="game-header-actions">
              <button
                type="button"
                className="mute-btn"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <span className="question-badge">
                Question {(snapshot.questionIndex ?? 0) + 1} of {snapshot.totalQuestions}
              </span>
            </div>
          </div>

          <div className="timer-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`timer-bar ${timeLeftMs < 2500 ? 'timer-danger' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="timer-text" aria-live="polite">
            ⏱️ {secondsRemaining}s
          </div>

          <div className="question-box">
            <h1 className="question-title">{q?.text}</h1>
          </div>

          <div className="options-grid">
            {q?.options.map((opt, idx) => {
              const isSelected = selectedOption === idx || (selfPlayer?.hasAnswered && selectedOption === idx);
              return (
                <button
                  key={idx}
                  className={`option-btn ${isSelected ? 'option-selected' : ''}`}
                  onClick={() => handleSelectOption(idx)}
                  disabled={selectedOption !== null || selfPlayer?.hasAnswered}
                  aria-pressed={isSelected}
                >
                  <span className="option-badge">{OPTION_LETTERS[idx]}</span>
                  <span className="option-label">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="status-footer" aria-live="polite">
            {selfPlayer?.hasAnswered || selectedOption !== null ? (
              <span className="status-locked">✓ Answer locked — waiting for others…</span>
            ) : timeLeftMs <= 0 ? (
              <span className="status-timeout">Time's Up!</span>
            ) : (
              <span className="status-waiting">Choose your answer fast for higher points!</span>
            )}
          </div>
        </div>
      </main>
    );
  }

  // 3. REVEAL PHASE
  if (snapshot.phase === 'REVEAL') {
    const q = snapshot.currentQuestion;
    const myAnswer = selfPlayer?.currentAnswer;
    const wasCorrect = myAnswer?.correct;

    return (
      <main className="game-container">
        <div className="game-wrapper">
          <div className="game-header">
            <span className="question-badge">Reveal</span>
            <span className="question-category">{q?.category}</span>
          </div>

          <div className="question-box">
            <h2 className="question-title">{q?.text}</h2>
          </div>

          <div className="options-grid">
            {q?.options.map((opt, idx) => {
              const isCorrectOpt = idx === snapshot.correctIndex;
              const isMyChoice = myAnswer?.optionIndex === idx;

              let statusClass = '';
              if (isCorrectOpt) statusClass = 'option-correct';
              else if (isMyChoice && !isCorrectOpt) statusClass = 'option-wrong';

              return (
                <div key={idx} className={`option-btn ${statusClass}`}>
                  <span className="option-badge">{OPTION_LETTERS[idx]}</span>
                  <span className="option-label">{opt}</span>
                  {isCorrectOpt && <span className="option-icon">✓</span>}
                  {isMyChoice && !isCorrectOpt && <span className="option-icon">✗</span>}
                </div>
              );
            })}
          </div>

          <div className="reveal-feedback" aria-live="assertive">
            {myAnswer ? (
              wasCorrect ? (
                <div className="feedback-correct">
                  🎉 Correct! +{myAnswer.scoreGained} pts
                </div>
              ) : (
                <div className="feedback-wrong">❌ Incorrect (+0 pts)</div>
              )
            ) : (
              <div className="feedback-timeout">⏰ Time expired (+0 pts)</div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // 4. SCOREBOARD PHASE
  if (snapshot.phase === 'SCOREBOARD') {
    const sorted = [...snapshot.players].sort((a, b) => b.score - a.score);

    return (
      <main className="game-container">
        <div className="scoreboard-wrapper">
          <h1 className="scoreboard-title">Leaderboard</h1>
          <p className="scoreboard-subtitle">
            Round {(snapshot.questionIndex ?? 0) + 1} of {snapshot.totalQuestions}
          </p>

          <div className="leaderboard-list">
            {sorted.map((p, idx) => {
              const isMe = p.id === snapshot.selfId;
              return (
                <div key={p.id} className={`leaderboard-item ${isMe ? 'leaderboard-self' : ''}`}>
                  <span className="rank-num">#{idx + 1}</span>
                  <div className="player-meta">
                    <span className="player-display-name">
                      {p.name} {isMe && '(You)'}
                    </span>
                    {p.currentAnswer?.scoreGained ? (
                      <span className="pts-delta">+{p.currentAnswer.scoreGained} pts</span>
                    ) : null}
                  </div>
                  <span className="player-score-tag">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // 5. FINISHED / RESULTS PHASE
  if (snapshot.phase === 'FINISHED') {
    const sorted = [...snapshot.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
      return a.totalAnswerTimeMs - b.totalAnswerTimeMs;
    });

    const winner = sorted[0];

    return (
      <main className="game-container">
        <div className="results-wrapper">
          <div className="winner-podium">
            <span className="winner-trophy" aria-hidden="true">🏆</span>
            <p className="winner-caption">CHAMPION</p>
            <h1 className="winner-name">{winner?.name}</h1>
            <p className="winner-score">{winner?.score} Points</p>
          </div>

          <div className="final-ranks">
            <h2 className="final-ranks-heading">Final Standings</h2>
            <div className="leaderboard-list">
              {sorted.map((p, idx) => {
                const isMe = p.id === snapshot.selfId;
                return (
                  <div key={p.id} className={`leaderboard-item ${isMe ? 'leaderboard-self' : ''}`}>
                    <span className="rank-num">#{idx + 1}</span>
                    <span className="player-display-name">
                      {p.name} {isMe && '(You)'}
                    </span>
                    <div className="player-details">
                      <span className="accuracy-badge">{p.totalCorrect}/10 correct</span>
                      <span className="player-score-tag">{p.score} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="results-actions">
            {isHost ? (
              <button className="btn btn-primary btn-lg btn-block" onClick={() => requestRematch()}>
                🔄 Play Again
              </button>
            ) : (
              <p className="waiting-rematch">Waiting for host to restart game…</p>
            )}
            <button className="btn btn-secondary btn-block" onClick={handleLeave}>
              Leave Room
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
