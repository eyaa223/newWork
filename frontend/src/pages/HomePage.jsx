import { useNavigate } from 'react-router-dom';
import './HomePage.css';

import welcomeImage from '../assets/welcome.jpg';
import heroVideo from '../assets/charity.mp4';

import assIcon from '../assets/ass.jpg';

// Icons
import transparenceIcon from '../assets/transparence.png';
import securiteIcon from '../assets/Sécurité.png';
import connexionIcon from '../assets/Connexion.jpg';
import impactIcon from '../assets/Impact.png';

import ChatbotWidget from '../components/ChatbotWidget';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage-container">
      {/* ✅ HERO PHOTO + TEXTE */}
      <section className="hero-section" aria-label="Hero">
        <img src={welcomeImage} alt="Communauté solidaire" className="hero-image" />

        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">Chaque geste compte. Chaque vie transformée.</h1>

            <p className="hero-subtitle">
              Rejoignez une communauté bienveillante où vos dons deviennent des sourires, vos actions deviennent de
              l&apos;espoir, et votre générosité change des destins.
            </p>

            <div className="hero-buttons">
              <button className="hero-btn hero-btn-secondary" onClick={() => navigate('/associations')}>
                <span className="btn-icon" aria-hidden="true">
                  <img src={assIcon} alt="" className="btn-icon-img" />
                </span>
                Découvrir les associations
              </button>

              <button className="cta-btn cta-btn-primary" onClick={() => navigate('/register-donneur')}>
                Offrir de l&apos;espoir maintenant
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ VIDEO (remplit l'espace jaune + cadrage violet) */}
      <section className="video-section" aria-label="Vidéo">
        <div className="video-frame">
          <video
            className="video-media"
            src={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>
      </section>

      {/* POURQUOI NOUS CHOISIR ? */}
      <section className="why-section" aria-label="Pourquoi nous choisir">
        <h2 className="why-title">Pourquoi nous choisir ?</h2>
        <p className="why-subtitle">
          Une expérience simple, sûre et transparente pour maximiser l&apos;impact de chaque don.
        </p>

        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon" aria-hidden="true">
              <img src={transparenceIcon} alt="" className="why-icon-img" />
            </div>
            <h3 className="why-card-title">Transparence Totale</h3>
            <p className="why-card-text">
              Suivez exactement où vont vos dons et mesurez l&apos;impact réel de vos contributions.
            </p>
          </div>

          <div className="why-card">
            <div className="why-icon" aria-hidden="true">
              <img src={securiteIcon} alt="" className="why-icon-img" />
            </div>
            <h3 className="why-card-title">Sécurité Garantie</h3>
            <p className="why-card-text">
              Vos données et vos transactions sont protégées par les meilleures pratiques de sécurité.
            </p>
          </div>

          <div className="why-card">
            <div className="why-icon" aria-hidden="true">
              <img src={connexionIcon} alt="" className="why-icon-img" />
            </div>
            <h3 className="why-card-title">Connexion Directe</h3>
            <p className="why-card-text">
              Connectez-vous directement avec les associations qui changent les communautés.
            </p>
          </div>

          <div className="why-card">
            <div className="why-icon" aria-hidden="true">
              <img src={impactIcon} alt="" className="why-icon-img" />
            </div>
            <h3 className="why-card-title">Impact Mesurable</h3>
            <p className="why-card-text">
              Voyez les résultats concrets de vos dons et suivez la progression des projets.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" aria-label="Rejoignez-nous">
        <div className="cta-container">
          <h2 className="cta-title">Et si aujourd&apos;hui, vous deveniez le héros de quelqu&apos;un ?</h2>

          <p className="cta-subtitle">
            En 2 minutes, vous pouvez offrir un repas, un sourire ou un espoir à une personne qui en a désespérément
            besoin. Votre générosité mérite d&apos;avoir un impact visible et concret.
          </p>

          <div className="cta-actions">
            <button className="cta-btn cta-btn-primary" onClick={() => navigate('/register-donneur')}>
              Offrir de l&apos;espoir maintenant
            </button>
          </div>
        </div>
      </section>

      <ChatbotWidget />
    </div>
  );
};

export default HomePage;