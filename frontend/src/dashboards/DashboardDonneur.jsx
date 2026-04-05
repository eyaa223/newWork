import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardDonneur.css';
import {
  IdCard, User, HandHeart, Building2, ArrowLeft, LogOut, Download, TrendingUp, MessageSquare, Edit2, Trash2, X, Check
} from 'lucide-react';

const API = 'http://localhost:5000';
const UPLOADS = `${API}/upload`;

const CATEGORY_META = {
  education: { label: 'Éducation', emoji: '🎓' },
  health: { label: 'Santé', emoji: '🏥' },
  food: { label: 'Alimentation', emoji: '🍎' },
  housing: { label: 'Logement', emoji: '🏠' },
  emergency: { label: 'Urgence', emoji: '🆘' },
  skills: { label: 'Formation', emoji: '💻' },
  other: { label: 'Autre', emoji: '❤️' },
};

const QUICK_AMOUNTS = [10, 25, 50, 100];

const DashboardDonneur = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dons');
  const [associations, setAssociations] = useState([]);
  const [selectedAssoc, setSelectedAssoc] = useState(null);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [mesDons, setMesDons] = useState([]);
  const [mesMessages, setMesMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profile, setProfile] = useState({ nom: '', email: '', numero_bancaire: '' });

  // ✅ Inline CreateDon panel
  const [donPanelOpen, setDonPanelOpen] = useState(false);
  const [donTarget, setDonTarget] = useState(null);
  const [donMontant, setDonMontant] = useState('');
  const [donNumeroBancaire, setDonNumeroBancaire] = useState('');
  const [donMessage, setDonMessage] = useState('');
  const [donAnonymous, setDonAnonymous] = useState(false);
  const [donSubmitting, setDonSubmitting] = useState(false);
  const [donError, setDonError] = useState('');
  const [donSuccess, setDonSuccess] = useState('');

  // ✅ Messages editing state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedMessageText, setEditedMessageText] = useState('');
  const [messageSaving, setMessageSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'donneur') {
      if (user) logout();
      navigate('/login');
      return;
    }
  }, [user, logout, navigate]);

  const authHeader = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const initials = useMemo(() => {
    const a = (user?.nom || profile?.nom || user?.email || 'D').toString().trim()[0] || 'D';
    return a.toUpperCase();
  }, [user?.nom, user?.email, profile?.nom]);

  const normalize = (s) => (s ?? '').toString().trim().toLowerCase();

  const formatDateFr = (dateLike) => {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR');
  };

  // =========================
  // ✅ Export CSV
  // =========================
  const exportMyDonationsCSV = () => {
    const list = Array.isArray(mesDons) ? mesDons : [];
    const rows = list.map((d) => ({
      beneficiaire: `${d.beneficiaire_nom || ''} ${d.beneficiaire_prenom || ''}`.trim() || '—',
      montant: Number(d.montant || 0),
      numero_bancaire: d.numero_bancaire || '',
      montant_restant: d.montant_restant ?? '',
      date: formatDateFr(d.created_at || d.date || d.date_don),
      statut: 'Complété',
    }));

    const header = ['Beneficiaire', 'Montant', 'NumeroBancaire', 'MontantRestant', 'Date', 'Statut'];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${String(r.beneficiaire).replaceAll('"', '""')}"`,
          r.montant,
          `"${String(r.numero_bancaire).replaceAll('"', '""')}"`,
          r.montant_restant,
          `"${String(r.date).replaceAll('"', '""')}"`,
          `"${String(r.statut).replaceAll('"', '""')}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-dons-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // =========================
  // ✅ Fetch Functions
  // =========================
  const fetchMesDons = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/mine`, { headers: authHeader });
      setMesDons(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch dons', err);
      setMesDons([]);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const fetchMesMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/mes-messages`, { headers: authHeader });
      setMesMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch messages', err);
      setMesMessages([]);
    }
  }, [authHeader]);

  const fetchAssociations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/associations`, { headers: authHeader });
      setAssociations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch associations', err);
      setAssociations([]);
    }
  }, [authHeader]);

  const fetchBeneficiaires = useCallback(
    async (assocId) => {
      try {
        const res = await axios.get(`${API}/api/associations/${assocId}/beneficiaires`, { headers: authHeader });
        setBeneficiaires(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Erreur fetch bénéficiaires', err);
        setBeneficiaires([]);
      }
    },
    [authHeader],
  );

  const fetchMyProfile = useCallback(async () => {
    if (!user?.token) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await axios.get(`${API}/api/me`, { headers: authHeader });
      setProfile({
        nom: res.data?.nom || '',
        email: res.data?.email || '',
        numero_bancaire: res.data?.numero_bancaire || '',
      });
    } catch (err) {
      console.error('[DashboardDonneur] fetchMyProfile error', err);
      setProfileError(err.response?.data?.message || 'Impossible de charger votre profil.');
    } finally {
      setProfileLoading(false);
    }
  }, [authHeader, user?.token]);

  const saveProfile = async () => {
    if (!user?.token) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      await axios.put(`${API}/api/me`, { nom: profile.nom, email: profile.email }, { headers: authHeader });
      alert('Informations mises à jour !');
      fetchMyProfile();
    } catch (err) {
      console.error('[DashboardDonneur] saveProfile error', err);
      setProfileError(err.response?.data?.message || 'Impossible de sauvegarder.');
    } finally {
      setProfileSaving(false);
    }
  };
// ✅ Fonction pour mettre à jour UNIQUEMENT le numéro bancaire
const saveBankNumber = async () => {
  if (!user?.token) return;
  if (!profile.numero_bancaire?.trim()) {
    setProfileError('Numéro bancaire requis');
    return;
  }
  
  setProfileSaving(true);
  setProfileError('');
  try {
    await axios.put(
      `${API}/api/me/bank`,
      { numero_bancaire: profile.numero_bancaire.trim() },
      { headers: authHeader }
    );
    alert('✅ Numéro bancaire mis à jour !');
    fetchMyProfile();
  } catch (err) {
    console.error('[DashboardDonneur] saveBankNumber error', err);
    setProfileError(err.response?.data?.message || 'Erreur mise à jour carte');
  } finally {
    setProfileSaving(false);
  }
};
  // =========================
  // ✅ Messages: Update & Delete
  // =========================
  const updateMessage = async (donationId, newMessage) => {
    setMessageSaving(true);
    try {
      await axios.put(
        `${API}/api/donations/${donationId}/message`,
        { message: newMessage },
        { headers: authHeader }
      );
      setMesMessages((prev) =>
        prev.map((m) =>
          m.id === donationId ? { ...m, message: newMessage } : m
        )
      );
      setEditingMessageId(null);
      alert('Message mis à jour !');
    } catch (err) {
      console.error('Erreur update message:', err);
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setMessageSaving(false);
    }
  };

  const deleteMessage = async (donationId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce message ?')) return;
    
    setMessageSaving(true);
    try {
      await axios.delete(`${API}/api/donations/${donationId}/message`, { headers: authHeader });
      setMesMessages((prev) =>
        prev.map((m) =>
          m.id === donationId ? { ...m, message: null } : m
        )
      );
      alert('Message supprimé !');
    } catch (err) {
      console.error('Erreur delete message:', err);
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setMessageSaving(false);
    }
  };

  // =========================
  // ✅ Effects
  // =========================
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchMesDons();
  }, [user, fetchMesDons]);

  useEffect(() => {
    if (activeTab === 'compte' || activeTab === 'card') fetchMyProfile();
    if (activeTab === 'messages') fetchMesMessages();
  }, [activeTab, fetchMyProfile, fetchMesMessages]);

 // ✅ Auto-remplir le numéro bancaire dans le formulaire de don
useEffect(() => {
  // Priorité : profile.numero_bancaire (chargé depuis /api/me) 
  // Fallback : user.numero_bancaire (si présent dans le contexte auth)
  const bankNumber = profile?.numero_bancaire || user?.numero_bancaire;
  
  if (bankNumber && !donNumeroBancaire && donPanelOpen) {
    setDonNumeroBancaire(String(bankNumber).trim());
  }
}, [profile?.numero_bancaire, user?.numero_bancaire, donNumeroBancaire, donPanelOpen]);

  useEffect(() => {
    if (activeTab !== 'beneficiaires') {
      setDonPanelOpen(false);
      setDonTarget(null);
      setDonError('');
      setDonSuccess('');
    }
  }, [activeTab]);

  // =========================
  // ✅ Computed Values
  // =========================
  const donsSummary = useMemo(() => {
    const list = Array.isArray(mesDons) ? mesDons : [];
    const totalDonated = list.reduce((sum, d) => sum + Number(d?.montant || 0), 0);
    const count = list.length;
    const avg = count > 0 ? totalDonated / count : 0;
    return { totalDonated, count, avg };
  }, [mesDons]);

  const messagesWithText = useMemo(() => {
    return mesMessages.filter((m) => m.message && m.message.trim());
  }, [mesMessages]);

  const tabMeta = {
    card: { title: 'Mon card', subtitle: 'Carte du donneur.' },
    dons: { title: 'Mes dons', subtitle: 'Historique complet de vos contributions.' },
    associations: { title: 'Associations', subtitle: 'Choisissez une association pour voir ses bénéficiaires et faire un don.' },
    beneficiaires: {
      title: selectedAssoc ? `Bénéficiaires - ${selectedAssoc.nom}` : 'Bénéficiaires',
      subtitle: 'Sélectionnez un bénéficiaire avec un montant restant pour effectuer un don.',
    },
    compte: { title: 'Mon Profil', subtitle: 'Gérez vos informations personnelles et bancaires.' },
    messages: { title: 'Mes commentaires', subtitle: 'Gérez les messages laissés avec vos dons.' },
  };

  const currentTitle = tabMeta[activeTab]?.title || 'Dashboard';
  const currentSubtitle = tabMeta[activeTab]?.subtitle || '';

  // =========================
  // ✅ Handlers
  // =========================
  const handleGoAssociations = async () => {
    setActiveTab('associations');
    setSelectedAssoc(null);
    setBeneficiaires([]);
    setSearch('');
    await fetchAssociations();
  };

  const handleAssocClick = async (assoc) => {
    setSelectedAssoc(assoc);
    setActiveTab('beneficiaires');
    setSearch('');
    setDonPanelOpen(false);
    setDonTarget(null);
    await fetchBeneficiaires(assoc.id);
  };

  const filteredMesDons = useMemo(() => {
    const q = normalize(search);
    return mesDons.filter((d) => {
      const benef = `${d.beneficiaire_nom || ''} ${d.beneficiaire_prenom || ''}`.toLowerCase();
      return benef.includes(q) || normalize(d.numero_bancaire).includes(q);
    });
  }, [mesDons, search]);

  const filteredAssociations = useMemo(() => {
    const q = normalize(search);
    return associations.filter(
      (a) => normalize(a.nom).includes(q) || normalize(a.email).includes(q) || normalize(a.telephone).includes(q),
    );
  }, [associations, search]);

  const filteredBeneficiaires = useMemo(() => {
    const q = normalize(search);
    return beneficiaires
      .filter((b) => Number(b.montant_restant || 0) > 0)
      .filter((b) => normalize(b.nom).includes(q) || normalize(b.prenom).includes(q) || normalize(b.cin).includes(q));
  }, [beneficiaires, search]);

  const filteredMessages = useMemo(() => {
    const q = normalize(search);
    return messagesWithText.filter((m) => {
      const benef = `${m.beneficiaire_nom || ''} ${m.beneficiaire_prenom || ''}`.toLowerCase();
      return benef.includes(q) || normalize(m.message).includes(q);
    });
  }, [messagesWithText, search]);

  const normalizeBank = (v) => String(v || '').replace(/\s+/g, '').trim();

  const openDonPanel = (beneficiaire) => {
    setDonTarget(beneficiaire);
    setDonPanelOpen(true);
    setDonError('');
    setDonSuccess('');
    setDonMontant('');
    setDonMessage('');
    setDonAnonymous(false);
  };

  const closeDonPanel = () => {
    setDonPanelOpen(false);
    setDonTarget(null);
    setDonError('');
    setDonSuccess('');
  };

  const getProgressPercent = (b) => {
    const p = Number(b?.pourcentage);
    if (!Number.isNaN(p) && Number.isFinite(p)) return Math.min(Math.max(p, 0), 100);
    const target = Number(b?.montant_a_collecter || 0);
    const remaining = Number(b?.montant_restant || 0);
    if (target <= 0) return 0;
    const collected = Math.max(target - remaining, 0);
    return Math.min(Math.max((collected / target) * 100, 0), 100);
  };

  const validateInlineDon = () => {
    const m = Number(donMontant);
    if (!donTarget?.id) return 'Bénéficiaire introuvable.';
    if (!user?.token) return 'Vous devez être connecté.';
    if (!donMontant || Number.isNaN(m)) return 'Veuillez saisir un montant valide.';
    if (m <= 0) return 'Le montant doit être supérieur à 0.';
    const bank = normalizeBank(donNumeroBancaire);
    if (!bank) return 'Veuillez saisir votre numéro bancaire.';
    if (bank.length < 8) return 'Numéro bancaire trop court.';
    return '';
  };

  const submitInlineDon = async (e) => {
    e.preventDefault();
    setDonError('');
    setDonSuccess('');
    const msg = validateInlineDon();
    if (msg) {
      setDonError(msg);
      return;
    }
    setDonSubmitting(true);
    try {
      await axios.post(
        `${API}/api/donations`,
        {
          beneficiaire_id: donTarget.id,
          montant: Number(donMontant),
          numero_bancaire: normalizeBank(donNumeroBancaire),
          message: donMessage?.trim() ? donMessage.trim() : null,
        },
        { headers: authHeader },
      );
      setDonSuccess('✓ Don créé avec succès !');
      if (selectedAssoc?.id) await fetchBeneficiaires(selectedAssoc.id);
      setTimeout(() => closeDonPanel(), 900);
    } catch (err) {
      console.error(err);
      setDonError(err.response?.data?.message || 'Erreur lors de la création du don.');
    } finally {
      setDonSubmitting(false);
    }
  };

  if (loading) {
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

  if (!user) return null;

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON'ACT</div>
              <div className="admin-brand__sub">Donneur Panel</div>
            </div>
          </div>

          <nav className="admin-nav admin-nav--icons">
            <button
              className={`admin-nav__item ${activeTab === 'compte' ? 'is-active' : ''}`}
              type="button"
              onClick={() => { setActiveTab('compte'); setSearch(''); }}
            >
              <User className="nav-ic" />
              <span>Profil</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'dons' ? 'is-active' : ''}`}
              type="button"
              onClick={() => { setActiveTab('dons'); setSearch(''); }}
            >
              <HandHeart className="nav-ic" />
              <span>Mes dons</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'associations' || activeTab === 'beneficiaires' ? 'is-active' : ''}`}
              type="button"
              onClick={handleGoAssociations}
            >
              <Building2 className="nav-ic" />
              <span>Faire un don</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'messages' ? 'is-active' : ''}`}
              type="button"
              onClick={() => { setActiveTab('messages'); setSearch(''); }}
            >
              <MessageSquare className="nav-ic" />
              <span>Mes commentaires</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'card' ? 'is-active' : ''}`}
              type="button"
              onClick={() => { setActiveTab('card'); setSearch(''); }}
            >
              <IdCard className="nav-ic" />
              <span>Mon card</span>
            </button>

            {activeTab === 'beneficiaires' && (
              <button
                className="admin-nav__item"
                type="button"
                onClick={() => { setActiveTab('associations'); setSearch(''); }}
              >
                <ArrowLeft className="nav-ic" />
                <span>Retour associations</span>
              </button>
            )}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">{initials}</div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || profile?.nom || 'Donneur'}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>

            <button
              className="btn btn--danger btn--block btn--withIcon"
              type="button"
              onClick={() => { logout(); navigate('/'); }}
            >
              <LogOut className="btn-ic" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        <main className="admin-main">
          {/* ================= COMPTE ================= */}
          {activeTab === 'compte' && (
            <div className="don-profile-page">
              <div className="don-profile-header">
                <h1 className="don-profile-title">Mon Profil</h1>
                <p className="don-profile-subtitle">Gérez vos informations personnelles</p>
              </div>

              <div className="don-profile-card">
                {profileLoading ? (
                  <div className="admin-loading">Chargement...</div>
                ) : (
                  <>
                    <div className="don-profile-top">
                      <div className="don-profile-logoBox">
                        <div className="don-profile-logoFallback">{initials}</div>
                      </div>
                      <div className="don-profile-topText">
                        <h2 className="don-profile-name">{profile.nom || user?.nom || '—'}</h2>
                        <p className="don-profile-desc">{profile.email || user?.email || '—'}</p>
                        <div className="don-profile-badges">
                          {profile.numero_bancaire && <span className="don-badge">{profile.numero_bancaire}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="don-profile-actions">
                     
                    </div>
                  </>
                )}
              </div>

              <div className="don-profile-card">
                <div className="don-profile-sectionTitle">Informations</div>
                {profileLoading ? (
                  <div className="admin-loading">Chargement...</div>
                ) : (
                  <div className="don-profile-formGrid">
                    <div className="field">
                      <label>Email</label>
                      <input className="input input--full" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Nom</label>
                      <input className="input input--full" value={profile.nom} onChange={(e) => setProfile((p) => ({ ...p, nom: e.target.value }))} />
                    </div>
                    <div className="field field--full">
                      <label>Numéro bancaire</label>
                      <input className="input input--full td-mono" value={profile.numero_bancaire} onChange={(e) => setProfile((p) => ({ ...p, numero_bancaire: e.target.value }))} placeholder="XXXX XXXX XXXX XXXX" />
                    </div>
                    
                    {profileError && <div className="field field--full"><div className="don-profile-error">{profileError}</div></div>}
                    <div className="field field--full">
                      <div className="don-profile-inlineActions">
                        <button className="btn btn--primary" type="button" disabled={profileSaving} onClick={saveProfile}>
                          {profileSaving ? 'Sauvegarde...' : 'Enregistrer'}
                        </button>
                        <button className="btn btn--success" type="button" disabled={profileSaving || !profile.numero_bancaire?.trim()} onClick={saveBankNumber}>
                          {profileSaving ? 'Sauvegarde...' : 'Mettre à jour carte'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= DONS ================= */}
          {activeTab === 'dons' && (
            <div className="donations-page">
              <div className="donations-header">
                <div>
                  <h1 className="donations-title">Mes dons</h1>
                  <p className="donations-subtitle">Historique complet de vos contributions</p>
                </div>
                <button className="btn btn--ghost btn--withIcon" type="button" onClick={exportMyDonationsCSV}>
                  <Download className="btn-ic" />
                  <span>Exporter</span>
                </button>
              </div>

              <div className="donations-summary">
                <div className="donations-summaryCard">
                  <div className="donations-summaryValue donations-summaryValue--primary">{donsSummary.totalDonated.toFixed(2)} DT</div>
                  <div className="donations-summaryLabel">Total donné</div>
                </div>
                <div className="donations-summaryCard">
                  <div className="donations-summaryValue donations-summaryValue--green">{donsSummary.count}</div>
                  <div className="donations-summaryLabel">Dons effectués</div>
                </div>
                <div className="donations-summaryCard">
                  <div className="donations-summaryValue donations-summaryValue--blue">{donsSummary.avg.toFixed(0)} DT</div>
                  <div className="donations-summaryLabel">Moyenne par don</div>
                </div>
              </div>

              <div className="donations-card">
                <div className="donations-cardHead">
                  <div>
                    <h2 className="donations-cardTitle">Historique</h2>
                    <p className="donations-cardDesc">Recherchez par bénéficiaire ou numéro bancaire.</p>
                  </div>
                  <div className="donations-tools">
                    <input className="input" type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <div className="donations-pill">{filteredMesDons.length} don(s)</div>
                  </div>
                </div>

                {filteredMesDons.length > 0 ? (
                  <div className="donations-tableWrap">
                    <table className="donations-table">
                      <thead>
                        <tr>
                          <th>Bénéficiaire</th>
                          <th>Montant</th>
                          <th>Numéro bancaire</th>
                          <th>Date</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMesDons.map((d) => {
                          const benef = `${d.beneficiaire_nom || ''} ${d.beneficiaire_prenom || ''}`.trim() || '—';
                          const dateStr = formatDateFr(d.created_at || d.date || d.date_don);
                          return (
                            <tr key={d.id}>
                              <td className="donations-tdStrong">{benef}</td>
                              <td className="donations-tdAmount">{Number(d.montant || 0).toFixed(2)} DT</td>
                              <td className="donations-tdMono">{d.numero_bancaire || '-'}</td>
                              <td className="donations-tdMuted">{dateStr}</td>
                              <td><span className="donations-status">Complété</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="donations-empty">
                    <div className="donations-emptyIcon">🎁</div>
                    <div className="donations-emptyTitle">Vous n'avez pas encore donné</div>
                    <div className="donations-emptyText">Découvrez les associations et bénéficiaires, puis commencez à faire une différence.</div>
                    <button className="btn btn--primary" type="button" onClick={handleGoAssociations}>Faire un don</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= MESSAGES / COMMENTAIRES ================= */}
          {activeTab === 'messages' && (
            <div className="messages-page">
              <div className="messages-header">
                <div>
                  <h1 className="messages-title">Mes commentaires</h1>
                  <p className="messages-subtitle">Gérez les messages laissés avec vos dons</p>
                </div>
                <div className="messages-count">{filteredMessages.length} message(s)</div>
              </div>

              {filteredMessages.length > 0 ? (
                <div className="messages-list">
                  {filteredMessages.map((msg) => (
                    <div key={msg.id} className="message-card">
                      <div className="message-card__header">
                        <div className="message-card__benef">
                          <span className="message-card__benefName">
                            {msg.beneficiaire_nom} {msg.beneficiaire_prenom}
                          </span>
                          <span className="message-card__date">{formatDateFr(msg.created_at)}</span>
                        </div>
                        <div className="message-card__amount">{Number(msg.montant || 0).toFixed(2)} DT</div>
                      </div>

                      <div className="message-card__body">
                        {editingMessageId === msg.id ? (
                          <div className="message-edit-form">
                            <textarea
                              className="message-textarea"
                              value={editedMessageText}
                              onChange={(e) => setEditedMessageText(e.target.value)}
                              maxLength={250}
                              placeholder="Votre message..."
                              disabled={messageSaving}
                            />
                            <div className="message-edit-actions">
                              <button
                                className="btn btn--success btn--sm"
                                type="button"
                                onClick={() => updateMessage(msg.id, editedMessageText)}
                                disabled={messageSaving || !editedMessageText.trim()}
                              >
                                <Check className="btn-ic" /> Enregistrer
                              </button>
                              <button
                                className="btn btn--ghost btn--sm"
                                type="button"
                                onClick={() => setEditingMessageId(null)}
                                disabled={messageSaving}
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="message-text">{msg.message}</p>
                            <div className="message-actions">
                              <button
                                className="btn btn--ghost btn--sm btn--withIcon"
                                type="button"
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditedMessageText(msg.message || '');
                                }}
                                disabled={messageSaving}
                              >
                                <Edit2 className="btn-ic" /> Modifier
                              </button>
                              <button
                                className="btn btn--ghost btn--danger btn--sm btn--withIcon"
                                type="button"
                                onClick={() => deleteMessage(msg.id)}
                                disabled={messageSaving}
                              >
                                <Trash2 className="btn-ic" /> Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="messages-empty">
                  <div className="messages-empty__icon">💬</div>
                  <div className="messages-empty__title">Aucun commentaire</div>
                  <div className="messages-empty__text">
                    Vous n'avez pas encore laissé de message avec vos dons.
                    <br />Lors de votre prochain don, ajoutez un mot d'encouragement !
                  </div>
                  <button className="btn btn--primary" type="button" onClick={handleGoAssociations}>
                    Faire un don avec message
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= AUTRES TABS ================= */}
          {activeTab !== 'compte' && activeTab !== 'dons' && activeTab !== 'messages' && (
            <>
              <div className="admin-topbar">
                <div>
                  <h1 className="admin-title">{currentTitle}</h1>
                  <p className="admin-subtitle">{currentSubtitle}</p>
                </div>
              </div>

              <section className="admin-card">
                <div className="admin-card__header">
                  {!['associations', 'beneficiaires', 'card'].includes(activeTab) && (
                    <div>
                      <h2 className="admin-card__title">{currentTitle}</h2>
                      <p className="admin-card__desc">{currentSubtitle}</p>
                    </div>
                  )}
                  {activeTab !== 'card' && (
                    <div className="admin-card__tools">
                      <input className="input" type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                  )}
                </div>

                {/* MON CARD */}
                {activeTab === 'card' && (
                  <div className="don-card-wrap">
                    {profileLoading ? (
                      <div className="admin-loading">Chargement...</div>
                    ) : (
                      <div className="don-card">
                        <div className="don-card__logo">DON'AC<span>T</span></div>
                        <div className="don-card__photo">
                          <div className="don-card__photoInner">{initials}</div>
                        </div>
                        <div className="don-card__name">{profile?.nom || user?.nom || '—'}</div>
                        <div className="don-card__grid">
                          <div className="don-card__field">
                            <div className="don-card__label">Email</div>
                            <div className="don-card__value">{profile?.email || user?.email || '—'}</div>
                          </div>
                          <div className="don-card__field">
                            <div className="don-card__label">Numéro bancaire</div>
                            <div className="don-card__value td-mono">{profile?.numero_bancaire || '—'}</div>
                          </div>
                        </div>
                        <div className="don-card__footer">Carte donneur DON'ACT</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ASSOCIATIONS */}
                {activeTab === 'associations' && (
                  <div className="donor-panel">
                    <div className="donor-panel__header">
                      <div>
                        <h2 className="donor-panel__title">Associations</h2>
                        <p className="donor-panel__subtitle">Choisissez une association pour voir ses bénéficiaires et faire un don.</p>
                      </div>
                      <div className="donor-panel__tools">
                        <input className="input donor-search" type="text" placeholder="Rechercher une association..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        <div className="donor-count">{filteredAssociations.length} résultat(s)</div>
                      </div>
                    </div>

                    {filteredAssociations.length === 0 ? (
                      <div className="donor-empty">
                        <div className="donor-empty__icon">🔎</div>
                        <div className="donor-empty__title">Aucune association trouvée</div>
                        <div className="donor-empty__text">Essayez un autre mot-clé.</div>
                      </div>
                    ) : (
                      <div className="donor-grid">
                        {filteredAssociations.map((a) => {
                          const meta = CATEGORY_META[normalize(a.categorie)] || { label: a.categorie || 'Catégorie', emoji: '❤️' };
                          const logoUrl = a.logo ? `${UPLOADS}/${a.logo}` : '';
                          return (
                            <button key={a.id} type="button" className="campaign-card" onClick={() => handleAssocClick(a)}>
                              <div className="campaign-card__media" aria-hidden="true">
                                {logoUrl ? (
                                  <img src={logoUrl} alt="" className="campaign-card__mediaImg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : null}
                                <div className="campaign-card__mediaFallback">{meta.emoji}</div>
                              </div>
                              <div className="campaign-card__body">
                                <div className="campaign-card__topRow">
                                  <span className="campaign-pill">{meta.emoji} {meta.label}</span>
                                  <span className="campaign-muted">{a.telephone ? `📞 ${a.telephone}` : ''}</span>
                                </div>
                                <h3 className="campaign-card__title">{a.nom}</h3>
                                <p className="campaign-card__desc">{a.description || '—'}</p>
                                <div className="campaign-card__metaRow">
                                  <span className="campaign-muted">{a.email || '-'}</span>
                                </div>
                                <div className="campaign-card__bottomRow">
                                  <div className="campaign-stat">
                                    <TrendingUp className="campaign-stat__ic" />
                                    <span>Voir bénéficiaires</span>
                                  </div>
                                  <span className="campaign-cta">Contribuer →</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* BENEFICIAIRES + Panel Don */}
                {activeTab === 'beneficiaires' && selectedAssoc && (
                  <div className="donor-panel">
                    <div className="donor-panel__header">
                      <div>
                        <h2 className="donor-panel__title">Bénéficiaires — {selectedAssoc.nom}</h2>
                        <p className="donor-panel__subtitle">Sélectionnez un bénéficiaire avec un montant restant pour effectuer un don.</p>
                      </div>
                      <div className="donor-panel__tools">
                        <input className="input donor-search" type="text" placeholder="Rechercher un bénéficiaire..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        <div className="donor-count">{filteredBeneficiaires.length} résultat(s)</div>
                      </div>
                    </div>

                    {filteredBeneficiaires.length === 0 ? (
                      <div className="donor-empty">
                        <div className="donor-empty__icon">🎯</div>
                        <div className="donor-empty__title">Aucun bénéficiaire disponible</div>
                        <div className="donor-empty__text">Aucun bénéficiaire n'a de montant restant pour le moment.</div>
                        <button className="btn btn--ghost" type="button" onClick={() => setActiveTab('associations')}>Retour aux associations</button>
                      </div>
                    ) : (
                      <div className="don-split">
                        <div className="don-split__list">
                          <div className="donor-grid donor-grid--benef">
                            {filteredBeneficiaires.map((b) => {
                              const percent = getProgressPercent(b);
                              let pctClass = 'pct pct--gray';
                              if (percent >= 0 && percent <= 35) pctClass = 'pct pct--green';
                              else if (percent >= 36 && percent <= 60) pctClass = 'pct pct--orange';
                              else if (percent >= 61 && percent <= 100) pctClass = 'pct pct--red';
                              return (
                                <div key={b.id} className="benef-card benef-card--v2">
                                  <div className="benef-card__head">
                                    <div className="benef-card__name">{b.nom} {b.prenom}</div>
                                    <span className={pctClass}>{percent.toFixed(0)}%</span>
                                  </div>
                                  <div className="benef-kpis">
                                    <div className="benef-kpi">
                                      <div className="benef-kpi__label">À collecter</div>
                                      <div className="benef-kpi__value">{b.montant_a_collecter} DT</div>
                                    </div>
                                    <div className="benef-kpi">
                                      <div className="benef-kpi__label">Restant</div>
                                      <div className="benef-kpi__value benef-kpi__value--primary">{b.montant_restant} DT</div>
                                    </div>
                                  </div>
                                  <div className="benef-card__grid">
                                    <div><span className="k">Email:</span> {b.email || '-'}</div>
                                    <div><span className="k">CIN:</span> {b.cin || '-'}</div>
                                    <div><span className="k">Téléphone:</span> {b.telephone || '-'}</div>
                                    <div><span className="k">Adresse:</span> {b.adresse || '-'}</div>
                                  </div>
                                  <button className="btn btn--primary btn--block" type="button" onClick={() => openDonPanel(b)}>+Faire un don</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <aside className="don-split__panel">
                          {!donPanelOpen || !donTarget ? (
                            <div className="don-panelEmpty">
                              <div className="don-panelEmpty__title">Sélectionnez un bénéficiaire</div>
                              <div className="don-panelEmpty__text">Cliquez sur "Faire un don" pour ouvrir le formulaire.</div>
                            </div>
                          ) : (
                            <form className="don-panelCard" onSubmit={submitInlineDon}>
                              <div className="don-panelCard__head">
                                <div>
                                  <div className="don-panelCard__title">Faire un don</div>
                                  <div className="don-panelCard__subtitle">{donTarget.nom} {donTarget.prenom}</div>
                                </div>
                                <button className="btn btn--ghost don-panelClose" type="button" onClick={closeDonPanel} disabled={donSubmitting}><X className="btn-ic" /></button>
                              </div>

                              <div className="don-panelProgress">
                                <div className="don-panelProgress__top">
                                  <span>Progression</span>
                                  <span className="don-panelProgress__val">{getProgressPercent(donTarget).toFixed(0)}%</span>
                                </div>
                                <div className="don-panelProgress__bar">
                                  <div className="don-panelProgress__fill" style={{ width: `${getProgressPercent(donTarget)}%` }} />
                                </div>
                                <div className="don-panelProgress__bottom">
                                  <span>Restant</span>
                                  <span>{Number(donTarget.montant_restant || 0).toFixed(0)} DT</span>
                                </div>
                              </div>

                              {donError && <div className="don-panelAlert don-panelAlert--danger">{donError}</div>}
                              {donSuccess && <div className="don-panelAlert don-panelAlert--success">{donSuccess}</div>}

                              <div className="don-panelSection">
                                <div className="don-panelLabel">Montant rapide</div>
                                <div className="don-panelQuick">
                                  {QUICK_AMOUNTS.map((a) => {
                                    const isActive = String(a) === String(donMontant);
                                    return (
                                      <button key={a} type="button" className={`don-quickBtn ${isActive ? 'is-active' : ''}`} onClick={() => setDonMontant(String(a))} disabled={donSubmitting}>
                                        {a} DT
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="don-panelSection">
                                <div className="don-panelLabel">Montant personnalisé</div>
                                <input className="don-panelInput" type="number" value={donMontant} onChange={(e) => setDonMontant(e.target.value)} min="1" step="1" placeholder="Entrez un montant" disabled={donSubmitting} />
                              </div>

                              <div className="don-panelSection">
                                <div className="don-panelLabel">Numéro bancaire</div>
                                <input className="don-panelInput td-mono" type="text" value={donNumeroBancaire} onChange={(e) => setDonNumeroBancaire(e.target.value)} placeholder="XXXX XXXX XXXX XXXX" disabled={donSubmitting} />
                                <div className="don-panelHint">Les espaces seront supprimés automatiquement.</div>
                              </div>

                              <div className="don-panelSection">
                                <div className="don-panelLabel">Message (optionnel)</div>
                                <input className="don-panelInput" type="text" value={donMessage} onChange={(e) => setDonMessage(e.target.value)} placeholder="Un mot d'encouragement..." maxLength={250} disabled={donSubmitting} />
                              </div>

                              <label className="don-panelAnon">
                                <input type="checkbox" checked={donAnonymous} onChange={(e) => setDonAnonymous(e.target.checked)} disabled={donSubmitting} />
                                <span>Rester anonyme</span>
                              </label>

                              <button className="btn btn--primary btn--block" type="submit" disabled={donSubmitting || !donMontant}>
                                {donSubmitting ? 'Traitement...' : 'Faire un don'}
                              </button>
                              <div className="don-panelFoot">Les paiements sont sécurisés et vérifiés.</div>
                            </form>
                          )}
                        </aside>
                      </div>
                    )}
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
export default DashboardDonneur;