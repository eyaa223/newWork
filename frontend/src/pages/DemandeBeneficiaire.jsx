import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import demandeImg from '../assets/ajoutdemande.jpg';
import './DemandeBeneficiaire.css';

const API_BASE = 'http://localhost:5000';

const DemandeForm = () => {
  const navigate = useNavigate();

  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    cin: '',
    date_naissance: '',
    adresse: '',
    genre: '',
    situation_familiale: '',
    montant_a_collecter: '',
    description: '',
    association_id: '',
  });

  const descriptionLen = useMemo(() => formData.description.trim().length, [formData.description]);

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const res = await axios.get(`${API_BASE}/associations/public`);
        setAssociations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Erreur fetch associations:', err);
      }
    };
    fetchAssociations();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!formData.nom.trim()) return 'Veuillez saisir votre nom.';
    if (!formData.prenom.trim()) return 'Veuillez saisir votre prénom.';
    if (!formData.email.trim()) return 'Veuillez saisir votre email.';
    if (!formData.telephone.trim()) return 'Veuillez saisir votre téléphone.';
    if (!formData.cin.trim()) return 'Veuillez saisir votre CIN.';
    if (!formData.date_naissance) return 'Veuillez saisir votre date de naissance.';
    if (!formData.adresse.trim()) return 'Veuillez saisir votre adresse.';
    if (!formData.genre) return 'Veuillez sélectionner votre genre.';
    if (!formData.situation_familiale.trim()) return 'Veuillez saisir votre situation familiale.';
    if (!formData.montant_a_collecter || Number(formData.montant_a_collecter) <= 0)
      return 'Veuillez saisir un montant valide.';
    if (!formData.association_id) return 'Veuillez sélectionner une association.';
    if (!formData.description.trim() || formData.description.trim().length < 20)
      return 'La description doit contenir au moins 20 caractères.';
    return '';
  };
  const [files, setFiles] = useState({
  doc_identite: null,
  doc_autre: null,
});

// 🔹 Fonction pour gérer les fichiers
const handleFileChange = (e) => {
  const { name, files: selectedFiles } = e.target;
  if (selectedFiles.length > 2) {
    Swal.fire({
      icon: 'warning',
      title: 'Attention',
      text: 'Vous ne pouvez sélectionner que 2 fichiers maximum.',
    });
    return;
  }
  setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] })); // on garde 1 fichier par champ
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
    const formPayload = new FormData();
    // Ajouter tous les champs texte
    Object.keys(formData).forEach((key) => {
      formPayload.append(key, formData[key]);
    });

    // Ajouter les fichiers
    if (files.doc_identite) formPayload.append('doc_identite', files.doc_identite);
    if (files.doc_autre) formPayload.append('doc_autre', files.doc_autre);

    await axios.post(`${API_BASE}/demandes_beneficiaire`, formPayload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    Swal.fire({
      icon: 'success',
      title: 'Succès',
      text: 'Demande envoyée !',
      timer: 2500,
      showConfirmButton: false,
    });

    navigate('/');
  } catch (err) {
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
    <div className="db-page">
      <div className="db-shell">
        <header className="db-hero">
          <div className="db-hero-media" aria-hidden="true">
            <img src={demandeImg} alt="" className="db-hero-img" />
            <div className="db-hero-overlay">
              <div className="db-hero-badge">Demande Bénéficiaire</div>
              <h1 className="db-title">Faire une demande</h1>
              <p className="db-subtitle">Remplissez le formulaire. Nous traiterons votre demande dès que possible.</p>
            </div>
          </div>
        </header>

        <div className="db-card">
          <form onSubmit={handleSubmit} className="db-form">
  <div className="db-grid">

    <div className="db-field">
      <label>Nom <span className="required">*</span></label>
      <input type="text" name="nom" value={formData.nom} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Prénom <span className="required">*</span></label>
      <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Email <span className="required">*</span></label>
      <input type="email" name="email" value={formData.email} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Téléphone <span className="required">*</span></label>
      <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>CIN <span className="required">*</span></label>
      <input type="text" name="cin" value={formData.cin} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Date de naissance <span className="required">*</span></label>
      <input type="date" name="date_naissance" value={formData.date_naissance} onChange={handleChange} required />
    </div>

    <div className="db-field db-wide">
      <label>Adresse <span className="required">*</span></label>
      <textarea name="adresse" value={formData.adresse} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Genre <span className="required">*</span></label>
      <select name="genre" value={formData.genre} onChange={handleChange} required>
        <option value="">Sélectionnez</option>
        <option value="homme">Homme</option>
        <option value="femme">Femme</option>
        <option value="autre">Autre</option>
      </select>
    </div>

    <div className="db-field">
      <label>Situation familiale <span className="required">*</span></label>
      <input type="text" name="situation_familiale" value={formData.situation_familiale} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Montant à collecter (DT) <span className="required">*</span></label>
      <input type="number" name="montant_a_collecter" value={formData.montant_a_collecter} onChange={handleChange} required />
    </div>

    <div className="db-field">
      <label>Association <span className="required">*</span></label>
      <select name="association_id" value={formData.association_id} onChange={handleChange} required>
        <option value="">Sélectionnez une association</option>
        {associations.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nom}
          </option>
        ))}
      </select>
    </div>

    <div className="db-field db-wide">
      <label>Description <span className="required">*</span></label>
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        rows={3}
        required
      />
      <small>Minimum 20 caractères</small>
    </div>

    <div className="db-field">
      <label>Document d'identité </label>
      <input type="file" name="doc_identite" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} required />
    </div>

    <div className="db-field">
      <label>Autre document</label>
      <input type="file" name="doc_autre" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
    </div>

  </div>

            <button type="submit" className="db-submit" disabled={loading}>
              {loading ? (
                <span className="db-loading">
                  <span className="db-spinner" aria-hidden="true" /> Envoi...
                </span>
              ) : (
                'Envoyer la demande'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DemandeForm;