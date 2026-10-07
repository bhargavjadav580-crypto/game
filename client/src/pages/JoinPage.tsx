import { useNavigate } from 'react-router-dom';
import '../styles/buttons.css';

export default function JoinPage() {
  const navigate = useNavigate();

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: 'var(--space-xl)' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>Join Game</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>Coming in Milestone 1</p>
      <button className="btn btn-secondary" onClick={() => navigate('/')}>← Back</button>
    </main>
  );
}
