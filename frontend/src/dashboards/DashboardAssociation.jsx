import { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './DashboardAssociation.css';
import { Home, Users, FileText, Gift, IdCard, LogOut, BarChart3, TrendingUp, Download } from 'lucide-react';

// ✅ Charts (Recharts) — installe: npm i recharts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const API = 'http://localhost:5000';

const DashboardAssociation = () => {
  const { user, logout, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [demandes, setDemandes] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [donneurs, setDonneurs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('compte');
  const [editingId, setEditingId] = useState(null);
  const [pourcentage, setPourcentage] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    description: '',
    categorie: '',
    logo: '',
  });
  const [logoFile, setLogoFile] = useState(null);

  const authHeaders = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const normalize = (s) => (s ?? '').toString().trim().toLowerCase();

  // =========================
  // ✅ Transparence helpers
  // =========================
  const monthKey = (dateLike) => {
    const d = dateLike ? new Date(dateLike) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const yearKey = (dateLike) => {
    const d = dateLike ? new Date(dateLike) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return String(d.getFullYear());
  };

  const formatMonthLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${m}/${y}`;
  };

  const asNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // =========================
  // ✅ Export CSV Helpers
  // =========================
  const convertToCSV = (data, headers) => {
    if (!data || data.length === 0) return '';
    const headerRow = headers.map(h => h.label).join(',');
    const rows = data.map(item => 
      headers.map(h => {
        const value = item[h.key] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportDonneursCSV = () => {
    if (donneurs.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    const headers = [
      { key: 'donneur_nom', label: 'Nom Donneur' },
      { key: 'donneur_email', label: 'Email Donneur' },
      { key: 'beneficiaire_nom', label: 'Nom Bénéficiaire' },
      { key: 'beneficiaire_prenom', label: 'Prénom Bénéficiaire' },
      { key: 'montant', label: 'Montant (DT)' },
      { key: 'date_don', label: 'Date du Don' },
    ];
    const formattedData = donneurs.map(d => ({
      ...d,
      date_don: d.date_don ? new Date(d.date_don).toLocaleDateString('fr-FR') : '',
      montant: d.montant ?? 0,
    }));
    const csv = convertToCSV(formattedData, headers);
    downloadCSV(csv, `donneurs_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportBeneficiairesCSV = () => {
    if (beneficiaires.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    const headers = [
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' },
      { key: 'montant_a_collecter', label: 'Montant à Collecter (DT)' },
      { key: 'montant_restant', label: 'Montant Restant (DT)' },
      { key: 'pourcentage', label: 'Pourcentage (%)' },
    ];
    const csv = convertToCSV(beneficiaires, headers);
    downloadCSV(csv, `beneficiaires_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportDemandesCSV = () => {
    if (demandes.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    const headers = [
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' },
      { key: 'email', label: 'Email' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'cin', label: 'CIN' },
      { key: 'montant_a_collecter', label: 'Montant à Collecter (DT)' },
      { key: 'statut', label: 'Statut' },
      { key: 'date_naissance', label: 'Date Naissance' },
    ];
    const formattedData = demandes.map(d => ({
      ...d,
      date_naissance: d.date_naissance ? new Date(d.date_naissance).toLocaleDateString('fr-FR') : '',
    }));
    const csv = convertToCSV(formattedData, headers);
    downloadCSV(csv, `demandes_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportAllTransparence = () => {
    const summary = {
      export_date: new Date().toLocaleString('fr-FR'),
      association: user?.nom,
      stats: {
        total_donneurs: stats.totalDonneurs,
        total_beneficiaires: stats.totalBeneficiaires,
        total_demandes: stats.totalDemandes,
        dons_recus: donneurs.reduce((acc, d) => acc + asNumber(d.montant), 0),
        total_collecte_beneficiaires: beneficiairesStats.totalCollecte,
      }
    };
    const csvSummary = `Donnée,Valeur\n` + 
      Object.entries(summary.stats).map(([k, v]) => `"${k}","${v}"`).join('\n');
    downloadCSV(csvSummary, `transparence_resume_${new Date().toISOString().split('T')[0]}.csv`);
    
    setTimeout(() => {
      exportDonneursCSV();
      setTimeout(() => exportBeneficiairesCSV(), 300);
      setTimeout(() => exportDemandesCSV(), 600);
    }, 500);
    alert('📦 Export en cours : 4 fichiers CSV vont être téléchargés');
  };

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/demandes_beneficiaire`, { headers: authHeaders });
      setDemandes(res.data);
    } catch (err) {
      console.error('Erreur fetchDemandes:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchBeneficiaires = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/associations/beneficiaires`, { headers: authHeaders });
      setBeneficiaires(res.data);
    } catch (err) {
      console.error('Erreur fetchBeneficiaires:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchDonneurs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/associations/donneurs`, { headers: authHeaders });
      setDonneurs(res.data);
    } catch (err) {
      console.error('Erreur fetchDonneurs:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchMyAssociationProfile = useCallback(async () => {
    if (!user?.token) return;
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/associations/me`, { headers: authHeaders });
      setProfile({
        nom: res.data?.nom || '',
        email: res.data?.email || '',
        telephone: res.data?.telephone || '',
        adresse: res.data?.adresse || '',
        description: res.data?.description || '',
        categorie: res.data?.categorie || '',
        logo: res.data?.logo || '',
      });
    } catch (err) {
      console.error('Erreur fetchMyAssociationProfile:', err);
      alert(err.response?.data?.message || 'Erreur lors du chargement du profil');
    } finally {
      setProfileLoading(false);
    }
  }, [authHeaders, user?.token]);

  useEffect(() => {
    if (!user || user.role !== 'association') {
      if (user) logout();
      navigate('/login');
      return;
    }

    if (activeTab === 'compte' || activeTab === 'card') {
      fetchMyAssociationProfile();
      return;
    }

    if (activeTab === 'donneurs') fetchDonneurs();
    if (activeTab === 'demandes') fetchDemandes();
    if (activeTab === 'beneficiaires') fetchBeneficiaires();

    if (activeTab === 'transparence') {
      fetchDonneurs();
      fetchBeneficiaires();
      fetchDemandes();
    }
  }, [
    user,
    activeTab,
    fetchDemandes,
    fetchBeneficiaires,
    fetchDonneurs,
    fetchMyAssociationProfile,
    logout,
    navigate,
  ]);

  const stats = useMemo(() => {
    const totalDemandes = demandes.length;
    const accepted = demandes.filter((d) => normalize(d.statut) === 'accepted').length;
    const rejected = demandes.filter((d) => normalize(d.statut) === 'rejected').length;
    const pending = totalDemandes - accepted - rejected;

    return {
      totalDemandes,
      pendingDemandes: pending,
      totalBeneficiaires: beneficiaires.length,
      totalDonneurs: donneurs.length,
    };
  }, [demandes, beneficiaires.length, donneurs.length]);

  // =========================
  // ✅ Transparence data (charts)
  // =========================
  const donsParMois = useMemo(() => {
    const map = new Map();
    for (const d of donneurs) {
      const k = monthKey(d.date_don);
      if (!k) continue;
      const prev = map.get(k) || { month: k, totalMontant: 0, nombreDons: 0 };
      prev.totalMontant += asNumber(d.montant);
      prev.nombreDons += 1;
      map.set(k, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [donneurs]);

  const donsParAn = useMemo(() => {
    const map = new Map();
    for (const d of donneurs) {
      const k = yearKey(d.date_don);
      if (!k) continue;
      const prev = map.get(k) || { year: k, totalMontant: 0, nombreDons: 0 };
      prev.totalMontant += asNumber(d.montant);
      prev.nombreDons += 1;
      map.set(k, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [donneurs]);

  const beneficiairesStats = useMemo(() => {
    const totalACollecter = beneficiaires.reduce((acc, b) => acc + asNumber(b.montant_a_collecter), 0);
    const totalRestant = beneficiaires.reduce((acc, b) => acc + asNumber(b.montant_restant), 0);
    const totalCollecte = Math.max(0, totalACollecter - totalRestant);

    return {
      totalACollecter,
      totalRestant,
      totalCollecte,
    };
  }, [beneficiaires]);

  const hasMonthly = donsParMois.length > 0;
  const hasYearly = donsParAn.length > 0;

  const tabMeta = {
    card: { title: 'Mon card', subtitle: 'Informations publiques de votre association + QR code.' },
    compte: { title: 'Mon Profil', subtitle: 'Gérez les informations de votre association.' },
    donneurs: { title: 'Donneurs', subtitle: 'Consultez la liste des dons effectués pour vos bénéficiaires.' },
    demandes: { title: 'Demandes', subtitle: 'Gérez les demandes des bénéficiaires : accepter ou refuser.' },
    beneficiaires: { title: 'Bénéficiaires', subtitle: 'Gérez les bénéficiaires : suivi des montants et pourcentage.' },
    transparence: { title: 'Transparence', subtitle: "Visualisez vos statistiques d'impact et de collecte." },
  };

  const currentTitle = tabMeta[activeTab]?.title || 'Dashboard';
  const currentSubtitle = tabMeta[activeTab]?.subtitle || 'Association';

  const filteredDemandes = demandes.filter((d) => {
    const q = normalize(search);
    return (
      normalize(d.nom).includes(q) ||
      normalize(d.prenom).includes(q) ||
      normalize(d.cin).includes(q) ||
      normalize(d.email).includes(q)
    );
  });

  const filteredBeneficiaires = beneficiaires.filter((b) => {
    const q = normalize(search);
    return normalize(b.nom).includes(q) || normalize(b.prenom).includes(q) || normalize(b.cin).includes(q);
  });

  const filteredDonneurs = donneurs.filter((d) => {
    const q = normalize(search);
    return (
      normalize(d.donneur_nom).includes(q) ||
      normalize(d.donneur_email).includes(q) ||
      normalize(d.beneficiaire_nom).includes(q) ||
      normalize(d.beneficiaire_prenom).includes(q)
    );
  });

  const downloadFile = async (demandeId, field) => {
    try {
      const res = await axios.get(`${API}/demandes_beneficiaire/download/${demandeId}/${field}`, {
        headers: authHeaders,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;

      const disposition = res.headers['content-disposition'];
      let fileName = 'document';
      if (disposition && disposition.includes('filename=')) fileName = disposition.split('filename=')[1].replace(/"/g, '');

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      alert(err.response?.data?.message || 'Erreur téléchargement');
    }
  };

  const badgeClassDemande = (statut) => {
    const v = normalize(statut);
    if (v === 'accepted') return 'badge badge--success';
    if (v === 'rejected') return 'badge badge--danger';
    return 'badge badge--neutral';
  };

  const updateStatut = async (id, nouveauStatut) => {
    const confirmation = window.confirm(
      `Voulez-vous vraiment ${nouveauStatut === 'accepted' ? 'accepter' : 'refuser'} cette demande ?`,
    );
    if (!confirmation) return;

    try {
      await axios.put(`${API}/demandes_beneficiaire/${id}/statut`, { statut: nouveauStatut }, { headers: authHeaders });
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut: nouveauStatut } : d)));
    } catch (err) {
      console.error('Erreur updateStatut:', err);
      alert(err.response?.data?.message || 'Erreur serveur');
    }
  };

  const updatePourcentage = async (id) => {
    try {
      await axios.put(`${API}/associations/beneficiaire/${id}/pourcentage`, { pourcentage }, { headers: authHeaders });
      setBeneficiaires((prev) =>
        prev.map((b) => (b.id === id ? { ...b, pourcentage: Number(pourcentage) } : b)),
      );
      setEditingId(null);
      setPourcentage('');
      alert('Pourcentage mis à jour !');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur serveur');
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await axios.put(
        `${API}/associations/me`,
        {
          nom: profile.nom,
          description: profile.description,
          categorie: profile.categorie,
          telephone: profile.telephone,
          adresse: profile.adresse,
        },
        { headers: authHeaders },
      );
      if (typeof login === 'function') login({ ...user, nom: profile.nom });
      alert('Profil mis à jour !');
    } catch (err) {
      console.error('Erreur saveProfile:', err);
      alert(err.response?.data?.message || 'Erreur serveur');
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return alert('Choisis un fichier logo');
    const form = new FormData();
    form.append('logo', logoFile);

    setProfileSaving(true);
    try {
      const res = await axios.put(`${API}/associations/me/logo`, form, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });
      setProfile((p) => ({ ...p, logo: res.data?.logo || p.logo }));
      setLogoFile(null);
      alert('Logo mis à jour !');
    } catch (err) {
      console.error('Erreur uploadLogo:', err);
      alert(err.response?.data?.message || 'Erreur serveur');
    } finally {
      setProfileSaving(false);
    }
  };

  const logoSrc = profile.logo ? `${API}/upload/${profile.logo}` : '';
  const LOCAL_IP = window.location.hostname || 'localhost';
  const assocIdForQr = user?.id;
  const qrValue = assocIdForQr
    ? `http://${LOCAL_IP}:3000/association/${assocIdForQr}`
    : `http://${LOCAL_IP}:3000/associations`;

  if (loading && activeTab !== 'compte' && activeTab !== 'card') {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <div className="admin-main">
            <div className="admin-loading">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON'ACT</div>
              <div className="admin-brand__sub">Association Panel</div>
            </div>
          </div>

          <nav className="admin-nav admin-nav--icons">
            <button
              className={`admin-nav__item ${activeTab === 'compte' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('compte')}
            >
              <Home className="nav-ic" />
              <span>Profil</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'beneficiaires' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('beneficiaires')}
            >
              <Users className="nav-ic" />
              <span>Bénéficiaires</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'demandes' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('demandes')}
            >
              <FileText className="nav-ic" />
              <span>Demandes</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'donneurs' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('donneurs')}
            >
              <Gift className="nav-ic" />
              <span>Dons reçus</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'transparence' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('transparence')}
            >
              <BarChart3 className="nav-ic" />
              <span>Transparence</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'card' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('card')}
            >
              <IdCard className="nav-ic" />
              <span>Mon card</span>
            </button>
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">
                {(user?.nom?.[0] || user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || 'Association'}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>

            <button
              className="btn btn--danger btn--block btn--withIcon"
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="btn-ic" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        <main className="admin-main">
          {activeTab === 'compte' ? (
            <div className="assoc-profile-page">
              <div className="assoc-profile-header">
                <h1 className="assoc-profile-title">Mon Profil</h1>
                <p className="assoc-profile-subtitle">Gérez les informations de votre association</p>
              </div>

              <div className="assoc-profile-card">
                {profileLoading ? (
                  <div className="admin-loading">Chargement...</div>
                ) : (
                  <>
                    <div className="assoc-profile-top">
                      <div className="assoc-profile-logoBox">
                        {logoSrc ? (
                          <img src={logoSrc} alt="Logo" className="assoc-profile-logoImg" />
                        ) : (
                          <div className="assoc-profile-logoFallback">
                            {String(profile.nom || 'A')[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="assoc-profile-topText">
                        <h2 className="assoc-profile-name">{profile.nom || '—'}</h2>
                        <p className="assoc-profile-desc">
                          {profile.description?.trim() ? profile.description : '—'}
                        </p>

                        <div className="assoc-profile-badges">
                          {profile.categorie && <span className="assoc-badge">🏷️ {profile.categorie}</span>}
                          {profile.adresse && <span className="assoc-badge">📍 {profile.adresse}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="assoc-profile-actions">
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => alert('Vous pouvez éditer en bas dans les formulaires.')}
                      >
                        ✏️ Éditer le profil
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="assoc-profile-card">
                <div className="assoc-profile-sectionTitle">Informations de contact</div>

                {profileLoading ? (
                  <div className="admin-loading">Chargement...</div>
                ) : (
                  <div className="assoc-profile-formGrid">
                    <div className="field">
                      <label>Email</label>
                      <input className="input input--full" value={profile.email} disabled />
                    </div>

                    <div className="field">
                      <label>Téléphone</label>
                      <input
                        className="input input--full"
                        value={profile.telephone}
                        onChange={(e) => setProfile((p) => ({ ...p, telephone: e.target.value }))}
                      />
                    </div>

                    <div className="field">
                      <label>Catégorie</label>
                      <input
                        className="input input--full"
                        value={profile.categorie}
                        onChange={(e) => setProfile((p) => ({ ...p, categorie: e.target.value }))}
                      />
                    </div>

                    <div className="field">
                      <label>Adresse</label>
                      <input
                        className="input input--full"
                        value={profile.adresse}
                        onChange={(e) => setProfile((p) => ({ ...p, adresse: e.target.value }))}
                      />
                    </div>

                    <div className="field field--full">
                      <label>Nom</label>
                      <input
                        className="input input--full"
                        value={profile.nom}
                        onChange={(e) => setProfile((p) => ({ ...p, nom: e.target.value }))}
                      />
                    </div>

                    <div className="field field--full">
                      <label>Description</label>
                      <textarea
                        className="input input--full textarea"
                        value={profile.description}
                        onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>

                    <div className="field field--full">
                      <div className="assoc-profile-inlineActions">
                        <button
                          className="btn btn--primary"
                          type="button"
                          disabled={profileSaving}
                          onClick={saveProfile}
                        >
                          {profileSaving ? 'Sauvegarde...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="assoc-profile-card">
                <div className="assoc-profile-sectionTitle">Changer le logo</div>

                <div className="upload-row">
                  <input
                    className="file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  <button
                    className="btn btn--ghost"
                    type="button"
                    disabled={profileSaving || !logoFile}
                    onClick={uploadLogo}
                  >
                    {profileSaving ? 'Upload...' : 'Mettre à jour le logo'}
                  </button>
                </div>

                <div className="upload-hint">Formats recommandés: PNG/JPG. Taille max ~ 2-5MB.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-topbar">
                <div>
                  <h1 className="admin-title">{currentTitle}</h1>
                  <p className="admin-subtitle">{currentSubtitle}</p>
                </div>
              </div>

              <section className="admin-card">
                {activeTab !== 'card' && (
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">{currentTitle}</h2>
                      <p className="admin-card__desc">{currentSubtitle}</p>
                    </div>

                    <div className="admin-card__tools">
                      <input
                        type="text"
                        className="input"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'card' && (
                  <div className="assoc-card-wrap">
                    {profileLoading ? (
                      <div className="admin-loading">Chargement...</div>
                    ) : (
                      <div className="assoc-card">
                        <div className="assoc-card__logoText">
                          DON'AC<span>T</span>
                        </div>

                        <div className="assoc-card__logoBox">
                          {logoSrc ? (
                            <img src={logoSrc} alt="Logo" className="assoc-card__logoImg" />
                          ) : (
                            <div className="assoc-card__logoPlaceholder">
                              {String(profile.nom || 'A')[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="assoc-card__name">{profile.nom || '—'}</div>

                        <div className="assoc-card__grid">
                          <div className="assoc-card__field">
                            <div className="assoc-card__label">Téléphone</div>
                            <div className="assoc-card__value">{profile.telephone || '—'}</div>
                          </div>

                          <div className="assoc-card__field">
                            <div className="assoc-card__label">Catégorie</div>
                            <div className="assoc-card__value">{profile.categorie || '—'}</div>
                          </div>

                          <div className="assoc-card__field assoc-card__field--full">
                            <div className="assoc-card__label">Adresse</div>
                            <div className="assoc-card__value">{profile.adresse || '—'}</div>
                          </div>

                          <div className="assoc-card__field assoc-card__field--full">
                            <div className="assoc-card__label">Description</div>
                            <div className="assoc-card__value assoc-card__value--desc">
                              {profile.description?.trim() ? profile.description : '—'}
                            </div>
                          </div>
                        </div>

                        <div className="assoc-card__qr">
                          <QRCodeSVG value={qrValue} size={96} />
                          <div className="assoc-card__qrText">Scannez pour voir les détails</div>
                        </div>

                        <div className="assoc-card__footer">Carte association DON'ACT</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ TRANSPARENCE avec bouton Export */}
                {activeTab === 'transparence' && (
                  <div className="transparency-page">
                    
                    {/* Toolbar Export */}
                    <div className="transparency-toolbar">
                      <div>
                        <h3 className="transparency-toolbar__title">Tableau de bord</h3>
                        <p className="transparency-toolbar__subtitle">Statistiques et données d'impact</p>
                      </div>
                      
                      <div className="transparency-toolbar__actions">
                        <button 
                          className="btn btn--primary btn--withIcon"
                          type="button"
                          onClick={exportAllTransparence}
                          title="Exporter toutes les données en CSV"
                        >
                          <Download className="btn-ic" />
                          <span>Exporter les données</span>
                        </button>
                        
                        <div className="dropdown">
                          
                          
                        </div>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="transparency-grid">
                      <div className="tcard">
                        <TrendingUp className="tcard-ic tcard-ic--primary" />
                        <div className="tcard-value">{stats.totalDonneurs}</div>
                        <div className="tcard-label">Donneurs</div>
                        <div className="tcard-hint">Nombre total de donneurs</div>
                      </div>

                      <div className="tcard">
                        <Users className="tcard-ic tcard-ic--blue" />
                        <div className="tcard-value">{stats.totalBeneficiaires}</div>
                        <div className="tcard-label">Bénéficiaires</div>
                        <div className="tcard-hint">Bénéficiaires aidés</div>
                      </div>

                      <div className="tcard">
                        <FileText className="tcard-ic tcard-ic--orange" />
                        <div className="tcard-value">{stats.totalDemandes}</div>
                        <div className="tcard-label">Demandes</div>
                        <div className="tcard-hint">{stats.pendingDemandes} en attente</div>
                      </div>

                      <div className="tcard">
                        <Gift className="tcard-ic tcard-ic--green" />
                        <div className="tcard-value">{donneurs.length}</div>
                        <div className="tcard-label">Dons reçus</div>
                        <div className="tcard-hint">Total des dons pour vos bénéficiaires</div>
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="tcharts">
                      {/* Dons par mois */}
                      <div className="tchart">
                        <div className="tchart-head">
                          <div>
                            <div className="tchart-title">Dons reçus par mois</div>
                            <div className="tchart-sub">Montant total + nombre de dons (mensuel)</div>
                          </div>
                        </div>

                        {hasMonthly ? (
                          <div className="tchart-body">
                            <ResponsiveContainer width="100%" height={320}>
                              <LineChart data={donsParMois}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
                                <YAxis />
                                <Tooltip
                                  formatter={(value, name) => {
                                    if (name === 'totalMontant') return [`${value} DT`, 'Montant'];
                                    if (name === 'nombreDons') return [value, 'Nombre de dons'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label) => `Mois: ${formatMonthLabel(label)}`}
                                />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="totalMontant"
                                  name="Montant (DT)"
                                  stroke="#0ea5e9"
                                  strokeWidth={3}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="nombreDons"
                                  name="Nombre de dons"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="tchart-empty">Aucune donnée de dons disponible pour le graphique mensuel.</div>
                        )}
                      </div>

                      {/* Dons par année */}
                      <div className="tchart">
                        <div className="tchart-head">
                          <div>
                            <div className="tchart-title">Dons reçus par année</div>
                            <div className="tchart-sub">Vue annuelle (montants + nombre)</div>
                          </div>
                        </div>

                        {hasYearly ? (
                          <div className="tchart-body">
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart data={donsParAn}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip
                                  formatter={(value, name) => {
                                    if (name === 'totalMontant') return [`${value} DT`, 'Montant'];
                                    if (name === 'nombreDons') return [value, 'Nombre de dons'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label) => `Année: ${label}`}
                                />
                                <Legend />
                                <Bar
                                  dataKey="totalMontant"
                                  name="Montant (DT)"
                                  fill="#0ea5e9"
                                  radius={[10, 10, 0, 0]}
                                />
                                <Bar
                                  dataKey="nombreDons"
                                  name="Nombre de dons"
                                  fill="#22c55e"
                                  radius={[10, 10, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="tchart-empty">Aucune donnée de dons disponible pour le graphique annuel.</div>
                        )}
                      </div>
                    </div>

                    {/* Résumé bénéficiaires */}
                    <div className="tbenef">
                      <div className="tbenef-title">Résumé bénéficiaires</div>
                      <div className="tbenef-grid">
                        <div className="tbenef-item">
                          <div className="tbenef-label">Total à collecter</div>
                          <div className="tbenef-value">{beneficiairesStats.totalACollecter} DT</div>
                        </div>
                        <div className="tbenef-item">
                          <div className="tbenef-label">Total collecté (estimé)</div>
                          <div className="tbenef-value">{beneficiairesStats.totalCollecte} DT</div>
                        </div>
                        <div className="tbenef-item">
                          <div className="tbenef-label">Total restant</div>
                          <div className="tbenef-value">{beneficiairesStats.totalRestant} DT</div>
                        </div>
                      </div>
                    </div>

                    {/* Note transparence */}
                    <div className="transparency-note">
                      <div className="transparency-note__title">Engagement de transparence</div>
                      <div className="transparency-note__text">
                        Ici vous pouvez suivre l'évolution de votre activité (dons, demandes, bénéficiaires) de manière
                        claire et vérifiable.
                        <br />
                        Nous encourageons les associations à partager régulièrement ces statistiques pour renforcer la
                        confiance avec leurs donateurs et bénéficiaires.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'donneurs' && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom du donneur</th>
                          <th>Email</th>
                          <th>Bénéficiaire</th>
                          <th>Montant</th>
                          <th>Date du don</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDonneurs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="empty-cell">
                              Aucun donneur trouvé
                            </td>
                          </tr>
                        ) : (
                          filteredDonneurs.map((d) => (
                            <tr key={`${d.donneur_id}-${d.beneficiaire_nom}-${d.date_don}`}>
                              <td>{d.donneur_nom}</td>
                              <td>{d.donneur_email}</td>
                              <td>
                                {d.beneficiaire_nom} {d.beneficiaire_prenom}
                              </td>
                              <td>{d.montant ? `${d.montant} DT` : '-'}</td>
                              <td>{d.date_don ? new Date(d.date_don).toLocaleDateString() : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'demandes' && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Email</th>
                          <th>Téléphone</th>
                          <th>CIN</th>
                          <th>Date Naissance</th>
                          <th>Adresse</th>
                          <th>Genre</th>
                          <th>Situation</th>
                          <th>Description</th>
                          <th>Montant à collecter</th>
                          <th>Documents</th>
                          <th>Statut</th>
                          <th className="th-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDemandes.length === 0 ? (
                          <tr>
                            <td colSpan={14} className="empty-cell">
                              Aucune demande.
                            </td>
                          </tr>
                        ) : (
                          filteredDemandes.map((d) => (
                            <tr key={d.id}>
                              <td>{d.nom}</td>
                              <td>{d.prenom}</td>
                              <td>{d.email}</td>
                              <td>{d.telephone || '-'}</td>
                              <td>{d.cin || '-'}</td>
                              <td>{d.date_naissance ? new Date(d.date_naissance).toLocaleDateString() : '-'}</td>
                              <td>{d.adresse || '-'}</td>
                              <td>{d.genre || '-'}</td>
                              <td>{d.situation_familiale || '-'}</td>
                              <td className="td-truncate" title={d.description || ''}>
                                {d.description || '-'}
                              </td>
                              <td>{d.montant_a_collecter ? `${d.montant_a_collecter} DT` : '-'}</td>
                              <td>
                                {d.doc_identite || d.doc_autre ? (
                                  <div className="dropdown">
                                    <button
                                      className="btn btn--info btn--sm"
                                      type="button"
                                      onClick={() => setOpenDropdown((prev) => (prev === d.id ? null : d.id))}
                                    >
                                      Document
                                    </button>
                                    {openDropdown === d.id && (
                                      <div className="dropdown-menu">
                                        {d.doc_identite && (
                                          <button
                                            className="dropdown-item"
                                            type="button"
                                            onClick={() => downloadFile(d.id, 'doc_identite')}
                                          >
                                            Identité
                                          </button>
                                        )}
                                        {d.doc_autre && (
                                          <button
                                            className="dropdown-item"
                                            type="button"
                                            onClick={() => downloadFile(d.id, 'doc_autre')}
                                          >
                                            Autre
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>
                              <td>
                                <span className={badgeClassDemande(d.statut)}>{d.statut || 'pending'}</span>
                              </td>
                              <td className="td-center">
                                <div className="btn-group">
                                  <button
                                    className="btn btn--success btn--sm"
                                    type="button"
                                    disabled={normalize(d.statut) === 'accepted'}
                                    onClick={() => updateStatut(d.id, 'accepted')}
                                  >
                                    Accepter
                                  </button>
                                  <button
                                    className="btn btn--danger btn--sm"
                                    type="button"
                                    disabled={normalize(d.statut) === 'rejected'}
                                    onClick={() => updateStatut(d.id, 'rejected')}
                                  >
                                    Refuser
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'beneficiaires' && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Montant à collecter</th>
                          <th>Montant restant</th>
                          <th>Pourcentage</th>
                          <th className="th-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBeneficiaires.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-cell">
                              Aucun bénéficiaire.
                            </td>
                          </tr>
                        ) : (
                          filteredBeneficiaires.map((b) => (
                            <tr key={b.id}>
                              <td>{b.nom}</td>
                              <td>{b.prenom}</td>
                              <td>{b.montant_a_collecter ? `${b.montant_a_collecter} DT` : '-'}</td>
                              <td>{b.montant_restant ? `${b.montant_restant} DT` : '-'}</td>
                              <td>{Number(b.pourcentage || 0)}%</td>
                              <td className="td-center">
                                {editingId === b.id ? (
                                  <div className="inline-edit">
                                    <input
                                      className="input input--sm"
                                      type="number"
                                      value={pourcentage}
                                      onChange={(e) => setPourcentage(e.target.value)}
                                      min="0"
                                      max="100"
                                    />
                                    <button
                                      className="btn btn--primary btn--sm"
                                      type="button"
                                      onClick={() => updatePourcentage(b.id)}
                                    >
                                      Valider
                                    </button>
                                    <button
                                      className="btn btn--ghost btn--sm"
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="btn btn--ghost btn--sm"
                                    type="button"
                                    onClick={() => {
                                      setEditingId(b.id);
                                      setPourcentage(b.pourcentage || 0);
                                    }}
                                  >
                                    Mettre à jour %
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardAssociation;