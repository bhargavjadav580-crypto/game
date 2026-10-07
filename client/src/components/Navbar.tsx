import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { LanguageSelector } from './LanguageSelector';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <span className="navbar-logo-icon">⚡</span>
          <span className="navbar-title">{t('app.title')}</span>
        </div>
        <div className="navbar-actions">
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
};
