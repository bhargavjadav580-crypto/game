import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import CreatePage from './pages/CreatePage';
import JoinPage from './pages/JoinPage';
import LobbyPage from './pages/LobbyPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
