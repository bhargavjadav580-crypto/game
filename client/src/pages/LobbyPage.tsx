import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import '../styles/buttons.css';
import './LobbyPage.css';

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { snapshot, connected, startGame, leaveRoom, toast } = useSocket();
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
        // No session — go back to join
        navigate('/join');
      }
    }
  }, [snapshot, code, navigate, rejoinRoom]);

  if (!snapshot || snapshot.phase !== 'WAITING') {
    return (
      <main className="page-center">
        <div className="form-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Connecting to room…</p>
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
      // Fallback
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
        // User cancelled or not supported
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <main className="lobby">
      <div className="lobby-content">
        {/* Connection indicator */}
        {!connected && (
          <div className="connection-banner" role="alert">
            Reconnecting…
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast.message}
          </div>
        )}

        {/* Room code */}
        <div className="lobby-header">
          <p className="lobby-label">Room Code</p>
          <h1 className="lobby-code" aria-label={`Room code: ${snapshot.roomCode.split('').join(' ')}`}>
            {snapshot.roomCode}
          </h1>
          <div className="lobby-share-actions">
            <button className="btn btn-secondary" onClick={handleCopyCode}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
            <button className="btn btn-secondary" onClick={handleShare}>
              🔗 Share Link
            </button>
          </div>
        </div>

        {/* Player list */}
        <div className="lobby-players">
          <h2 className="lobby-players-title">
            Players <span className="lobby-players-count">{snapshot.players.length} / 8</span>
          </h2>
          <ul className="player-list" role="list">
            {snapshot.players.map((player) => (
              <li
                key={player.id}
                className={`player-item ${player.id === snapshot.selfId ? 'player-self' : ''} ${!player.connected ? 'player-disconnected' : ''}`}
              >
                <span className="player-name">
                  {player.name}
                  {player.id === snapshot.selfId && <span className="player-you"> (You)</span>}
                </span>
                <div className="player-badges">
                  {player.isHost && <span className="badge badge-host">HOST</span>}
                  {!player.connected && <span className="badge badge-offline">Offline</span>}
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
              {canStart ? 'Start Game' : `Need ${2 - connectedCount} more player${2 - connectedCount !== 1 ? 's' : ''}`}
            </button>
          ) : (
            <div className="lobby-waiting" aria-live="polite">
              Waiting for host to start…
            </div>
          )}
          <button className="btn btn-secondary btn-block" onClick={handleLeave}>
            Leave Room
          </button>
        </div>
      </div>
    </main>
  );
}
