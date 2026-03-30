import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AvocatDashboard.css';

import { FileText, LogOut, CheckCircle, XCircle, Search, FolderOpen } from 'lucide-react';

const API = 'http://localhost:5000';

const AvocatDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchDemandes, setSearchDemandes] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // pending | legale | illegale | all
  const [expandedDocsId, setExpandedDocsId] = useState(null);

  const authHeader = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const normalize = useCallback((s) => (s ?? '').toString().trim().toLowerCase(), []);
  const isPendingValue = useCallback(
    (s) => {
      const v = normalize(s);
      return v === '' || v === 'pending' || v === 'en attente' || v === 'attente' || v === 'en_attente';
    },
    [normalize],
  );

  const fetchDemandes = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/demandes`, { headers: authHeader });
      setDemandes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [authHeader, logout, navigate, user?.token]);

  useEffect(() => {
    if (!user || user.role !== 'avocat') {
      logout();
      navigate('/login');
      return;
    }
    fetchDemandes();
  }, [user, logout, navigate, fetchDemandes]);

  const stats = useMemo(() => {
    const pending = demandes.filter((d) => isPendingValue(d.statut_avocat)).length;
    const legale = demandes.filter((d) => normalize(d.statut_avocat) === 'legale').length;
    const illegale = demandes.filter((d) => normalize(d.statut_avocat) === 'illegale').length;
    return { total: demandes.length, pending, legale, illegale };
  }, [demandes, isPendingValue, normalize]);

  const displayStatutAvocat = useCallback(
    (s) => {
      const v = normalize(s);
      if (isPendingValue(v)) return 'en attente';
      if (v === 'legale') return 'legale';
      if (v === 'illegale') return 'illegale';
      return s || 'en attente';
    },
    [isPendingValue, normalize],
  );

  const badgeClass = useCallback(
    (displayValue) => {
      const v = normalize(displayValue);
      if (v === 'legale') return 'badge badge--success';
      if (v === 'illegale') return 'badge badge--danger';
      return 'badge badge--neutral';
    },
    [normalize],
  );

  const handleChangeStatut = async (id, statut) => {
    if (!window.confirm(`Voulez-vous vraiment changer le statut en "${statut}" ?`)) return;

    try {
      await axios.put(`${API}/demandes/status/${id}`, { statut_avocat: statut }, { headers: authHeader });
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut_avocat: statut } : d)));
    } catch (err) {
      console.error(err);
      alert('Erreur de mise à jour');
    }
  };

  const downloadFile = async (id, field) => {
    try {
      const res = await axios.get(`${API}/demandes/download/${id}/${field}`, {
        headers: authHeader,
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

  const filteredDemandes = useMemo(() => {
    const q = normalize(searchDemandes);

    const bySearch = (d) =>
      normalize(d.nom_association).includes(q) || normalize(d.email).includes(q);

    const byTab = (d) => {
      const s = normalize(d.statut_avocat);
      if (activeTab === 'all') return true;
      if (activeTab === 'pending') return isPendingValue(s);
      if (activeTab === 'legale') return s === 'legale';
      if (activeTab === 'illegale') return s === 'illegale';
      return true;
    };

    return demandes.filter((d) => byTab(d) && bySearch(d));
  }, [activeTab, demandes, isPendingValue, normalize, searchDemandes]);

  const tabCounts = useMemo(() => {
    const pending = demandes.filter((d) => isPendingValue(d.statut_avocat)).length;
    const legale = demandes.filter((d) => normalize(d.statut_avocat) === 'legale').length;
    const illegale = demandes.filter((d) => normalize(d.statut_avocat) === 'illegale').length;
    const all = demandes.length;
    return { pending, legale, illegale, all };
  }, [demandes, isPendingValue, normalize]);

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
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON’ACT</div>
              <div className="admin-brand__sub">Avocat Panel</div>
            </div>
          </div>

          <nav className="admin-nav admin-nav--icons">
            <button className="admin-nav__item is-active" type="button">
              <FileText className="nav-ic" />
              <span>Demandes</span>
            </button>
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">
                {(user?.nom?.[0] || user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || 'Avocat'}</div>
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
          <div className="admin-topbar">
            <div>
              <h1 className="admin-title">Demandes juridiques</h1>
              <p className="admin-subtitle">
                Gérez les demandes : marquez-les comme légales ou illégales et consultez les documents.
              </p>
            </div>
          </div>

          {/* Stats cards (with icons) */}
          <section className="av-stats">
            <div className="av-statCard">
              <div className="av-statTop">
                <div className="av-statLabel">En attente</div>
                <FileText className="av-statIc" />
              </div>
              <div className="av-statValue">{stats.pending}</div>
              <div className="av-statHint">Demandes à traiter</div>
            </div>

            <div className="av-statCard">
              <div className="av-statTop">
                <div className="av-statLabel">Légales</div>
                <CheckCircle className="av-statIc av-statIc--ok" />
              </div>
              <div className="av-statValue">{stats.legale}</div>
              <div className="av-statHint">Validées</div>
            </div>

            <div className="av-statCard">
              <div className="av-statTop">
                <div className="av-statLabel">Illégales</div>
                <XCircle className="av-statIc av-statIc--ko" />
              </div>
              <div className="av-statValue">{stats.illegale}</div>
              <div className="av-statHint">Rejetées</div>
            </div>

            <div className="av-statCard">
              <div className="av-statTop">
                <div className="av-statLabel">Total</div>
                <FolderOpen className="av-statIc" />
              </div>
              <div className="av-statValue">{stats.total}</div>
              <div className="av-statHint">Toutes les demandes</div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2 className="admin-card__title">Demandes</h2>
                <p className="admin-card__desc">Filtrez par statut et recherchez par association / email.</p>
              </div>

              <div className="admin-card__tools av-tools">
                <div className="av-search">
                  <Search className="av-searchIc" />
                  <input
                    type="text"
                    className="input av-searchInput"
                    placeholder="Rechercher (association / email)..."
                    value={searchDemandes}
                    onChange={(e) => setSearchDemandes(e.target.value)}
                  />
                </div>
                <div className="av-count">{filteredDemandes.length} résultat(s)</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="av-tabs">
              <button
                type="button"
                className={`av-tab ${activeTab === 'pending' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                En attente ({tabCounts.pending})
              </button>
              <button
                type="button"
                className={`av-tab ${activeTab === 'legale' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('legale')}
              >
                Légales ({tabCounts.legale})
              </button>
              <button
                type="button"
                className={`av-tab ${activeTab === 'illegale' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('illegale')}
              >
                Illégales ({tabCounts.illegale})
              </button>
              <button
                type="button"
                className={`av-tab ${activeTab === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Tout ({tabCounts.all})
              </button>

              
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom Association</th>
                    <th>Email</th>
                    <th>Statut Avocat</th>
                    <th className="th-center">Actions</th>
                    <th className="th-center">Documents</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDemandes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        Aucune demande.
                      </td>
                    </tr>
                  ) : (
                    filteredDemandes.flatMap((d) => {
                      const isExpanded = expandedDocsId === d.id;
                      const statutDisplay = displayStatutAvocat(d.statut_avocat);

                      const mainRow = (
                        <tr key={`row-${d.id}`}>
                          <td>{d.nom_association}</td>
                          <td>{d.email}</td>

                          <td>
                            <span className={badgeClass(statutDisplay)}>{statutDisplay}</span>
                          </td>

                          <td className="td-center">
                            <div className="btn-group">
                              <button
                                className="btn btn--success btn--sm btn--withIcon"
                                type="button"
                                onClick={() => handleChangeStatut(d.id, 'legale')}
                              >
                                <CheckCircle className="btn-ic" />
                                <span>Légale</span>
                              </button>

                              <button
                                className="btn btn--danger btn--sm btn--withIcon"
                                type="button"
                                onClick={() => handleChangeStatut(d.id, 'illegale')}
                              >
                                <XCircle className="btn-ic" />
                                <span>Illégale</span>
                              </button>
                            </div>
                          </td>

                          <td className="td-center">
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => setExpandedDocsId((prev) => (prev === d.id ? null : d.id))}
                            >
                              {isExpanded ? 'Masquer' : 'Voir'}
                            </button>
                          </td>
                        </tr>
                      );

                      if (!isExpanded) return [mainRow];

                      const docsRow = (
                        <tr key={`docs-${d.id}`} className="docs-row">
                          <td colSpan={5}>
                            <div className="docs-panel">
                              <div className="docs-panel__title">Documents</div>

                              <div className="docs-panel__actions">
                                <button className="btn btn--primary btn--sm" type="button" onClick={() => downloadFile(d.id, 'doc_statut')}>
                                  Télécharger Statut
                                </button>
                                <button className="btn btn--primary btn--sm" type="button" onClick={() => downloadFile(d.id, 'doc_autorisation')}>
                                  Télécharger Autorisation
                                </button>
                                <button className="btn btn--primary btn--sm" type="button" onClick={() => downloadFile(d.id, 'doc_registre')}>
                                  Télécharger Registre
                                </button>
                                <button className="btn btn--primary btn--sm" type="button" onClick={() => downloadFile(d.id, 'doc_cin')}>
                                  Télécharger CIN
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );

                      return [mainRow, docsRow];
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AvocatDashboard;