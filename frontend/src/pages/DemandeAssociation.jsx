import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './DemandeAssociation.css';

const API = 'http://localhost:5000';

// ✅ Hook personnalisé pour charger les catégories depuis la BDD
const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error('Erreur fetch catégories:', err);
        // Fallback statique si API échoue
        setCategories([
          { value: 'education', label: 'Éducation', img: '' },
          { value: 'health', label: 'Santé', img: '' },
          { value: 'food', label: 'Alimentation', img: '' },
          { value: 'housing', label: 'Logement', img: '' },
          { value: 'emergency', label: 'Urgence', img: '' },
          { value: 'skills', label: 'Formation', img: '' },
          { value: 'other', label: 'Autre', img: '' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
};

const DemandeAssociation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // ✅ Charger les catégories depuis la BDD
  const { categories: dbCategories, loading: categoriesLoading } = useCategories();

  const [form, setForm] = useState({
    nom_association: '',
    email: '',
    telephone: '',
    adresse: '',
    responsable: '',
    categorie: '',
    description: '',
    logo: null,
    doc_statut: null,
    doc_autorisation: null,
    doc_registre: null,
    doc_cin: null,
  });

  const selectedCategory = useMemo(
    () => dbCategories.find((c) => c.value === form.categorie) || null,
    [form.categorie, dbCategories],
  );

  const logoPreviewUrl = useMemo(() => {
    if (!form.logo) return '';
    return URL.createObjectURL(form.logo);
  }, [form.logo]);

  // ✅ cleanup objectURL
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e) => {
    const { name, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  const requiredDocs = [
    { key: 'doc_statut', label: 'Document Statut' },
    { key: 'doc_autorisation', label: 'Document Autorisation' },
    { key: 'doc_registre', label: 'Document Registre' },
    { key: 'doc_cin', label: 'Document CIN' },
  ];

  const missingDocsCount = requiredDocs.filter((d) => !form[d.key]).length;

  const validate = () => {
    if (!form.nom_association.trim()) return "Veuillez saisir le nom de l'association.";
    if (!form.email.trim()) return "Veuillez saisir l'email.";
    if (!form.telephone.trim()) return "Veuillez saisir le téléphone.";
    if (!form.responsable.trim()) return "Veuillez saisir le responsable.";
    if (!form.adresse.trim()) return "Veuillez saisir l'adresse.";
    if (!form.categorie) return "Veuillez sélectionner une catégorie.";
    if (!form.description.trim() || form.description.trim().length < 20)
      return "La description doit contenir au moins 20 caractères.";

    for (const d of requiredDocs) {
      if (!form[d.key]) return `Veuillez ajouter: ${d.label}.`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errMsg = validate();
    if (errMsg) {
      Swal.fire({ icon: 'warning', title: 'Vérifiez le formulaire', text: errMsg });
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('nom_association', form.nom_association);
      fd.append('email', form.email);
      fd.append('telephone', form.telephone);
      fd.append('adresse', form.adresse);
      fd.append('responsable', form.responsable);
      fd.append('categorie', form.categorie);
      fd.append('description', form.description);

      if (form.logo) fd.append('logo', form.logo);

      fd.append('doc_statut', form.doc_statut);
      fd.append('doc_autorisation', form.doc_autorisation);
      fd.append('doc_registre', form.doc_registre);
      fd.append('doc_cin', form.doc_cin);

      await axios.post(`${API}/demandes`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Swal.fire({
        icon: 'success',
        title: 'Demande envoyée',
        text: 'Votre demande a bien été envoyée. Nous vous contacterons après vérification.',
        timer: 2600,
        showConfirmButton: false,
      });

      navigate('/');
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err.response?.data?.message || 'Erreur serveur',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="da-page">
      <div className="da-shell">
        <header className="da-hero">
          <div className="da-hero-badge">Inscription Association</div>
          <h1 className="da-title">Demande d'inscription</h1>
          <p className="da-subtitle">
            Remplissez les informations, choisissez une catégorie, ajoutez une description et envoyez les documents requis.
          </p>

          <div className="da-steps" aria-hidden="true">
            <div className="da-step is-active">
              <span className="da-step-dot" />
              <span>Infos</span>
            </div>
            <div className={`da-step ${missingDocsCount === 0 ? 'is-active' : ''}`}>
              <span className="da-step-dot" />
              <span>Documents</span>
            </div>
            <div className={`da-step ${missingDocsCount === 0 && form.description ? 'is-active' : ''}`}>
              <span className="da-step-dot" />
              <span>Envoi</span>
            </div>
          </div>
        </header>

        <div className="da-card">
          <form onSubmit={handleSubmit} className="da-form">
            <div className="da-grid">
              {/* Nom association */}
              <div className="da-field">
                <label>
                  Nom de l'association <span className="required">*</span>
                </label>
                <input
                  required
                  name="nom_association"
                  value={form.nom_association}
                  onChange={handleChange}
                  placeholder="Nom de l'association"
                />
              </div>

              {/* Email */}
              <div className="da-field">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                />
              </div>

              {/* Téléphone */}
              <div className="da-field">
                <label>
                  Téléphone <span className="required">*</span>
                </label>
                <input
                  required
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="+216 ..."
                />
              </div>

              {/* Responsable */}
              <div className="da-field">
                <label>
                  Responsable <span className="required">*</span>
                </label>
                <input
                  required
                  name="responsable"
                  value={form.responsable}
                  onChange={handleChange}
                  placeholder="Nom du responsable"
                />
              </div>

              {/* Adresse */}
              <div className="da-field da-wide">
                <label>
                  Adresse <span className="required">*</span>
                </label>
                <textarea
                  required
                  name="adresse"
                  value={form.adresse}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Adresse complète"
                />
              </div>

              {/* ✅ Catégorie - DYNAMIQUE depuis BDD */}
              <div className="da-field da-wide">
                <label>
                  Catégorie <span className="required">*</span>
                </label>
                
                {categoriesLoading ? (
                  <div className="da-loading-mini">Chargement des catégories...</div>
                ) : (
                  <div className="da-category-row">
                    <select 
                      required 
                      name="categorie" 
                      value={form.categorie} 
                      onChange={handleChange}
                      disabled={dbCategories.length === 0}
                    >
                     
                      {dbCategories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    <div className="da-category-preview" aria-hidden="true">
                      {selectedCategory?.img ? (
                        <img 
                          src={selectedCategory.img.startsWith('http') 
                            ? selectedCategory.img 
                            : `${API}${selectedCategory.img}`} 
                          alt="" 
                          className="da-category-img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="da-category-placeholder">
                          {selectedCategory?.label || '—'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <small className="da-help">Cette catégorie sera affichée dans la liste publique des associations.</small>
              </div>

              {/* Description */}
              <div className="da-field da-wide">
                <div className="da-label-row">
                  <label>
                    Description (public) <span className="required">*</span>
                  </label>
                  <span className="da-counter">{form.description.trim().length} caractères</span>
                </div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Décrivez votre association, vos missions, les actions principales..."
                  required
                />
                <small className="da-help">Cette description sera visible pour les donneurs sur la page publique.</small>
              </div>

              {/* Logo (optionnel) */}
              <div className="da-field da-wide">
                <label>Logo / Photo (optionnel)</label>
                <div className="da-logo-row">
                  <input type="file" name="logo" accept="image/*" onChange={handleFile} />
                  <div className="da-logo-preview" aria-hidden="true">
                    {form.logo ? (
                      <img src={logoPreviewUrl} alt="" className="da-logo-img" />
                    ) : (
                      <span className="da-logo-placeholder">Aucun logo</span>
                    )}
                  </div>
                </div>
                <small className="da-help">Formats recommandés: PNG/JPG.</small>
              </div>

              {/* Documents requis */}
              <div className="da-docs">
                <div className="da-docs-head">
                  <h2 className="da-docs-title">Documents requis</h2>
                  <div className="da-docs-badge">
                    {missingDocsCount === 0 ? '✅ Complet' : `⏳ ${missingDocsCount} manquant(s)`}
                  </div>
                </div>

                <div className="da-doc-grid">
                  {requiredDocs.map((d) => (
                    <div key={d.key} className="da-file">
                      <label>
                        {d.label} <span className="required">*</span>
                      </label>
                      <input required type="file" name={d.key} onChange={handleFile} />
                      {form[d.key] && <div className="da-file-name">{form[d.key].name}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button className="da-submit" type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer demande'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DemandeAssociation;