import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock } from 'lucide-react';
import './Login.css';

const API_URL = 'http://127.0.0.1:8000/api';

export default function LoginStaff() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users/login/agent/`, {
        email,
        mot_de_passe: motDePasse,
      });
      localStorage.setItem('access', res.data.tokens.access);
      localStorage.setItem('refresh', res.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'agent') navigate('/agent/dashboard');
      else if (role === 'agent_technique') navigate('/technique/dashboard');
      else if (role === 'agent_annexe') navigate('/annexe/dashboard');

    } catch (err) {
      setError('Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">

        <div className="auth-header">
          <div className="auth-logo-box">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-logo-svg">
              <circle cx="30" cy="30" r="28" stroke="#1a3a6b" strokeWidth="3" fill="white"/>
              <circle cx="30" cy="30" r="18" stroke="#00a651" strokeWidth="2.5" fill="none"/>
              <circle cx="30" cy="30" r="8" fill="#1a3a6b"/>
              <text x="30" y="35" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">AT</text>
            </svg>
          </div>
          <h1 className="auth-title">Algérie Télécom</h1>
          <p className="auth-subtitle">PORTAIL NATIONAL AT-BOXEUR</p>
        </div>

        <div className="auth-body">
          <form onSubmit={handleSubmit} className="auth-form">

            <div className="auth-field">
              <label className="auth-label">IDENTIFIANT CORPORATIF (EMAIL)</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={20} />
                <input
                  type="email"
                  placeholder="Ex: agent@at.dz"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">MOT DE PASSE SESSION</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="auth-input"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn auth-btn-green" disabled={loading}>
              <span className="auth-btn-text">{loading ? 'Connexion...' : 'Accès Authentifié Staff'}</span>
              <span className="auth-btn-arabic">دخول الموظفين</span>
            </button>

          </form>
        </div>

        <div className="auth-footer">
          <div className="auth-footer-row">
            <span>SERVICE CLIENT : 100</span>
            <span className="auth-footer-dot"></span>
            <span>© 2024 ALGÉRIE TÉLÉCOM</span>
          </div>
          <div className="auth-footer-sub">SÉCURISÉ PAR DIRECTION DE LA CYBERSÉCURITÉ AT</div>
        </div>

      </div>
    </div>
  );
}