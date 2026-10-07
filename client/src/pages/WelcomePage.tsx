import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import '../styles/buttons.css';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className="welcome">
      <div className="welcome-content">
        {/* Logo / Title */}
        <div className="welcome-hero">
          <h1 className="welcome-title">{t('app.title')}</h1>
          <p className="welcome-tagline">{t('app.tagline')}</p>
        </div>

        {/* Action Buttons */}
        <div className="welcome-actions">
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => navigate('/create')}
          >
            {t('welcome.createGame')}
          </button>
          <button
            className="btn btn-secondary btn-lg btn-block"
            onClick={() => navigate('/join')}
          >
            {t('welcome.joinGame')}
          </button>
        </div>

        {/* Features */}
        <div className="welcome-features" role="list">
          <div className="feature" role="listitem">
            <span className="feature-icon" aria-hidden="true">👥</span>
            <span className="feature-text">{t('welcome.feat1')}</span>
          </div>
          <div className="feature" role="listitem">
            <span className="feature-icon" aria-hidden="true">⚡</span>
            <span className="feature-text">{t('welcome.feat2')}</span>
          </div>
          <div className="feature" role="listitem">
            <span className="feature-icon" aria-hidden="true">🚀</span>
            <span className="feature-text">{t('welcome.feat3')}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
