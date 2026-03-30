import './AboutUs.css';
import logo from '../assets/lll.png';

import heroBg from '../assets/background.jpg';
import charityImg from '../assets/charity1.jpg';
import rejoindreImg from '../assets/11.jpg';

/* ✅ Social images */
import viesTransformeesImg from '../assets/vietransforme.jpg';
import souriresImg from '../assets/sourirs.png';
import urgenceSolidaireImg from '../assets/urgencesolidaire.png';
import impactProImg from '../assets/impactprofessional.jpg';

/* ✅ Contact images (replace emojis)
   IMPORTANT: rename files to avoid spaces if possible.
   If your files really contain spaces, keep the exact names.
*/
import ecrireNousImg from '../assets/ecrire nous.jpg';
import appelerImg from '../assets/appeler.jpg';
import adresseImg from '../assets/adresse.png';

const AboutUs = () => {
  return (
    <div className="about-page-container">
      {/* Hero Section */}
      <div className="about-hero">
        <div
          className="about-hero-inner"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(3,105,161,0.86) 0%, rgba(14,165,233,0.60) 70%), url(${heroBg})`,
          }}
        >
          <img src={logo} alt="Logo DonAct - L'espoir en action" className="about-logo" />
          <h1 className="about-hero-title">Notre Histoire : Quand l'Espoir Rencontre l'Action</h1>
          <p className="about-hero-subtitle">
            Derrière chaque clic, une vie transformée. Derrière chaque don, un avenir reconstruit.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="about-content">
        {/* Notre Plateforme */}
        <section className="about-section about-section--withImage">
          <h2 className="section-title">Notre Raison d'Être</h2>

          <div className="about-split">
            <div className="about-split__text">
              <p className="section-text">
                Tout a commencé par une rencontre bouleversante : Yasmine, 9 ans, partageant un seul repas par jour avec sa mère
                dans un quartier défavorisé de Tunis. Ce jour-là, nous avons compris que la générosité existe partout — mais manque
                souvent de ponts pour atteindre ceux qui en ont besoin.
                <br /><br />
                DonAct est né de cette conviction : <strong>chaque personne mérite d'être vue, entendue et soutenue</strong>.
                Nous ne sommes pas une simple plateforme — nous sommes un écosystème vivant où les cœurs généreux rencontrent les
                mains tendues, avec transparence absolue et respect inconditionnel.
              </p>
            </div>

            <div className="about-split__media" aria-hidden="true">
              <img src={charityImg} alt="" className="about-media-img" />
            </div>
          </div>
        </section>

        {/* Valeurs */}
        <section className="about-section mission-section">
          <h2 className="section-title">Nos Valeurs au Quotidien</h2>

          <div className="mission-grid">
            <div className="mission-card">
              <div className="mission-number">01</div>
              <h3>Transparence Radicale</h3>
              <p>Chaque dinar donné est tracé en temps réel. Vous voyez exactement comment votre geste transforme une vie.</p>
            </div>

            <div className="mission-card">
              <div className="mission-number">02</div>
              <h3>Dignité Avant Tout</h3>
              <p>Chaque bénéficiaire est une personne avec une histoire, des rêves et le droit à la dignité.</p>
            </div>

            <div className="mission-card">
              <div className="mission-number">03</div>
              <h3>Impact Mesurable</h3>
              <p>Nous mesurons l'impact humain, pas seulement les chiffres.</p>
            </div>

            <div className="mission-card">
              <div className="mission-number">04</div>
              <h3>Communauté Solidaire</h3>
              <p>Donateurs, associations et bénéficiaires forment un cercle vertueux où chacun grandit ensemble.</p>
            </div>
          </div>
        </section>

        {/* Contact / Rejoindre */}
        <section className="about-section contact-section">
          
          <h2 className="section-title">Rejoignez Notre Mouvement</h2>
          <p className="section-text">
            Que vous souhaitiez donner, partager votre histoire, devenir bénévole ou simplement poser une question —{' '}
            <strong>nous sommes là pour vous écouter avec le cœur ouvert</strong>.
          </p>

          {/* ✅ Contact cards with images instead of emojis */}
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-thumb" aria-hidden="true">
                <img src={ecrireNousImg} alt="" className="contact-thumb-img contact-thumb-img--contain" />
              </div>
              <h3>Écrivez-nous</h3>
              <a href="mailto:donactcontact@gmail.com" className="contact-link">
                donactcontact@gmail.com
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-thumb" aria-hidden="true">
                <img src={appelerImg} alt="" className="contact-thumb-img" />
              </div>
              <h3>Appelez-nous</h3>
              <a href="tel:+21692345678" className="contact-link">
                +216 92 345 678
              </a>
              <p className="contact-note">Lun-Ven : 9h-18h (équipe humaine, pas de robot !)</p>
            </div>

            <div className="contact-card">
              <div className="contact-thumb" aria-hidden="true">
                <img src={adresseImg} alt="" className="contact-thumb-img contact-thumb-img--contain" />
              </div>
              <h3>Notre Maison</h3>
              <p className="contact-info">
                123 Avenue de l'Espoir<br />
                Tunis 1000, Tunisie<br />
                <span className="contact-italic">Venez prendre un café avec nous !</span>
              </p>
            </div>
          </div>

          {/* Social Media */}
          <div className="social-section">
            <h3 className="social-title">Suivez nos Histoires d'Espoir</h3>

            <div className="social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                <span className="social-thumb" aria-hidden="true">
                  <img src={viesTransformeesImg} alt="" className="social-thumb-img" />
                </span>
                <span>Vies transformées en direct</span>
              </a>

              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-btn instagram">
                <span className="social-thumb" aria-hidden="true">
                  <img src={souriresImg} alt="" className="social-thumb-img" />
                </span>
                <span>Sourires du jour</span>
              </a>

              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-btn twitter">
                <span className="social-thumb" aria-hidden="true">
                  <img src={urgenceSolidaireImg} alt="" className="social-thumb-img social-thumb-img--contain" />
                </span>
                <span>Urgences solidaires</span>
              </a>

              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-btn linkedin">
                <span className="social-thumb" aria-hidden="true">
                  <img src={impactProImg} alt="" className="social-thumb-img" />
                </span>
                <span>Impact professionnel</span>
              </a>
            </div>
          </div>

          {/* Image after "Rejoignez" */}
          <div className="about-rejoindre-media" aria-hidden="true">
            <img src={rejoindreImg} alt="" className="about-rejoindre-img" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;