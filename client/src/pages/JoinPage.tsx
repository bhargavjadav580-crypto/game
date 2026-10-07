import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import '../styles/buttons.css';
import './CreatePage.css'; // reuse form styles

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinRoom } = useSocket();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill room code from deep link (?room=XXXXX)
  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      setCode(roomParam.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await joinRoom(code.trim().toUpperCase(), name.trim());
      if (result.ok && result.data) {
        const roomCode = result.data.roomCode as string;
        const sessionToken = result.data.sessionToken as string;
        localStorage.setItem('qlyvora_room', roomCode);
        localStorage.setItem('qlyvora_token', sessionToken);
        localStorage.setItem('qlyvora_name', name.trim());
        navigate(`/lobby/${roomCode}`);
      } else {
        setError(result.error || 'Failed to join game');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-center">
      <div className="form-card">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Go back">
          ← Back
        </button>
        <h1 className="form-title">Join Game</h1>
        <p className="form-subtitle">Enter the room code and your name</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label htmlFor="code" className="form-label">Room Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC23"
              maxLength={5}
              required
              autoFocus={!code}
              autoComplete="off"
              style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, textAlign: 'center', fontSize: 'var(--font-size-xl)' }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="join-name" className="form-label">Your Name</label>
            <input
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              minLength={2}
              maxLength={16}
              required
              autoFocus={!!code}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading || name.trim().length < 2 || code.trim().length !== 5}
          >
            {loading ? 'Joining…' : 'Join Game'}
          </button>
        </form>
      </div>
    </main>
  );
}
