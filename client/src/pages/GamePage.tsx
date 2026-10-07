import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n';
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
    requestRematch,
    leaveRoom,
    rejoinRoom,
  } = useSocket();
  const { t, lang, setLang } = useTranslation();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  // Automatically sync client language with room language when room loads
  useEffect(() => {
    if (snapshot?.language && snapshot.language !== lang) {
      setLang(snapshot.language);
    }
  }, [snapshot?.language, lang, setLang]);

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
      soundManager.play('countdown');
    } else if (snapshot.phase === 'QUESTION_ACTIVE') {
      soundManager.play('question');
    } else if (snapshot.phase === 'REVEAL') {
      const myAnswer = selfPlayer?.currentAnswer;
      if (myAnswer?.correct) {
        soundManager.play('correct');
      } else {
        soundManager.play('wrong');
      }
    } else if (snapshot.phase === 'FINISHED') {
      soundManager.play('gameover');
    }
  }, [snapshot?.phase, selfPlayer?.currentAnswer]);

  const handleSelectOption = async (optionIndex: number) => {
    if (
      selectedOption !== null ||
      submitting ||
      snapshot?.phase !== 'QUESTION_ACTIVE' ||
      !snapshot.currentQuestion
    ) {
      return;
    }

    setSelectedOption(optionIndex);
    setSubmitting(true);
    soundManager.play('click');

    const result = await submitAnswer(snapshot.currentQuestion.id, optionIndex);
    if (!result.ok) {
      console.error('Answer submission failed:', result.error);
    }
    setSubmitting(false);
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleLeave = async () => {
    await leaveRoom();
    localStorage.removeItem('qlyvora_room');
    localStorage.removeItem('qlyvora_token');
    navigate('/');
  };

  if (!snapshot) {
    return (
      <main className="page-center">
        <div className="form-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('lobby.reconnecting')}</p>
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
          <p className="countdown-subtitle">{t('game.getReady')}</p>
          <div className="countdown-number" key={countdownSec}>
            {countdownSec}
          </div>
          <p className="countdown-hint">{t('game.startingIn')}</p>
        </div>
      </main>
    );
  }

  // 2. QUESTION ACTIVE PHASE
  if (snapshot.phase === 'QUESTION_ACTIVE') {
    const q = snapshot.currentQuestion;
    const totalDuration = snapshot.questionTimeMs || 15000;
    const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / totalDuration) * 100));
    const secondsRemaining = (timeLeftMs / 1000).toFixed(1);

    return (
      <main className="game-container">
        <div className="game-wrapper">
          {!connected && <div className="connection-banner">{t('lobby.reconnecting')}</div>}

          <div className="game-header">
            <span className="question-category">
              {q?.category ? (t(`category.${q.category.toLowerCase()}`) !== `category.${q.category.toLowerCase()}` ? t(`category.${q.category.toLowerCase()}`) : q.category) : t('category.mix')}
            </span>
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
                {t('game.round', {
                  current: (snapshot.questionIndex ?? 0) + 1,
                  total: snapshot.totalQuestions,
                })}
              </span>
            </div>
          </div>

          <div className="timer-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`timer-bar ${timeLeftMs < 3000 ? 'timer-danger' : ''}`}
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
              <span className="status-locked">{t('game.answered')}</span>
            ) : timeLeftMs <= 0 ? (
              <span className="status-timeout">{t('game.timesUp')}</span>
            ) : (
              <span className="status-waiting">{t('app.tagline')}</span>
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
            <span className="question-badge">{t('game.round', { current: (snapshot.questionIndex ?? 0) + 1, total: snapshot.totalQuestions })}</span>
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
                  {t('game.correct')} +{myAnswer.scoreGained} {t('game.points')}
                </div>
              ) : (
                <div className="feedback-wrong">
                  {t('game.wrong')} (+0 {t('game.points')})
                </div>
              )
            ) : (
              <div className="feedback-timeout">⏰ {t('game.timesUp')} (+0 {t('game.points')})</div>
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
          <h1 className="scoreboard-title">{t('game.leaderboard')}</h1>
          <p className="scoreboard-subtitle">
            {t('game.round', {
              current: (snapshot.questionIndex ?? 0) + 1,
              total: snapshot.totalQuestions,
            })}
          </p>

          <div className="leaderboard-list">
            {sorted.map((p, idx) => {
              const isMe = p.id === snapshot.selfId;
              return (
                <div key={p.id} className={`leaderboard-item ${isMe ? 'leaderboard-self' : ''}`}>
                  <span className="rank-num">#{idx + 1}</span>
                  <div className="player-meta">
                    <span className="player-display-name">
                      {p.name} {isMe && t('lobby.you')}
                    </span>
                    {p.currentAnswer?.scoreGained ? (
                      <span className="pts-delta">+{p.currentAnswer.scoreGained} {t('game.points')}</span>
                    ) : null}
                  </div>
                  <span className="player-score-tag">{p.score} {t('game.points')}</span>
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
            <p className="winner-caption">{t('game.winner')}</p>
            <h1 className="winner-name">{winner?.name}</h1>
            <p className="winner-score">{winner?.score} {t('game.points')}</p>
          </div>

          <div className="final-ranks">
            <h2 className="final-ranks-heading">{t('game.finalLeaderboard')}</h2>
            <div className="leaderboard-list">
              {sorted.map((p, idx) => {
                const isMe = p.id === snapshot.selfId;
                return (
                  <div key={p.id} className={`leaderboard-item ${isMe ? 'leaderboard-self' : ''}`}>
                    <span className="rank-num">#{idx + 1}</span>
                    <span className="player-display-name">
                      {p.name} {isMe && t('lobby.you')}
                    </span>
                    <div className="player-details">
                      <span className="accuracy-badge">
                        {p.totalCorrect}/{snapshot.totalQuestions} {t('game.correct')}
                      </span>
                      <span className="player-score-tag">{p.score} {t('game.points')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="results-actions">
            {isHost ? (
              <button className="btn btn-primary btn-lg btn-block" onClick={() => requestRematch()}>
                {t('btn.playAgain')}
              </button>
            ) : (
              <p className="waiting-rematch">{t('lobby.waitingHost')}</p>
            )}
            <button className="btn btn-secondary btn-block" onClick={handleLeave}>
              {t('btn.leave')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
