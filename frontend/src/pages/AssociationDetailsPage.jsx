import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import './AssociationDetailsPage.css';

const API_BASE = "http://192.168.1.27:5000";
const LOCAL_IP = "192.168.1.27"; // Pour QR code (si même PC). Pour téléphone: mets l’IP LAN de ton PC.

const AssociationDetailsPage = () => {
  const { id } = useParams();

  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        setLoading(true);
        setError('');

        // ✅ IMPORTANT: on fetch bien depuis localhost
        const res = await axios.get(`${API_BASE}/associations/public`);

        // ✅ sécuriser le type (doit être un tableau)
        setAssociations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setAssociations([]);
        setError("Impossible de charger la liste des associations.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssociations();
  }, []);

  const assoc = useMemo(() => {
    const numericId = Number(id);
    return (Array.isArray(associations) ? associations : []).find((a) => Number(a.id) === numericId) || null;
  }, [associations, id]);

  return (
    <div className="assoc-details-page">
      {loading && <p className="assoc-state">Chargement...</p>}

      {!loading && error && (
        <div className="assoc-error-box">
          <h2>Erreur</h2>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && !assoc && (
        <div className="assoc-error-box">
          <h2>Association introuvable</h2>
          <p>ID: {id}</p>
        </div>
      )}

      {!loading && !error && assoc && (
        <div className="assoc-shell">
          {/* Hero card */}
          <section className="assoc-hero">
            <div className="assoc-hero-badge">Association vérifiée</div>

            <div className="assoc-hero-main">
              {/* ✅ Logo si existe, sinon avatar lettre */}
              {assoc.logo ? (
                <div className="assoc-avatar" aria-hidden="true">
                  <img
                    src={`${API_BASE}/upload/${assoc.logo}`}
                    alt={`Logo ${assoc.nom}`}
                    className="assoc-avatar-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="assoc-avatar-fallback">
                    {String(assoc.nom || 'A')[0]?.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="assoc-avatar" aria-hidden="true">
                  <span className="assoc-avatar-fallback">
                    {String(assoc.nom || 'A')[0]?.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="assoc-hero-text">
                <h1 className="assoc-title">{assoc.nom}</h1>
                <p className="assoc-subtitle">Contactez l’association et découvrez ses actions.</p>
              </div>
            </div>
          </section>

          {/* Infos */}
          <section className="assoc-card">
            <h2 className="assoc-section-title">Informations</h2>

            <div className="assoc-grid">
              <div className="assoc-item">
                <div className="assoc-item-icon" aria-hidden="true">📧</div>
                <div className="assoc-item-body">
                  <span className="assoc-label">Email</span>
                  <span className="assoc-value">{assoc.email || '—'}</span>
                </div>
              </div>

              <div className="assoc-item">
                <div className="assoc-item-icon" aria-hidden="true">📞</div>
                <div className="assoc-item-body">
                  <span className="assoc-label">Téléphone</span>
                  <span className="assoc-value">{assoc.telephone || '—'}</span>
                </div>
              </div>

              <div className="assoc-item">
                <div className="assoc-item-icon" aria-hidden="true">🏷️</div>
                <div className="assoc-item-body">
                  <span className="assoc-label">Catégorie</span>
                  <span className="assoc-value">{assoc.categorie || '—'}</span>
                </div>
              </div>

              <div className="assoc-item assoc-item-wide">
                <div className="assoc-item-icon" aria-hidden="true">📝</div>
                <div className="assoc-item-body">
                  <span className="assoc-label">Description</span>
                  <span className="assoc-value">
                    {assoc.description || "Aucune description n’a été ajoutée pour le moment."}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ✅ Optionnel: QR code vers la page détail */}
          {assoc.id && (
            <section className="assoc-card">
              <h2 className="assoc-section-title">Partager</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <QRCodeSVG value={`http://${LOCAL_IP}:3000/association/${assoc.id}`} size={90} />
                <div>
                  <div><strong>QR Code</strong></div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    Scannez pour ouvrir cette association.
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default AssociationDetailsPage;