import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import '../styles/buttons.css';
import './CreatePage.css';

export default function CreatePage() {
  const navigate = useNavigate();
  const { createRoom } = useSocket();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createRoom(name.trim());
      if (result.ok && result.data) {
        // Store session for reconnection
        const roomCode = result.data.roomCode as string;
        const sessionToken = result.data.sessionToken as string;
        localStorage.setItem('qlyvora_room', roomCode);
        localStorage.setItem('qlyvora_token', sessionToken);
        localStorage.setItem('qlyvora_name', name.trim());
        navigate(`/lobby/${roomCode}`);
      } else {
        setError(result.error || 'Failed to create game');
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
        <h1 className="form-title">Create Game</h1>
        <p className="form-subtitle">Enter your name to start a new game</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label htmlFor="name" className="form-label">Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              minLength={2}
              maxLength={16}
              required
              autoFocus
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
            disabled={loading || name.trim().length < 2}
          >
            {loading ? 'Creating…' : 'Create Game'}
          </button>
        </form>
      </div>
    </main>
  );
}
