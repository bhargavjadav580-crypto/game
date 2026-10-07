import { useNavigate } from 'react-router-dom';
import '../styles/buttons.css';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <main className="welcome">
      <div className="welcome-content">
        {/* Logo / Title */}
        <div className="welcome-hero">
          <h1 className="welcome-title">Qlyvora</h1>
          <p className="welcome-tagline">Think Fast. Play Together.</p>
        </div>

        {/* Action Buttons */}
        <div className="welcome-actions">
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => navigate('/create')}
          >
            Create Game
          </button>
          <button
            className="btn btn-secondary btn-lg btn-block"
            onClick={() => navigate('/join')}
          >
            Join Game
          </button>
        </div>

        {/* Features */}
        <div className="welcome-features" role="list">
          <div className="feature" role="listitem">
            <span className="feature-icon" aria-hidden="true">👥</span>
            <span className="feature-text">2–8 Players</span>
          </div>
          <div className="feature" role="listitem">
            <span className="feature-icon" aria-hidden="true">⚡</span>
            <span className="feature-text">Real-Time Multiplayer</span>
          </div>
          <div className="feature" role="listitem">
            <span className="feature-icon" aria-hidden="true">🚀</span>
            <span className="feature-text">No Installation Required</span>
          </div>
        </div>
      </div>
    </main>
  );
}
