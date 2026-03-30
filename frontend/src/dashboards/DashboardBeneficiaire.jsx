import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardBeneficiaire.css';

import { IdCard, HandHeart, LogOut, MessageSquare } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const DashboardBeneficiaire = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // ✅ Tabs: card | donations | messages
  const [activeTab, setActiveTab] = useState('donations');

  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({
    total_collecte: 0,
    montant_restant: null,
    montant_a_collecter: null,
  });

  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    description: '',
    cin: '',
    date_naissance: '',
    genre: '',
    situation_familiale: '',
    association_id: null,
    association_nom: '',
  });

  // ✅ reactions local state: { [donationId]: 'love' | 'grr' }
  const [messageReactions, setMessageReactions] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'beneficiaire') {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const initials = useMemo(() => {
    const a = (user?.nom || 'B').toString().trim()[0] || 'B';
    const b = (user?.prenom || '').toString().trim()[0] || '';
    return (a + b).toUpperCase();
  }, [user?.nom, user?.prenom]);

  const fullName = useMemo(() => {
    return `${profile?.nom || user?.nom || ''} ${profile?.prenom || user?.prenom || ''}`.trim();
  }, [profile?.nom, profile?.prenom, user?.nom, user?.prenom]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const authHeader = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const fetchDonations = useCallback(async () => {
    if (!user?.token) return;

    setDonationsLoading(true);
    setDonationsError('');

    try {
      const res = await axios.get(`${API_BASE}/beneficiaire/donations`, {
        headers: authHeader,
      });

      const payload = res.data;

      const list = Array.isArray(payload?.donations)
        ? payload.donations
        : Array.isArray(payload)
          ? payload
          : [];

      setDonations(list);

      if (payload?.summary) {
        setSummary({
          total_collecte: Number(payload?.summary?.total_collecte || 0),
          montant_restant:
            payload?.summary?.montant_restant === null || payload?.summary?.montant_restant === undefined
              ? null
              : Number(payload.summary.montant_restant),
          montant_a_collecter:
            payload?.summary?.montant_a_collecter === null || payload?.summary?.montant_a_collecter === undefined
              ? null
              : Number(payload.summary.montant_a_collecter),
        });
      } else {
        const total = list.reduce((s, d) => s + Number(d?.montant || 0), 0);
        setSummary((prev) => ({ ...prev, total_collecte: total }));
      }
    } catch (err) {
      console.error('[DashboardBeneficiaire] fetchDonations error', err);
      setDonationsError(err.response?.data?.message || 'Impossible de charger la liste des dons.');
      setDonations([]);
    } finally {
      setDonationsLoading(false);
    }
  }, [authHeader, user?.token]);

  const fetchMyProfile = useCallback(async () => {
    if (!user?.token) return;

    setProfileLoading(true);
    setProfileError('');

    try {
      const res = await axios.get(`${API_BASE}/beneficiaire/me`, {
        headers: authHeader,
      });

      setProfile({
        nom: res.data?.nom || '',
        prenom: res.data?.prenom || '',
        email: res.data?.email || '',
        telephone: res.data?.telephone || '',
        adresse: res.data?.adresse || '',
        description: res.data?.description || '',
        cin: res.data?.cin || '',
        date_naissance: res.data?.date_naissance ? String(res.data.date_naissance).slice(0, 10) : '',
        genre: res.data?.genre || '',
        situation_familiale: res.data?.situation_familiale || '',
        association_id: res.data?.association_id ?? null,
        association_nom: res.data?.association_nom || '',
      });
    } catch (err) {
      console.error('[DashboardBeneficiaire] fetchMyProfile error', err);
      setProfileError(err.response?.data?.message || 'Impossible de charger votre profil.');
    } finally {
      setProfileLoading(false);
    }
  }, [authHeader, user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    fetchMyProfile();
  }, [user?.token, fetchMyProfile]);

  useEffect(() => {
    if (!user?.token) return;
    if (activeTab === 'donations' || activeTab === 'messages') fetchDonations();
    if (activeTab === 'card') fetchMyProfile();
  }, [activeTab, fetchDonations, fetchMyProfile, user?.token]);

  const isCollected = summary.montant_restant !== null && summary.montant_restant <= 0;

  const messages = useMemo(() => {
    return (donations || [])
      .filter((d) => String(d?.message || '').trim().length > 0)
      .map((d) => ({
        id: d.id,
        donneur_nom: (d.donneur_nom || 'Donneur').trim() || 'Donneur',
        message: String(d.message).trim(),
      }));
  }, [donations]);

  const setReaction = (donationId, reaction) => {
    setMessageReactions((prev) => ({
      ...prev,
      [donationId]: prev[donationId] === reaction ? undefined : reaction, // toggle
    }));
  };

  if (!user) return null;

  return (
    <div className="ben-page">
      <div className="ben-shell">
        <aside className="ben-sidebar">
          <div className="ben-brand">
            <div className="ben-brand__logo">DA</div>
            <div className="ben-brand__text">
              <div className="ben-brand__title">DON’ACT</div>
              <div className="ben-brand__sub">Espace Bénéficiaire</div>
            </div>
          </div>

          <nav className="ben-nav ben-nav--icons">
            <button
              className={`ben-nav__item ${activeTab === 'card' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('card')}
            >
              <IdCard className="nav-ic" />
              <span>Mon card</span>
            </button>

            <button
              className={`ben-nav__item ${activeTab === 'donations' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('donations')}
            >
              <HandHeart className="nav-ic" />
              <span>Liste des donneurs</span>
            </button>

            <button
              className={`ben-nav__item ${activeTab === 'messages' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('messages')}
            >
              <MessageSquare className="nav-ic" />
              <span>Messages reçus</span>
            </button>
          </nav>

          <div className="ben-sidebar__footer">
            <div className="ben-user">
              <div className="ben-user__avatar">{initials}</div>
              <div className="ben-user__meta">
                <div className="ben-user__name">
                  {user.nom} {user.prenom}
                </div>
                <div className="ben-user__role">{user.email}</div>
              </div>
            </div>

            <button className="btn btn--danger btn--block btn--withIcon" type="button" onClick={handleLogout}>
              <LogOut className="btn-ic" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        <main className="ben-main">
          {/* =======================
              CARD (modern like association)
          ======================= */}
          {activeTab === 'card' && (
            <>
              <div className="ben-topbar">
                <div>
                  <h1 className="ben-title">Mon card</h1>
                  <p className="ben-subtitle">Carte du bénéficiaire</p>
                </div>
              </div>

              <section className="ben-grid">
                <div className="ben-card ben-card--full">
                  {profileLoading ? (
                    <div className="ben-empty">
                      <div className="ben-empty__title">Chargement…</div>
                      <div className="ben-empty__text">Récupération de vos informations.</div>
                    </div>
                  ) : profileError ? (
                    <div className="ben-alert ben-alert--danger">{profileError}</div>
                  ) : (
                    <div className="ben-cardx-wrap">
                      <div className="ben-cardx">
                        <div className="ben-cardx__logoText">DON’AC<span>T</span></div>

                        <div className="ben-cardx__avatarBox">
                          <div className="ben-cardx__avatar">{initials}</div>
                        </div>

                        <div className="ben-cardx__name">{fullName || '—'}</div>

                        <div className="ben-cardx__grid">
                          <div className="ben-cardx__field">
                            <div className="ben-cardx__label">Email</div>
                            <div className="ben-cardx__value">{profile?.email || user?.email || '—'}</div>
                          </div>

                          <div className="ben-cardx__field">
                            <div className="ben-cardx__label">Téléphone</div>
                            <div className="ben-cardx__value">{profile?.telephone || '—'}</div>
                          </div>

                          <div className="ben-cardx__field">
                            <div className="ben-cardx__label">CIN</div>
                            <div className="ben-cardx__value">{profile?.cin || '—'}</div>
                          </div>

                          <div className="ben-cardx__field">
                            <div className="ben-cardx__label">Date naissance</div>
                            <div className="ben-cardx__value">{profile?.date_naissance || '—'}</div>
                          </div>

                          <div className="ben-cardx__field">
                            <div className="ben-cardx__label">Genre</div>
                            <div className="ben-cardx__value">{profile?.genre || '—'}</div>
                          </div>

                          <div className="ben-cardx__field">
                            <div className="ben-cardx__label">Situation</div>
                            <div className="ben-cardx__value">{profile?.situation_familiale || '—'}</div>
                          </div>

                          <div className="ben-cardx__field ben-cardx__field--full">
                            <div className="ben-cardx__label">Adresse</div>
                            <div className="ben-cardx__value">{profile?.adresse || '—'}</div>
                          </div>

                          <div className="ben-cardx__field ben-cardx__field--full">
                            <div className="ben-cardx__label">Association</div>
                            <div className="ben-cardx__value">{profile?.association_nom || '—'}</div>
                          </div>

                          <div className="ben-cardx__field ben-cardx__field--full">
                            <div className="ben-cardx__label">Description</div>
                            <div className="ben-cardx__value ben-cardx__value--desc">
                              {profile?.description?.trim() ? profile.description : '—'}
                            </div>
                          </div>
                        </div>

                        <div className="ben-cardx__footer">Carte bénéficiaire DON’ACT</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* =======================
              DONATIONS
          ======================= */}
          {activeTab === 'donations' && (
            <>
              <div className="ben-topbar">
                <div>
                  <h1 className="ben-title">Liste des donneurs</h1>
                  <p className="ben-subtitle">Historique des dons reçus.</p>
                </div>
              </div>

              <section className="ben-grid">
                <div className="ben-card ben-card--full">
                  <div className="ben-kpis">
                    <div className="ben-kpi">
                      <div className="ben-kpi__label">Montant collecté</div>
                      <div className="ben-kpi__value">{summary.total_collecte.toFixed(2)} DT</div>
                    </div>

                    <div className="ben-kpi">
                      <div className="ben-kpi__label">Montant à collecter</div>
                      <div className="ben-kpi__value">
                        {summary.montant_a_collecter === null ? '—' : `${summary.montant_a_collecter.toFixed(2)} DT`}
                      </div>
                    </div>

                    <div className="ben-kpi">
                      <div className="ben-kpi__label">Montant restant</div>
                      <div className="ben-kpi__value">
                        {summary.montant_restant === null ? '—' : `${summary.montant_restant.toFixed(2)} DT`}
                      </div>
                    </div>

                    <div className="ben-kpi">
                      <div className="ben-kpi__label">Nombre de dons</div>
                      <div className="ben-kpi__value">{donations.length}</div>
                    </div>
                  </div>

                  {isCollected && <div className="ben-collected">Objectif atteint: le montant a été entièrement collecté.</div>}
                </div>

                <div className="ben-card ben-card--full">
                  <div className="ben-card__head ben-card__head--row">
                    <div>
                      <h2 className="ben-card__title">Dons reçus</h2>
                      <p className="ben-card__desc">Noms des donneurs et montants.</p>
                    </div>
                    <div className="ben-pill">{donationsLoading ? 'Chargement…' : `${donations.length} don(s)`}</div>
                  </div>

                  {donationsError && <div className="ben-alert ben-alert--danger">{donationsError}</div>}

                  {!donationsLoading && !donationsError && donations.length === 0 && (
                    <div className="ben-empty">
                      <div className="ben-empty__title">Aucun don pour le moment</div>
                      <div className="ben-empty__text">Quand un donneur vous aide, la liste apparaîtra ici.</div>
                    </div>
                  )}

                  {donations.length > 0 && (
                    <div className="ben-table-wrap">
                      <table className="ben-table">
                        <thead>
                          <tr>
                            <th>Donneur</th>
                            <th>Montant</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donations.map((d) => {
                            const dn = (d.donneur_nom || '').trim() || 'Donneur';
                            const dateStr = d.created_at ? new Date(d.created_at).toLocaleString() : '—';
                            return (
                              <tr key={d.id}>
                                <td className="ben-td-strong">{dn}</td>
                                <td className="ben-td-money">{Number(d.montant || 0).toFixed(2)} DT</td>
                                <td className="ben-td-muted">{dateStr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* =======================
              MESSAGES (no date/montant + reactions)
          ======================= */}
          {activeTab === 'messages' && (
            <>
              <div className="ben-topbar">
                <div>
                  <h1 className="ben-title">Messages reçus</h1>
                  <p className="ben-subtitle">Les messages d’encouragement envoyés par les donneurs.</p>
                </div>
              </div>

              <section className="ben-grid">
                <div className="ben-card ben-card--full">
                  <div className="ben-card__head ben-card__head--row">
                    <div>
                      <h2 className="ben-card__title">Encouragements</h2>
                      <p className="ben-card__desc">Réagissez avec un emoji si vous aimez (ou non) le message.</p>
                    </div>
                    <div className="ben-pill">{donationsLoading ? 'Chargement…' : `${messages.length} message(s)`}</div>
                  </div>

                  {donationsError && <div className="ben-alert ben-alert--danger">{donationsError}</div>}

                  {!donationsLoading && !donationsError && messages.length === 0 && (
                    <div className="ben-empty">
                      <div className="ben-empty__title">Aucun message pour le moment</div>
                      <div className="ben-empty__text">Quand un donneur ajoute un message, il apparaîtra ici.</div>
                    </div>
                  )}

                  {messages.length > 0 && (
                    <div className="ben-msgList">
                      {messages.map((m) => {
                        const r = messageReactions[m.id]; // 'love' | 'grr' | undefined
                        return (
                          <div key={m.id} className="ben-msgCard">
                            <div className="ben-msgTop">
                              <div className="ben-msgFrom">{m.donneur_nom}</div>

                              <div className="ben-msgReact">
                                <button
                                  className={`ben-reactBtn ${r === 'love' ? 'is-active is-love' : ''}`}
                                  type="button"
                                  onClick={() => setReaction(m.id, 'love')}
                                  aria-label="J'aime"
                                  title="J'aime"
                                >
                                  😍
                                </button>
                                <button
                                  className={`ben-reactBtn ${r === 'grr' ? 'is-active is-grr' : ''}`}
                                  type="button"
                                  onClick={() => setReaction(m.id, 'grr')}
                                  aria-label="Je n'aime pas"
                                  title="Je n'aime pas"
                                >
                                  😡
                                </button>
                              </div>
                            </div>

                            <div className="ben-msgText">“{m.message}”</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardBeneficiaire;