import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

import {
  ClipboardList,
  Building2,
  Users,
  HandHeart,
  Tags,
  Scale,
  LogOut,
  UserRoundCog,
  BarChart3,
} from 'lucide-react';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from 'recharts';

import AdminCategoriesPanel from '../pages/AdminCategoriesPanel';

const API_BASE = 'http://localhost:5000';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [demandes, setDemandes] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [donneurs, setDonneurs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('demandes');
  const [showCreateAvocat, setShowCreateAvocat] = useState(false);

  const [avocatNom, setAvocatNom] = useState('');
  const [avocatEmail, setAvocatEmail] = useState('');
  const [avocatMessage, setAvocatMessage] = useState('');

  const [searchAssociations, setSearchAssociations] = useState('');
  const [searchBeneficiaires, setSearchBeneficiaires] = useState('');
  const [searchDemandes, setSearchDemandes] = useState('');
  const [searchDonneurs, setSearchDonneurs] = useState('');

  const [expandedDocsId, setExpandedDocsId] = useState(null);

  // ✅ Users tab
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('all');
  const [usersSearch, setUsersSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      logout();
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [demandesRes, associationsRes, beneficiairesRes, donneursRes] = await Promise.all([
          axios.get(`${API_BASE}/demandes`, { headers: { Authorization: `Bearer ${user.token}` } }),
          axios.get(`${API_BASE}/admin/associations`, { headers: { Authorization: `Bearer ${user.token}` } }),
          axios.get(`${API_BASE}/admin/beneficiaires`, { headers: { Authorization: `Bearer ${user.token}` } }),
          axios.get(`${API_BASE}/admin/donneurs`, { headers: { Authorization: `Bearer ${user.token}` } }),
        ]);

        setDemandes(demandesRes.data);
        setAssociations(associationsRes.data);
        setBeneficiaires(beneficiairesRes.data);
        setDonneurs(donneursRes.data);
      } catch (err) {
        console.error(err);
        logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, logout, navigate]);

  // ✅ Donor amount from backend (must return "montant_total")
  const getDonorAmount = useCallback((d) => {
    const n = Number(d?.montant_total ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const formatMoneyDT = useCallback((n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0 DT';
    return `${num.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DT`;
  }, []);

  const stats = useMemo(() => {
    const pendingDemandes = demandes.filter((d) => (d.statut_admin || 'pending') === 'pending').length;
    const blockedAssociations = associations.filter((a) => !!a.blocked).length;

    const totalMontantDonne = (Array.isArray(donneurs) ? donneurs : []).reduce((acc, d) => acc + getDonorAmount(d), 0);

    return {
      totalDemandes: demandes.length,
      pendingDemandes,
      totalAssociations: associations.length,
      blockedAssociations,
      totalBeneficiaires: beneficiaires.length,
      totalDonneurs: donneurs.length,
      totalMontantDonne,
    };
  }, [demandes, associations, beneficiaires, donneurs, getDonorAmount]);

  const tabMeta = {
    analytics: {
      title: 'Rapports & Analyse',
      subtitle: 'Vue d’ensemble de la plateforme : statistiques, activités et graphiques.',
    },
    demandes: {
      title: 'Demandes',
      subtitle: 'Gérez les demandes : validation, refus et consultation des documents légaux.',
    },
    associations: {
      title: 'Associations',
      subtitle: 'Gérez les associations : consultation, blocage et déblocage.',
    },
    beneficiaires: {
      title: 'Bénéficiaires',
      subtitle: 'Gérez les bénéficiaires : consultation, recherche et suppression.',
    },
    donneurs: {
      title: 'Donneurs',
      subtitle: 'Gérez les donneurs : consultation et recherche.',
    },
    users: {
      title: 'Utilisateurs',
      subtitle: 'Consultez les utilisateurs de la plateforme (association / donneur / bénéficiaire).',
    },
    categories: {
      title: 'Catégories',
      subtitle: 'Ajoutez / modifiez / supprimez les catégories.',
    },
    avocat: {
      title: 'Créer Avocat',
      subtitle: 'Créez un compte avocat en générant un accès via email.',
    },
  };

  const currentTitle = tabMeta[activeTab]?.title || 'Dashboard';
  const currentSubtitle = tabMeta[activeTab]?.subtitle || 'Administration';

  const handleChangeStatutDemande = async (id, statut) => {
    if (!window.confirm(`Changer le statut de cette demande en "${statut}" ?`)) return;
    try {
      await axios.put(
        `${API_BASE}/demandes/status/${id}`,
        { statut_admin: statut },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut_admin: statut } : d)));
    } catch {
      alert('Impossible de modifier le statut');
    }
  };

  const handleDeleteBeneficiaire = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce bénéficiaire ?')) return;

    try {
      await axios.delete(`${API_BASE}/beneficiaires/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setBeneficiaires((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
      alert('Impossible de supprimer le bénéficiciaire');
    }
  };

  const downloadFile = async (id, field) => {
    try {
      const res = await axios.get(`${API_BASE}/demandes/download/${id}/${field}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob',
      });

      const disposition = res.headers['content-disposition'];
      let fileName = field;
      if (disposition && disposition.includes('filename=')) {
        fileName = disposition.split('filename=')[1].replace(/"/g, '').trim();
      }

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Impossible de télécharger le document');
    }
  };

  const toggleBlockAssociation = async (id, currentStatus) => {
    const action = currentStatus ? 'débloquer' : 'bloquer';
    if (!window.confirm(`Voulez-vous vraiment ${action} cette association ?`)) return;

    try {
      await axios.put(
        `${API_BASE}/admin/block/${id}`,
        { blocked: !currentStatus },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      setAssociations((prev) => prev.map((a) => (a.id === id ? { ...a, blocked: !currentStatus } : a)));
    } catch (err) {
      console.error(err);
      alert('Impossible de modifier le blocage');
    }
  };

  const badgeClass = (value, positive = 'acceptee', negative = 'refusee') => {
    if (value === positive) return 'badge badge--success';
    if (value === negative) return 'badge badge--danger';
    return 'badge badge--neutral';
  };

  const normalize = (s) => (s ?? '').toString().trim().toLowerCase();

  const fetchUsers = useCallback(async () => {
    if (!user?.token) return;

    setUsersLoading(true);
    setUsersError('');

    try {
      const [associationsRes, beneficiairesRes, donneursRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/associations`, { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get(`${API_BASE}/admin/beneficiaires`, { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get(`${API_BASE}/admin/donneurs`, { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);

      const associationsList = Array.isArray(associationsRes.data) ? associationsRes.data : [];
      const beneficiairesList = Array.isArray(beneficiairesRes.data) ? beneficiairesRes.data : [];
      const donneursList = Array.isArray(donneursRes.data) ? donneursRes.data : [];

      const normalizedAssociations = associationsList.map((a) => ({
        id: a.id,
        nom: a.nom || '',
        prenom: '',
        email: a.email || '',
        role: 'association',
        created_at: a.created_at || a.date_creation || null,
      }));

      const normalizedBeneficiaires = beneficiairesList.map((b) => ({
        id: b.id,
        nom: b.nom || '',
        prenom: b.prenom || '',
        email: b.email || '',
        role: 'beneficiaire',
        created_at: b.created_at || b.date_creation || null,
      }));

      const normalizedDonneurs = donneursList.map((d) => ({
        id: d.id,
        nom: d.nom || '',
        prenom: d.prenom || '',
        email: d.email || '',
        role: 'donneur',
        created_at: d.created_at || d.date_creation || null,
      }));

      const combined = [...normalizedAssociations, ...normalizedBeneficiaires, ...normalizedDonneurs];

      combined.sort((x, y) => {
        const dx = x.created_at ? new Date(x.created_at).getTime() : 0;
        const dy = y.created_at ? new Date(y.created_at).getTime() : 0;
        return dy - dx;
      });

      setUsersList(combined);
    } catch (err) {
      console.error('[AdminDashboard] fetchUsers error', err);
      setUsersError(
        err.response?.data?.message ||
          'Impossible de charger les utilisateurs (associations / beneficiaires / donneurs).',
      );
      setUsersList([]);
    } finally {
      setUsersLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = normalize(usersSearch);
    return (Array.isArray(usersList) ? usersList : [])
      .filter((u) => {
        if (usersRoleFilter === 'all') return true;
        return normalize(u?.role) === normalize(usersRoleFilter);
      })
      .filter((u) => {
        const name = `${u?.nom || ''} ${u?.prenom || ''}`.trim();
        return normalize(name).includes(q) || normalize(u?.email).includes(q) || normalize(u?.role).includes(q);
      });
  }, [usersList, usersRoleFilter, usersSearch]);

  const ROLE_UI = {
    association: { label: 'Association', color: '#7c3aed', css: 'role-association' },
    donneur: { label: 'Donneur', color: '#16a34a', css: 'role-donneur' },
    beneficiaire: { label: 'Bénéficiaire', color: '#2563eb', css: 'role-beneficiaire' },
  };

  const roleBreakdown = useMemo(() => {
    const associationCount = Array.isArray(associations) ? associations.length : 0;
    const donneurCount = Array.isArray(donneurs) ? donneurs.length : 0;
    const beneficiaireCount = Array.isArray(beneficiaires) ? beneficiaires.length : 0;

    const total = associationCount + donneurCount + beneficiaireCount;

    const rows = [
      { key: 'association', count: associationCount },
      { key: 'donneur', count: donneurCount },
      { key: 'beneficiaire', count: beneficiaireCount },
    ].map((r) => ({
      ...r,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    }));

    return { total, rows };
  }, [associations, donneurs, beneficiaires]);

  const analyticsData = useMemo(() => {
    const countByStatus = (s) => demandes.filter((d) => (d.statut_admin || 'pending') === s).length;

    const pending = countByStatus('pending');
    const acceptee = countByStatus('acceptee');
    const refusee = countByStatus('refusee');

    const blocked = associations.filter((a) => !!a.blocked).length;
    const active = Math.max(0, (Array.isArray(associations) ? associations.length : 0) - blocked);

    const statusPie = [
      { name: 'En attente', value: pending, color: '#f59e0b' },
      { name: 'Acceptées', value: acceptee, color: '#16a34a' },
      { name: 'Refusées', value: refusee, color: '#dc2626' },
    ];

    const associationsBar = [
      { name: 'Actives', value: active, color: '#16a34a' },
      { name: 'Bloquées', value: blocked, color: '#dc2626' },
    ];

    const usersPie = [
      { name: ROLE_UI.association.label, value: associations.length, color: ROLE_UI.association.color },
      { name: ROLE_UI.donneur.label, value: donneurs.length, color: ROLE_UI.donneur.color },
      { name: ROLE_UI.beneficiaire.label, value: beneficiaires.length, color: ROLE_UI.beneficiaire.color },
    ];

    const activityLine = [
      { name: 'Demandes', value: demandes.length },
      { name: 'Associations', value: associations.length },
      { name: 'Donneurs', value: donneurs.length },
      { name: 'Bénéficiaires', value: beneficiaires.length },
    ];

    const amountByDonor = (Array.isArray(donneurs) ? donneurs : [])
      .map((d) => ({
        name: (d?.nom || d?.email || `Donneur ${d?.id || ''}`).toString().slice(0, 18),
        value: getDonorAmount(d),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    return { statusPie, associationsBar, usersPie, activityLine, amountByDonor };
  }, [demandes, associations, donneurs, beneficiaires, getDonorAmount,ROLE_UI.association.label,
  ROLE_UI.association.color,
  ROLE_UI.donneur.label,
  ROLE_UI.donneur.color,
  ROLE_UI.beneficiaire.label,
  ROLE_UI.beneficiaire.color,]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0];
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip__title">{label || p.name}</div>
        <div className="chart-tooltip__value">{p.value}</div>
      </div>
    );
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

  return (
    <div className="admin-page">
      <div className="admin-shell">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON’ACT</div>
              <div className="admin-brand__sub">Admin Panel</div>
            </div>
          </div>

          <nav className="admin-nav admin-nav--icons">
            <button
              className={`admin-nav__item ${activeTab === 'demandes' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('demandes');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <ClipboardList className="nav-ic" />
              <span>Demandes</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'associations' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('associations');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <Building2 className="nav-ic" />
              <span>Associations</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'beneficiaires' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('beneficiaires');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <Users className="nav-ic" />
              <span>Bénéficiaires</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'donneurs' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('donneurs');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <HandHeart className="nav-ic" />
              <span>Donneurs</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'users' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('users');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <UserRoundCog className="nav-ic" />
              <span>Utilisateurs</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'categories' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('categories');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <Tags className="nav-ic" />
              <span>Catégories</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'avocat' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('avocat');
                setShowCreateAvocat(true);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <Scale className="nav-ic" />
              <span>Créer Avocat</span>
            </button>

            <button
              className={`admin-nav__item ${activeTab === 'analytics' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('analytics');
                setShowCreateAvocat(false);
                setExpandedDocsId(null);
              }}
              type="button"
            >
              <BarChart3 className="nav-ic" />
              <span>Rapports / Analyse</span>
            </button>
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">
                {(user?.nom?.[0] || user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || 'Admin'}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>

            <button
              className="btn btn--danger btn--block btn--withIcon"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              type="button"
            >
              <LogOut className="btn-ic" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1 className="admin-title">{currentTitle}</h1>
              <p className="admin-subtitle">{currentSubtitle}</p>
            </div>
          </div>

          <section className="admin-card">
            {/* ✅ ANALYTICS */}
            {activeTab === 'analytics' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Tableau de bord</h2>
                    <p className="admin-card__desc">Vue d'ensemble de la plateforme et des activités.</p>
                  </div>
                </div>

                <div className="analytics-grid">
                  <div className="analytics-kpi">
                    <div className="analytics-kpi__label">Total demandes</div>
                    <div className="analytics-kpi__value">{stats.totalDemandes}</div>
                    <div className="analytics-kpi__hint">En attente: {stats.pendingDemandes}</div>
                  </div>

                  <div className="analytics-kpi">
                    <div className="analytics-kpi__label">Associations</div>
                    <div className="analytics-kpi__value">{stats.totalAssociations}</div>
                    <div className="analytics-kpi__hint">Bloquées: {stats.blockedAssociations}</div>
                  </div>

                  <div className="analytics-kpi">
                    <div className="analytics-kpi__label">Montants donnés (total)</div>
                    <div className="analytics-kpi__value">{formatMoneyDT(stats.totalMontantDonne)}</div>
                    <div className="analytics-kpi__hint">Somme des donneurs</div>
                  </div>

                  <div className="analytics-kpi">
                    <div className="analytics-kpi__label">Donneurs</div>
                    <div className="analytics-kpi__value">{stats.totalDonneurs}</div>
                    <div className="analytics-kpi__hint">Total inscrits</div>
                  </div>
                </div>

                <div className="analytics-panels">
                  <div className="analytics-panel">
                    <div className="analytics-panel__title">Demandes par statut</div>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart>
                          <Pie data={analyticsData.statusPie} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={2}>
                            {analyticsData.statusPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="analytics-panel">
                    <div className="analytics-panel__title">Associations (actives vs bloquées)</div>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={290}>
                        <BarChart data={analyticsData.associationsBar}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                            {analyticsData.associationsBar.map((entry, index) => (
                              <Cell key={`cellb-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="analytics-panel">
                    <div className="analytics-panel__title">Utilisateurs par rôle</div>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart>
                          <Pie data={analyticsData.usersPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105} paddingAngle={2}>
                            {analyticsData.usersPie.map((entry, index) => (
                              <Cell key={`cellu-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="analytics-panel">
                    <div className="analytics-panel__title">Vue globale (activité)</div>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height={290}>
                        <LineChart data={analyticsData.activityLine}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="analytics-panel analytics-panel--full">
                    <div className="analytics-panel__title">Montant donné par donneur (Top 12)</div>
                    <div className="chart-box chart-box--tall">
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={analyticsData.amountByDonor} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* DONNEURS (✅ montant_total) */}
            {activeTab === 'donneurs' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Donneurs</h2>
                    <p className="admin-card__desc">Liste des donneurs inscrits (montant total donné).</p>
                  </div>

                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder="Rechercher (nom / email)..."
                      value={searchDonneurs}
                      onChange={(e) => setSearchDonneurs(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th className="th-right">Montant donné</th>
                        <th>Date création</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donneurs
                        .filter(
                          (d) =>
                            (d.nom || '').toLowerCase().includes(searchDonneurs.toLowerCase()) ||
                            (d.email || '').toLowerCase().includes(searchDonneurs.toLowerCase()),
                        )
                        .map((d) => (
                          <tr key={d.id}>
                            <td>{d.nom}</td>
                            <td>{d.email}</td>
                            <td className="td-right td-amount">{formatMoneyDT(getDonorAmount(d))}</td>
                            <td>{d.date_creation ? new Date(d.date_creation).toLocaleDateString('fr-FR') : '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ✅ USERS TAB */}
            {activeTab === 'users' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Gestion des utilisateurs</h2>
                    <p className="admin-card__desc">Filtrer par rôle (association / donneur / bénéficiaire).</p>
                  </div>

                  <div className="admin-card__tools admin-users-tools">
                    <select
                      className="input admin-users-select"
                      value={usersRoleFilter}
                      onChange={(e) => setUsersRoleFilter(e.target.value)}
                    >
                      <option value="all">Tous</option>
                      <option value="association">Association</option>
                      <option value="donneur">Donneur</option>
                      <option value="beneficiaire">Bénéficiaire</option>
                    </select>

                    <input
                      className="input"
                      placeholder="Rechercher (nom / email)..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                    />
                  </div>
                </div>

                <section className="admin-breakdown admin-breakdown--insideUsers">
                  <h3 className="admin-breakdown__title">Répartition par rôle</h3>

                  <div className="admin-breakdown__rows">
                    {roleBreakdown.rows.map((r) => {
                      const ui = ROLE_UI[r.key];
                      return (
                        <div key={r.key} className="admin-breakdown__row">
                          <div className="admin-breakdown__rowHead">
                            <span className="admin-breakdown__label">{ui.label}</span>
                            <span className="admin-breakdown__count">
                              {r.count} ({r.percentage.toFixed(0)}%)
                            </span>
                          </div>

                          <div className="admin-breakdown__bar">
                            <div
                              className={`admin-breakdown__barFill ${ui.css}`}
                              style={{ width: `${Math.max(0, Math.min(100, r.percentage))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {usersError && <div className="admin-users-error">{usersError}</div>}

                {!usersLoading && !usersError && filteredUsers.length === 0 && (
                  <div className="admin-loading">Aucun utilisateur trouvé.</div>
                )}

                {filteredUsers.length > 0 && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Utilisateur</th>
                          <th>Email</th>
                          <th>Rôle</th>
                          <th>Inscrit le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const name = `${u?.nom || ''} ${u?.prenom || ''}`.trim() || '—';
                          const created = u?.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—';
                          return (
                            <tr key={`${u?.role || 'user'}-${u?.id || u?.email || Math.random()}`}>
                              <td className="admin-users-nameCell">
                                <div className="admin-users-avatar">
                                  {(u?.nom?.[0] || u?.email?.[0] || 'U').toUpperCase()}
                                </div>
                                <div>
                                  <div className="admin-users-name">{name}</div>
                                  <div className="admin-users-muted">{u?.id ? `ID: ${u.id}` : ''}</div>
                                </div>
                              </td>
                              <td>{u?.email || '—'}</td>
                              <td>
                                <span className="badge badge--neutral">{u?.role || '—'}</span>
                              </td>
                              <td>{created}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* DEMANDES */}
            {activeTab === 'demandes' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Demandes associations</h2>
                    <p className="admin-card__desc">Voir les demandes des associations.</p>
                  </div>

                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder="Rechercher (association / email)..."
                      value={searchDemandes}
                      onChange={(e) => setSearchDemandes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Association</th>
                        <th>Email</th>
                        <th>Statut Admin</th>
                        <th>Statut Avocat</th>
                        <th className="th-center">Actions</th>
                        <th className="th-center">Documents</th>
                      </tr>
                    </thead>

                    <tbody>
                      {demandes
                        .filter(
                          (d) =>
                            (d.nom_association || '').toLowerCase().includes(searchDemandes.toLowerCase()) ||
                            (d.email || '').toLowerCase().includes(searchDemandes.toLowerCase()),
                        )
                        .flatMap((d) => {
                          const isExpanded = expandedDocsId === d.id;

                          const mainRow = (
                            <tr key={`row-${d.id}`}>
                              <td>{d.nom_association}</td>
                              <td>{d.email}</td>
                              <td>
                                <span className={badgeClass(d.statut_admin || 'pending')}>
                                  {d.statut_admin || 'pending'}
                                </span>
                              </td>
                              <td>{d.statut_avocat || 'pending'}</td>

                              <td className="td-center">
                                <div className="btn-group">
                                  <button className="btn btn--success btn--sm" onClick={() => handleChangeStatutDemande(d.id, 'acceptee')} type="button">
                                    Accepter
                                  </button>
                                  <button className="btn btn--danger btn--sm" onClick={() => handleChangeStatutDemande(d.id, 'refusee')} type="button">
                                    Refuser
                                  </button>
                                </div>
                              </td>

                              <td className="td-center">
                                <button className="btn btn--ghost btn--sm" onClick={() => setExpandedDocsId((prev) => (prev === d.id ? null : d.id))} type="button">
                                  {isExpanded ? 'Masquer documents' : 'Voir documents légaux'}
                                </button>
                              </td>
                            </tr>
                          );

                          if (!isExpanded) return [mainRow];

                          const docsRow = (
                            <tr key={`docs-${d.id}`} className="docs-row">
                              <td colSpan={6}>
                                <div className="docs-panel">
                                  <div className="docs-panel__title">Documents légaux</div>

                                  <div className="docs-panel__actions">
                                    <button className="btn btn--primary btn--sm" onClick={() => downloadFile(d.id, 'doc_statut')} type="button">Télécharger Statut</button>
                                    <button className="btn btn--primary btn--sm" onClick={() => downloadFile(d.id, 'doc_autorisation')} type="button">Télécharger Autorisation</button>
                                    <button className="btn btn--primary btn--sm" onClick={() => downloadFile(d.id, 'doc_registre')} type="button">Télécharger Registre</button>
                                    <button className="btn btn--primary btn--sm" onClick={() => downloadFile(d.id, 'doc_cin')} type="button">Télécharger CIN</button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );

                          return [mainRow, docsRow];
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ASSOCIATIONS */}
            {activeTab === 'associations' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Associations</h2>
                    <p className="admin-card__desc">Bloquez / débloquez une association et consultez ses informations.</p>
                  </div>

                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder="Rechercher (nom / email / téléphone)..."
                      value={searchAssociations}
                      onChange={(e) => setSearchAssociations(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                        <th>Adresse</th>
                        <th>Responsable</th>
                        <th>Description</th>
                        <th>Date création</th>
                        <th>Statut</th>
                        <th className="th-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {associations
                        .filter(
                          (a) =>
                            (a.nom || '').toLowerCase().includes(searchAssociations.toLowerCase()) ||
                            (a.email || '').toLowerCase().includes(searchAssociations.toLowerCase()) ||
                            (a.telephone || '').includes(searchAssociations),
                        )
                        .map((a) => (
                          <tr key={a.id}>
                            <td>{a.nom}</td>
                            <td>{a.email}</td>
                            <td>{a.telephone || '-'}</td>
                            <td>{a.adresse || '-'}</td>
                            <td>{a.responsable || '-'}</td>
                            <td className="td-truncate" title={a.description || ''}>{a.description || '-'}</td>
                            <td>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                            <td>
                              <span className={a.blocked ? 'badge badge--danger' : 'badge badge--success'}>
                                {a.blocked ? 'Bloquée' : 'Active'}
                              </span>
                            </td>
                            <td className="td-center">
                              <button
                                className={a.blocked ? 'btn btn--success btn--sm' : 'btn btn--danger btn--sm'}
                                onClick={() => toggleBlockAssociation(a.id, a.blocked)}
                                type="button"
                              >
                                {a.blocked ? 'Débloquer' : 'Bloquer'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* BENEFICIAIRES */}
            {activeTab === 'beneficiaires' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Bénéficiaires</h2>
                    <p className="admin-card__desc">Consultez et supprimez si nécessaire.</p>
                  </div>

                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder="Rechercher (nom / prénom / CIN)..."
                      value={searchBeneficiaires}
                      onChange={(e) => setSearchBeneficiaires(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>CIN</th>
                        <th>Date Naissance</th>
                        <th>Genre</th>
                        <th>Téléphone</th>
                        <th>Adresse</th>
                        <th>Situation</th>
                        <th>Description</th>
                        <th>Association</th>
                        <th>À collecter</th>
                        <th>Restant</th>
                        <th className="th-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaires
                        .filter(
                          (b) =>
                            (b.nom || '').toLowerCase().includes(searchBeneficiaires.toLowerCase()) ||
                            (b.prenom || '').toLowerCase().includes(searchBeneficiaires.toLowerCase()) ||
                            (b.cin || '').includes(searchBeneficiaires),
                        )
                        .map((b) => (
                          <tr key={b.id}>
                            <td>{b.nom || '-'}</td>
                            <td>{b.prenom || '-'}</td>
                            <td>{b.cin || '-'}</td>
                            <td>{b.date_naissance ? new Date(b.date_naissance).toLocaleDateString() : '-'}</td>
                            <td>{b.genre || '-'}</td>
                            <td>{b.telephone || '-'}</td>
                            <td>{b.adresse || '-'}</td>
                            <td>{b.situation_familiale || '-'}</td>
                            <td className="td-truncate" title={b.description || ''}>{b.description || '-'}</td>
                            <td>{b.association_nom || '-'}</td>
                            <td>{b.montant_a_collecter ? `${b.montant_a_collecter} DT` : '-'}</td>
                            <td>{b.montant_restant ? `${b.montant_restant} DT` : '-'}</td>
                            <td className="td-center">
                              <button className="btn btn--danger btn--sm" onClick={() => handleDeleteBeneficiaire(b.id)} type="button">
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ✅ CATEGORIES */}
            {activeTab === 'categories' && <AdminCategoriesPanel token={user.token} />}

            {/* CREER AVOCAT */}
            {showCreateAvocat && activeTab === 'avocat' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Créer un compte Avocat</h2>
                    <p className="admin-card__desc">Générez un compte avocat via l’email.</p>
                  </div>
                </div>

                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAvocatMessage('');

                    try {
                      await axios.post(
                        `${API_BASE}/admin/create-avocat`,
                        { nom: avocatNom, email: avocatEmail },
                        { headers: { Authorization: `Bearer ${user.token}` } },
                      );

                      setAvocatMessage('Avocat créé avec succès !');
                      setAvocatNom('');
                      setAvocatEmail('');
                    } catch (err) {
                      console.error(err);
                      setAvocatMessage('Erreur lors de la création de l’avocat');
                    }
                  }}
                >
                  <div className="form__row">
                    <label className="label">Nom</label>
                    <input className="input" value={avocatNom} onChange={(e) => setAvocatNom(e.target.value)} required />
                  </div>

                  <div className="form__row">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={avocatEmail} onChange={(e) => setAvocatEmail(e.target.value)} required />
                  </div>

                  <div className="form__actions">
                    <button type="submit" className="btn btn--primary">
                      Créer Avocat
                    </button>
                  </div>

                  {avocatMessage && <div className="alert">{avocatMessage}</div>}
                </form>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;