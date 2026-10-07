import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { Navbar } from './components/Navbar';
import WelcomePage from './pages/WelcomePage';
import CreatePage from './pages/CreatePage';
import JoinPage from './pages/JoinPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/lobby/:code" element={<LobbyPage />} />
          <Route path="/game/:code" element={<GamePage />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
