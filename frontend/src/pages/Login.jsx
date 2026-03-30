import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import loginImage from '../assets/login.jpg';
import './Login.css';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [mot_de_passe, setMotDePasse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const defaultTheme = 'role-theme-donneur';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/auth/login-all', { email, mot_de_passe });
      const { token, role, user, association } = res.data || {};

      if (!token || !role) {
        setError('Réponse serveur invalide (token/role manquant)');
        return;
      }

      const payload = role === 'association' ? association : user;
      login({ ...(payload || {}), role, token });

      if (role === 'beneficiaire') navigate('/dashboard-beneficiaire');
      else if (role === 'donneur') navigate('/dashboard-donneur');
      else if (role === 'association') navigate('/association/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'avocat') navigate('/avocat/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page ${defaultTheme}`}>
      <div className="login-shell">
        <aside className="login-visual">
          <img src={loginImage} alt="Connexion" className="login-visual-img" />
          <div className="login-visual-overlay">
            <div className="login-brand">
              <div className="login-brand-mark">DA</div>
              <div>
                <h1 className="login-brand-title">Bienvenue</h1>
                <p className="login-brand-subtitle">Connectez-vous pour accéder à votre espace.</p>
              </div>
            </div>
            <div className="login-role-pill" />
          </div>
        </aside>

        <main className="login-main">
          <div className="login-card">
            <div className="login-head">
              <h2 className="login-title">Connexion</h2>
              <p className="login-desc">Entrez vos identifiants pour continuer.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="votreemail@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Mot de passe</label>
                <div className="password-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={mot_de_passe}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert">
                  <div className="alert-title">Connexion impossible</div>
                  <div className="alert-text">{error}</div>
                </div>
              )}

              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              <div className="below">
                <span>Pas encore de compte ?</span>{' '}
                <Link to="/demande" className="below-link">
                  Créer une demande
                </Link>
              </div>

              <div className="help">
                Besoin d’aide ?{' '}
                <Link to="/about" className="help-link">
                  À propos
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;