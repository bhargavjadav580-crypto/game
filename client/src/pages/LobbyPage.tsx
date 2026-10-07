import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n';
import '../styles/buttons.css';
import './LobbyPage.css';

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { snapshot, connected, startGame, leaveRoom, rejoinRoom, toast } = useSocket();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // If no snapshot and we have stored session, try rejoin
  useEffect(() => {
    if (!snapshot) {
      const storedRoom = localStorage.getItem('qlyvora_room');
      const storedToken = localStorage.getItem('qlyvora_token');
      if (storedRoom && storedToken && storedRoom === code) {
        rejoinRoom(storedRoom, storedToken).then((res) => {
          if (!res.ok) {
            localStorage.removeItem('qlyvora_room');
            localStorage.removeItem('qlyvora_token');
            navigate('/join');
          }
        });
      } else {
        navigate('/join');
      }
    }
  }, [snapshot, code, navigate, rejoinRoom]);

  // Navigate to game view if game starts
  useEffect(() => {
    if (snapshot && snapshot.phase !== 'WAITING') {
      navigate(`/game/${code}`);
    }
  }, [snapshot?.phase, code, navigate]);

  if (!snapshot || snapshot.phase !== 'WAITING') {
    return (
      <main className="page-center">
        <div className="form-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('lobby.reconnecting')}</p>
        </div>
      </main>
    );
  }

  const selfPlayer = snapshot.players.find(p => p.id === snapshot.selfId);
  const isHost = selfPlayer?.isHost ?? false;
  const connectedCount = snapshot.players.filter(p => p.connected).length;
  const canStart = isHost && connectedCount >= 2;

  const shareUrl = `${window.location.origin}/join?room=${snapshot.roomCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = snapshot.roomCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Qlyvora game!',
          text: `Join my quiz game on Qlyvora! Room code: ${snapshot.roomCode}`,
          url: shareUrl,
        });
      } catch {
        // cancelled
      }
    } else {
      await handleCopyCode();
    }
  };

  const handleStart = async () => {
    const result = await startGame();
    if (!result.ok) {
      console.error('Failed to start game:', result.error);
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
    localStorage.removeItem('qlyvora_room');
    localStorage.removeItem('qlyvora_token');
    navigate('/');
  };

  const missingPlayers = Math.max(0, 2 - connectedCount);

  return (
    <main className="lobby">
      <div className="lobby-content">
        {/* Connection indicator */}
        {!connected && (
          <div className="connection-banner" role="alert">
            {t('lobby.reconnecting')}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast.message}
          </div>
        )}

        {/* Room code header */}
        <div className="lobby-header">
          <p className="lobby-label">{t('lobby.roomCode')}</p>
          <h1 className="lobby-code" aria-label={`Room code: ${snapshot.roomCode.split('').join(' ')}`}>
            {snapshot.roomCode}
          </h1>
          <div className="lobby-share-actions">
            <button className="btn btn-secondary" onClick={handleCopyCode}>
              {copied ? t('btn.copied') : t('btn.copyCode')}
            </button>
            <button className="btn btn-secondary" onClick={handleShare}>
              {t('btn.share')}
            </button>
          </div>
        </div>

        {/* Room Match Settings Summary */}
        <div className="lobby-settings-bar" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          fontSize: '0.85rem'
        }}>
          <span className="badge" style={{ background: '#4f46e5', color: '#fff' }}>
            {snapshot.category ? t(`category.${snapshot.category}`) : t('category.mix')}
          </span>
          <span className="badge" style={{ background: '#0284c7', color: '#fff' }}>
            {snapshot.difficulty ? t(`difficulty.${snapshot.difficulty}`) : t('difficulty.all')}
          </span>
          <span className="badge" style={{ background: '#059669', color: '#fff' }}>
            {snapshot.totalQuestions || snapshot.questionCount || 10} {t('label.questions')}
          </span>
          <span className="badge" style={{ background: '#d97706', color: '#fff' }}>
            ⏱️ {snapshot.questionTimeMs ? snapshot.questionTimeMs / 1000 : 15}s
          </span>
          <span className="badge" style={{ background: '#7c3aed', color: '#fff' }}>
            {snapshot.language === 'hi' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}
          </span>
        </div>

        {/* Player list */}
        <div className="lobby-players">
          <h2 className="lobby-players-title">
            {t('lobby.players')} <span className="lobby-players-count">{snapshot.players.length} / 8</span>
          </h2>
          <ul className="player-list" role="list">
            {snapshot.players.map((player) => (
              <li
                key={player.id}
                className={`player-item ${player.id === snapshot.selfId ? 'player-self' : ''} ${!player.connected ? 'player-disconnected' : ''}`}
              >
                <span className="player-name">
                  {player.name}
                  {player.id === snapshot.selfId && <span className="player-you"> {t('lobby.you')}</span>}
                </span>
                <div className="player-badges">
                  {player.isHost && <span className="badge badge-host">{t('lobby.host')}</span>}
                  {!player.connected && <span className="badge badge-offline">{t('lobby.offline')}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {isHost ? (
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={handleStart}
              disabled={!canStart}
            >
              {canStart
                ? t('btn.start')
                : (missingPlayers === 1
                    ? t('lobby.needMore', { count: missingPlayers })
                    : t('lobby.needMorePlural', { count: missingPlayers }))}
            </button>
          ) : (
            <div className="lobby-waiting" aria-live="polite">
              {t('lobby.waitingHost')}
            </div>
          )}
          <button className="btn btn-secondary btn-block" onClick={handleLeave}>
            {t('btn.leave')}
          </button>
        </div>
      </div>
    </main>
  );
}
