import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './RegisterDonneur.css';

import joindreImg from '../assets/joindre.png';

const RegisterDonneur = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    mot_de_passe: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-shell">
        {/* Left - Info */}
        <aside className="register-info">
          <div className="register-info__top">
            {/* ✅ image JOINER plus grande */}
            <div className="joiner-hero" aria-hidden="true">
              <img src={joindreImg} alt="" className="joiner-hero__img" />
            </div>

            <h1 className="register-info__title">Devenez un acteur du changement</h1>
            <p className="register-info__subtitle">
              Aidez ceux qui en ont besoin, suivez vos dons, et rejoignez une communauté solidaire.
            </p>
          </div>

          <ul className="register-benefits">
            <li>
              <span className="benefit-dot" aria-hidden="true" />
              <span>Suivez vos donations en temps réel</span>
            </li>
            <li>
              <span className="benefit-dot" aria-hidden="true" />
              <span>Accédez aux profils vérifiés des bénéficiaires</span>
            </li>
            <li>
              <span className="benefit-dot" aria-hidden="true" />
              <span>Recevez des remerciements personnalisés</span>
            </li>
            <li>
              <span className="benefit-dot" aria-hidden="true" />
              <span>Participez à une communauté solidaire</span>
            </li>
          </ul>

          
        </aside>

        {/* Right - Form */}
        <main className="register-main">
          <div className="register-card">
            <div className="register-head">
              <div className="register-head__icon" aria-hidden="true">👤</div>
              <div>
                <h2 className="register-head__title">Créer un compte Donneur</h2>
                <p className="register-head__desc">Remplissez le formulaire pour commencer.</p>
              </div>
            </div>

            <form className="register-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nom">Nom complet</label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  placeholder="Entrez votre nom complet"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="votreemail@exemple.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="mot_de_passe">Mot de passe</label>
                <input
                  type="password"
                  id="mot_de_passe"
                  name="mot_de_passe"
                  placeholder="••••••••"
                  value={formData.mot_de_passe}
                  onChange={handleChange}
                  required
                />
                <small className="password-hint">Minimum 8 caractères</small>
              </div>

              {error && <div className="alert alert--danger">{error}</div>}

              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" aria-hidden="true" />
                    Création en cours...
                  </span>
                ) : (
                  'Créer mon compte'
                )}
              </button>

              {/* ✅ Footer link vers /login */}
              <div className="register-footer">
                <span>Vous avez déjà un compte ?</span>
                <Link to="/login" className="register-link-dark">
                  Se connecter
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RegisterDonneur;