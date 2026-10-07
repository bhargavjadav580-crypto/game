import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useTranslation, type SupportedLanguage } from '../i18n';
import type { Difficulty } from '@shared/types';
import '../styles/buttons.css';
import './CreatePage.css';

interface CategoryOption {
  id: string;
  icon: string;
  key: string;
  descEn: string;
  descHi: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'sports', icon: '⚽', key: 'category.sports', descEn: 'Cricket, Football, Olympics', descHi: 'क्रिकेट, फुटबॉल, ओलंपिक' },
  { id: 'nature', icon: '🌿', key: 'category.nature', descEn: 'Rivers, Forests, Mountains', descHi: 'पेड़-पौधे, नदियां, पर्वत' },
  { id: 'animals', icon: '🦁', key: 'category.animals', descEn: 'Wildlife, Birds, Sea Life', descHi: 'बाघ, हाथी, जलीय जीव' },
  { id: 'science', icon: '🔬', key: 'category.science', descEn: 'Physics, Chemistry, Space', descHi: 'भौतिकी, रसायन, अंतरिक्ष' },
  { id: 'history', icon: '📜', key: 'category.history', descEn: 'Monuments, Events, Leaders', descHi: 'ऐतिहासिक घटनाएं, नेता' },
  { id: 'geography', icon: '🌍', key: 'category.geography', descEn: 'Countries, Capitals, Maps', descHi: 'राजधानियां, महाद्वीप' },
  { id: 'logic', icon: '💡', key: 'category.logic', descEn: 'Puzzles, Sequences, Math', descHi: 'पहेलियां, श्रृंखला, गणित' },
  { id: 'mix', icon: '🎲', key: 'category.mix', descEn: 'All topics combined', descHi: 'सभी विषयों का मिश्रण' },
];

const DIFFICULTIES: { id: Difficulty; key: string }[] = [
  { id: 'all', key: 'difficulty.all' },
  { id: 'easy', key: 'difficulty.easy' },
  { id: 'medium', key: 'difficulty.medium' },
  { id: 'hard', key: 'difficulty.hard' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];
const QUESTION_TIMES = [10, 15, 20, 30]; // in seconds

export default function CreatePage() {
  const navigate = useNavigate();
  const { createRoom } = useSocket();
  const { t, lang, setLang } = useTranslation();

  const [name, setName] = useState(() => localStorage.getItem('qlyvora_name') || '');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(lang);
  const [category, setCategory] = useState<string>('mix');
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionTimeSec, setQuestionTimeSec] = useState<number>(15);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync lang change to i18n
  const handleLangChange = (newLang: SupportedLanguage) => {
    setSelectedLang(newLang);
    setLang(newLang);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError(t('error.nameRequired'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await createRoom({
        name: name.trim(),
        category,
        difficulty,
        questionCount,
        questionTimeSec,
        language: selectedLang,
      });

      if (result.ok && result.data) {
        const roomCode = result.data.roomCode as string;
        const sessionToken = result.data.sessionToken as string;
        localStorage.setItem('qlyvora_room', roomCode);
        localStorage.setItem('qlyvora_token', sessionToken);
        localStorage.setItem('qlyvora_name', name.trim());
        navigate(`/lobby/${roomCode}`);
      } else {
        setError(result.error || t('error.connection'));
      }
    } catch {
      setError(t('error.connection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-center create-page-wrapper">
      <div className="create-room-card">
        <div className="card-top-bar">
          <button className="back-btn" onClick={() => navigate('/')} aria-label={t('btn.back')}>
            {t('btn.back')}
          </button>
        </div>

        <h1 className="form-title">{t('create.title')}</h1>
        <p className="form-subtitle">{t('create.subtitle')}</p>

        <form onSubmit={handleSubmit} className="create-form">
          {/* Section 1: Host Name & Language */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-badge">1</span>
              <h2 className="section-title">{t('create.step1')}</h2>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="name" className="form-label">{t('label.name')}</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('label.namePlaceholder')}
                  minLength={2}
                  maxLength={16}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="form-field">
                <label className="form-label">{t('label.quizLang')}</label>
                <div className="lang-pill-group">
                  <button
                    type="button"
                    className={`lang-pill ${selectedLang === 'en' ? 'active' : ''}`}
                    onClick={() => handleLangChange('en')}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    className={`lang-pill ${selectedLang === 'hi' ? 'active' : ''}`}
                    onClick={() => handleLangChange('hi')}
                  >
                    🇮🇳 हिन्दी
                  </button>
                </div>
                <span className="field-hint">{t('label.langHint')}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Quiz Topic / Category */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-badge">2</span>
              <h2 className="section-title">{t('create.step2')}</h2>
            </div>

            <div className="category-grid">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setCategory(cat.id)}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-title">{t(cat.key)}</span>
                    <span className="cat-desc">
                      {selectedLang === 'hi' ? cat.descHi : cat.descEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Difficulty */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-badge">3</span>
              <h2 className="section-title">{t('create.step3')}</h2>
            </div>

            <div className="pill-grid pill-grid-4">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  className={`pill-btn ${difficulty === diff.id ? 'active' : ''}`}
                  onClick={() => setDifficulty(diff.id)}
                >
                  {t(diff.key)}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Match Settings (# of questions & timer) */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-badge">4</span>
              <h2 className="section-title">{t('create.step4')}</h2>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">{t('label.questionCount')}</label>
                <div className="pill-grid">
                  {QUESTION_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`pill-btn ${questionCount === count ? 'active' : ''}`}
                      onClick={() => setQuestionCount(count)}
                    >
                      {count} {t('label.questions')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">{t('label.timePerQuestion')}</label>
                <div className="pill-grid">
                  {QUESTION_TIMES.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`pill-btn ${questionTimeSec === time ? 'active' : ''}`}
                      onClick={() => setQuestionTimeSec(time)}
                    >
                      ⏱️ {time} {t('label.seconds')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Match Summary Preview */}
          <div className="summary-banner">
            <span className="summary-item">
              {CATEGORIES.find(c => c.id === category)?.icon} {t(`category.${category}`)}
            </span>
            <span className="summary-dot">•</span>
            <span className="summary-item">{t(`difficulty.${difficulty}`)}</span>
            <span className="summary-dot">•</span>
            <span className="summary-item">{questionCount} {t('label.questions')}</span>
            <span className="summary-dot">•</span>
            <span className="summary-item">⏱️ {questionTimeSec}s</span>
            <span className="summary-dot">•</span>
            <span className="summary-item">{selectedLang === 'hi' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}</span>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block create-submit-btn"
            disabled={loading || name.trim().length < 2}
          >
            {loading ? t('btn.creating') : t('btn.create')}
          </button>
        </form>
      </div>
    </main>
  );
}
