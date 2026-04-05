import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import './AssociationsListPage.css';

/* ✅ Images catégories (locales) */
import educationImg from '../assets/education.png';
import santeImg from '../assets/sante.png';
import alimentationImg from '../assets/alimentation.png';
import logementImg from '../assets/logement.jpg';
import urgenceImg from '../assets/urgence.png';
import formationImg from '../assets/formation.jpg';
import autreImg from '../assets/autre.png';

const API_BASE = 'http://192.168.1.27:5000';
const LOCAL_IP = '192.168.1.27';

/**
 * ✅ Mapping d’icônes locales par value (clé stable en DB)
 * Si l’admin crée une catégorie avec value="food" => on affiche alimentationImg
 */
const CATEGORY_IMAGES = {
  education: educationImg,
  health: santeImg,
  food: alimentationImg,
  housing: logementImg,
  emergency: urgenceImg,
  skills: formationImg,
  other: autreImg,
};

/**
 * ✅ Fallback si l’API /categories n’est pas encore prête
 */
const DEFAULT_CATEGORIES = [
  { id: 1, value: 'education', label: 'Éducation' },
  { id: 2, value: 'health', label: 'Santé' },
  { id: 3, value: 'food', label: 'Alimentation' },
  { id: 4, value: 'housing', label: 'Logement' },
  { id: 5, value: 'emergency', label: 'Urgence' },
  { id: 6, value: 'skills', label: 'Formation' },
  { id: 7, value: 'other', label: 'Autre' },
];

const AssociationsListPage = () => {
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleCategory = (value) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  // ✅ 1) Fetch catégories depuis backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const res = await axios.get(`${API_BASE}/categories`);
        const list = Array.isArray(res.data) ? res.data : [];

        // Normalisation: on veut au minimum {id, value, label}
        const normalized = list
          .filter((c) => c && c.value && c.label)
          .map((c) => ({
            id: c.id ?? c.value,
            value: String(c.value),
            label: String(c.label),
            img: c.img || c.icon || c.image_url || null,
          }));

        if (normalized.length > 0) setCategories(normalized);
      } catch (err) {
        console.error('fetchCategories error:', err);
        // On garde DEFAULT_CATEGORIES si erreur
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // ✅ 2) Map rapide value => label
  const categoryLabelMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(String(c.value), String(c.label)));
    return map;
  }, [categories]);

  const categoryLabel = (value) => categoryLabelMap.get(String(value)) || value || '—';

  // ✅ 3) Fetch associations (avec filtre categories)
  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCategories.length > 0) params.categories = selectedCategories.join(',');

        const res = await axios.get(`${API_BASE}/associations/public`, { params });
        setAssociations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('fetchAssociations error:', err);
        setAssociations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssociations();
  }, [selectedCategories]);

  const filteredAssociations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = Array.isArray(associations) ? [...associations] : [];
    if (!q) return list;

    return list.filter((a) => {
      const nom = (a.nom || '').toLowerCase();
      const adresse = (a.adresse || '').toLowerCase();
      const cat = String(a.categorie || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      return nom.includes(q) || adresse.includes(q) || cat.includes(q) || desc.includes(q);
    });
  }, [associations, searchQuery]);

  return (
    <div className="associations-page">
      <div className="associations-header">
        <div className="associations-header-text">
          <h1 className="associations-title">Associations</h1>
          <p className="associations-subtitle">
            Découvrez <strong>{loading ? '...' : filteredAssociations.length}</strong>{' '}
            association{!loading && filteredAssociations.length !== 1 ? 's' : ''} partenaire
            {!loading && filteredAssociations.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <div className="associations-toolbar">
        <div className="associations-search">
          <span className="associations-search-icon" aria-hidden="true">🔎</span>
          <input
            type="text"
            placeholder="Rechercher (nom, adresse, catégorie, description)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="associations-search-input"
          />
          {(searchQuery || selectedCategories.length > 0) && (
            <button
              type="button"
              className="associations-clear"
              onClick={resetFilters}
              aria-label="Réinitialiser"
              title="Réinitialiser"
            >
              ✕
            </button>
          )}
        </div>

        <div className="associations-filter-row">
          <button
            type="button"
            className="associations-filter-btn"
            onClick={() => setShowFilters((v) => !v)}
          >
            <span aria-hidden="true">🧰</span>
            Filtres
          </button>

          {selectedCategories.length > 0 && (
            <button
              type="button"
              className="associations-filter-reset"
              onClick={() => setSelectedCategories([])}
            >
              Réinitialiser catégories
            </button>
          )}
        </div>

        {showFilters && (
          <div className="associations-filters-box">
            <h3 className="associations-filters-title">Catégories</h3>

            {categoriesLoading ? (
              <p style={{ margin: 0, opacity: 0.8 }}>Chargement des catégories...</p>
            ) : (
              <div className="associations-categories">
                {categories.map((cat) => {
                  const active = selectedCategories.includes(cat.value);
const img = cat.img
  ? (cat.img.startsWith('http') ? cat.img : `${API_BASE}/upload/${cat.img}`)
  : (CATEGORY_IMAGES[cat.value] || autreImg);
                  return (
                    <button
                      key={cat.id ?? cat.value}
                      type="button"
                      onClick={() => toggleCategory(cat.value)}
                      className={`associations-category ${active ? 'active' : ''}`}
                    >
                      <span className="associations-category-icon" aria-hidden="true">
                        <img src={img} alt="" className="associations-category-img" />
                      </span>
                      <span className="associations-category-label">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="associations-content">
        {loading ? (
          <p className="loading-text">Chargement...</p>
        ) : filteredAssociations.length === 0 ? (
          <div className="associations-empty">
            <div className="associations-empty-emoji" aria-hidden="true">🔍</div>
            <h2>Aucune association trouvée</h2>
            <p>Essayez de modifier votre recherche / filtres.</p>
            <button className="associations-reset" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>
        ) : (
          <div className="associations-grid">
            {filteredAssociations.map((assoc) => {
              const beneficiaries = Number(assoc.beneficiaries_count || 0);

              return (
                <div
                  key={assoc.id}
                  className="association-card"
                  onClick={() => navigate(`/association/${assoc.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/association/${assoc.id}`);
                  }}
                >
                  <div className="card-header">
                    {assoc.logo ? (
                      <div className="assoc-logoWrap" aria-hidden="true">
                        <img
                          src={`${API_BASE}/upload/${assoc.logo}`}
                          alt=""
                          className="assoc-logoImg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="assoc-avatar" aria-hidden="true">
                        {String(assoc.nom || 'A')[0]?.toUpperCase()}
                      </div>
                    )}

                    <div className="assoc-head-text">
                      <div className="assoc-toprow">
                        <h3 className="assoc-name">{assoc.nom}</h3>
                        <span className="assoc-chip">{categoryLabel(assoc.categorie)}</span>
                      </div>

                      {assoc.adresse && (
                        <div className="assoc-location" title={assoc.adresse}>
                          <span aria-hidden="true">📍</span>
                          <span className="assoc-location-text">{assoc.adresse}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-body">
                    <p className="assoc-desc">
                      {assoc.description || "Aucune description n’a été ajoutée pour le moment."}
                    </p>

                    <div className="assoc-metric-row">
                      <div className="assoc-metric">
                        <span className="assoc-metric-icon" aria-hidden="true">👥</span>
                        <span className="assoc-metric-text">{beneficiaries} bénéficiaires</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    {assoc.id && (
                      <div className="assoc-qr">
                        <QRCodeSVG
                          value={`http://${LOCAL_IP}:3000/association/${assoc.id}`}
                          size={80}
                        />
                        <small>Scannez pour voir les détails</small>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssociationsListPage;