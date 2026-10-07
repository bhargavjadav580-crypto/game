import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n';
import '../styles/buttons.css';
import './CreatePage.css';

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinRoom } = useSocket();
  const { t } = useTranslation();

  const [name, setName] = useState(() => localStorage.getItem('qlyvora_name') || '');
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
    if (name.trim().length < 2) {
      setError(t('error.nameRequired'));
      return;
    }

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
        setError(result.error || t('error.roomNotFound'));
      }
    } catch {
      setError(t('error.connection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-center create-page-wrapper">
      <div className="create-room-card" style={{ maxWidth: '480px' }}>
        <div className="card-top-bar">
          <button className="back-btn" onClick={() => navigate('/')} aria-label={t('btn.back')}>
            {t('btn.back')}
          </button>
        </div>

        <h1 className="form-title">{t('join.title')}</h1>
        <p className="form-subtitle">{t('join.subtitle')}</p>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-field">
            <label htmlFor="code" className="form-label">{t('join.roomCode')}</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('join.roomCodePlaceholder')}
              maxLength={5}
              required
              autoFocus={!code}
              autoComplete="off"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 700,
                textAlign: 'center',
                fontSize: '1.4rem'
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="join-name" className="form-label">{t('label.name')}</label>
            <input
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('label.namePlaceholder')}
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
            {loading ? t('btn.joining') : t('btn.join')}
          </button>
        </form>
      </div>
    </main>
  );
}
