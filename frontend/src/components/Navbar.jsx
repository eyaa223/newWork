import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import logo from '../assets/hh.png';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);
  const notifRef = useRef(null);

  const demandesDesktopRef = useRef(null);
  const demandesMobileRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [showDemandesDropdownDesktop, setShowDemandesDropdownDesktop] = useState(false);
  const [showDemandesDropdownMobile, setShowDemandesDropdownMobile] = useState(false);

  // ✅ logged in only if token + role exist
  const isLoggedIn = useMemo(() => {
    return Boolean(user?.token && user?.role);
  }, [user?.token, user?.role]);

  // ✅ Dashboard routes ONLY
  const isDashboardRoute = useMemo(() => {
    const p = location.pathname || '';
    return (
      p.startsWith('/admin/dashboard') ||
      p.startsWith('/avocat/dashboard') ||
      p.startsWith('/association/dashboard') ||
      p.startsWith('/dashboard-donneur') ||
      p.startsWith('/dashboard-beneficiaire')
    );
  }, [location.pathname]);

  // ✅ Private actions appear ONLY inside dashboards
  const canShowPrivateActions = useMemo(() => {
    return Boolean(isLoggedIn && isDashboardRoute);
  }, [isLoggedIn, isDashboardRoute]);

  // ✅ Notifications only inside dashboards (same as old behavior)
  const canShowNotifications = useMemo(() => {
    return Boolean(isLoggedIn && isDashboardRoute);
  }, [isLoggedIn, isDashboardRoute]);

  // ✅ If NOT in dashboard => always show Connexion (even if logged in from localStorage)
  const shouldShowConnexion = useMemo(() => {
    return !isDashboardRoute;
  }, [isDashboardRoute]);

  const handleLogout = useCallback(() => {
    logout();
    setNotifications([]);
    setShowNotifDropdown(false);
    setMobileOpen(false);
    navigate('/');
  }, [logout, navigate]);

  const fetchNotifications = useCallback(async () => {
    if (!canShowNotifications) return;

    try {
      let res;

      if (user?.role === 'beneficiaire') {
        res = await axios.get('http://localhost:5000/beneficiaire/notifications', {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
      } else {
        res = await axios.get('http://localhost:5000/api/notification', {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
      }

      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('[Navbar] fetchNotifications error', err);

      // ✅ token expired / invalid => logout
      const status = err?.response?.status;
      const msg = (err?.response?.data?.message || '').toLowerCase();
      if (status === 401 && (msg.includes('expir') || msg.includes('token'))) {
        handleLogout();
      }
    }
  }, [canShowNotifications, user?.role, user?.token, handleLogout]);

  useEffect(() => {
    if (!canShowNotifications) {
      setNotifications([]);
      setShowNotifDropdown(false);
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [canShowNotifications, fetchNotifications]);

  const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(
    (n) => Number(n?.is_read) === 0,
  ).length;

  const markAsRead = async (notificationId) => {
    if (!canShowNotifications) return;
    if (!notificationId) return;

    try {
      let url;
      if (user?.role === 'beneficiaire') {
        url = `http://localhost:5000/beneficiaire/notifications/${notificationId}/read`;
      } else {
        url = `http://localhost:5000/api/notification/read/${notificationId}`;
      }

      await axios.put(url, {}, { headers: { Authorization: `Bearer ${user?.token}` } });

      setNotifications((prev) =>
        (Array.isArray(prev) ? prev : []).map((n) =>
          n?.id === notificationId ? { ...n, is_read: 1 } : n,
        ),
      );

      await fetchNotifications();
    } catch (err) {
      console.error('Impossible de marquer la notification comme lue', err);
    }
  };

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5000/associations/public?search=${searchQuery}`);
        setSearchResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSearchResults();
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchDropdown(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifDropdown(false);
      if (demandesDesktopRef.current && !demandesDesktopRef.current.contains(event.target)) setShowDemandesDropdownDesktop(false);
      if (demandesMobileRef.current && !demandesMobileRef.current.contains(event.target)) setShowDemandesDropdownMobile(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDashboardPath = () => {
    if (!isLoggedIn) return '/login';
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'avocat') return '/avocat/dashboard';
    if (user?.role === 'association') return '/association/dashboard';
    if (user?.role === 'donneur') return '/dashboard-donneur';
    if (user?.role === 'beneficiaire') return '/dashboard-beneficiaire';
    return '/';
  };

  const goDemandeAssociation = () => {
    navigate('/demande');
    setShowDemandesDropdownDesktop(false);
    setShowDemandesDropdownMobile(false);
    setMobileOpen(false);
  };

  const goDemandeAide = () => {
    navigate('/demande-aide');
    setShowDemandesDropdownDesktop(false);
    setShowDemandesDropdownMobile(false);
    setMobileOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-logo" onClick={() => setMobileOpen(false)}>
          <img src={logo} alt="Logo" className="nav-logo-img" />
          <span className="nav-logo-text">DON’ACT</span>
        </Link>

        <div className="nav-search" ref={searchRef}>
          <span className="nav-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher une association..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            className="nav-search-input"
          />
          {showSearchDropdown && searchResults.length > 0 && (
            <ul className="nav-search-dropdown">
              {searchResults.map((assoc) => (
                <li
                  key={assoc?.id}
                  onClick={() => {
                    if (!assoc?.id) return;
                    navigate(`/association/${assoc.id}`);
                    setShowSearchDropdown(false);
                    setSearchQuery('');
                    setMobileOpen(false);
                  }}
                  className="nav-search-item"
                >
                  🏢 {assoc?.nom}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          className="nav-burger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <div className="nav-links">
          <Link to="/" className="nav-link">Accueil</Link>
          <Link to="/about" className="nav-link">À propos</Link>

          <div className="nav-dropdown" ref={demandesDesktopRef}>
            <button
              className="nav-link nav-link-cta"
              type="button"
              onClick={() => setShowDemandesDropdownDesktop((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showDemandesDropdownDesktop}
            >
              Demande ▼
            </button>

            {showDemandesDropdownDesktop && (
              <div className="nav-dropdown-menu" role="menu">
                <button className="nav-dropdown-item" type="button" onClick={goDemandeAssociation}>
                  Demande Association
                </button>
                <button className="nav-dropdown-item" type="button" onClick={goDemandeAide}>
                  Demande d'aide
                </button>
              </div>
            )}
          </div>

          {/* ✅ HOME / public pages: always show Connexion */}
          {shouldShowConnexion && (
            <Link to="/login" className="nav-link">
              Connexion
            </Link>
          )}

          {/* ✅ Dashboards: show old private buttons */}
          {canShowPrivateActions && (
            <>
              <button className="nav-link nav-link-btn" type="button" onClick={() => navigate(getDashboardPath())}>
                Tableau de bord
              </button>

              {canShowNotifications && (
                <div className="nav-notif" ref={notifRef}>
                  <button
                    onClick={() => {
                      setShowNotifDropdown((v) => !v);
                      if (!showNotifDropdown) fetchNotifications();
                    }}
                    className="nav-notif-btn"
                    type="button"
                  >
                    🔔 {unreadCount > 0 && <span className="nav-notif-badge">{unreadCount}</span>}
                  </button>

                  {showNotifDropdown && (
                    <div className="nav-notif-dropdown">
                      {(Array.isArray(notifications) ? notifications : []).length === 0 && (
                        <div className="nav-notif-empty">Aucune notification</div>
                      )}

                      {(Array.isArray(notifications) ? notifications : []).map((n) => (
                        <div
                          key={n?.id ?? `${n?.type || 'notif'}-${n?.created_at || Math.random()}`}
                          className={`nav-notif-item ${Number(n?.is_read) === 0 ? 'unread' : ''}`}
                          onClick={() => n?.id && markAsRead(n.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="nav-notif-msg">{n?.message ?? ''}</div>
                          <small>{n?.created_at ? new Date(n.created_at).toLocaleString() : ''}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="nav-mobile">
          <Link to="/" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>
            Accueil
          </Link>
          <Link to="/about" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>
            À propos
          </Link>

          <div className="nav-dropdown nav-dropdown--mobile" ref={demandesMobileRef}>
            <button
              className="nav-mobile-link"
              type="button"
              onClick={() => setShowDemandesDropdownMobile((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showDemandesDropdownMobile}
            >
              Demande
            </button>

            {showDemandesDropdownMobile && (
              <div className="nav-dropdown-menu nav-dropdown-menu--mobile" role="menu">
                <button className="nav-dropdown-item" type="button" onClick={goDemandeAssociation}>
                  Demande Association
                </button>
                <button className="nav-dropdown-item" type="button" onClick={goDemandeAide}>
                  Demande d'aide
                </button>
              </div>
            )}
          </div>

          {/* ✅ Mobile: HOME/public always show Connexion */}
          {shouldShowConnexion && (
            <Link to="/login" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>
              Connexion
            </Link>
          )}

          {/* ✅ Mobile: Dashboards show private buttons */}
          {canShowPrivateActions && (
            <>
              <button
                className="nav-mobile-link nav-mobile-link-btn"
                type="button"
                onClick={() => {
                  navigate(getDashboardPath());
                  setMobileOpen(false);
                }}
              >
                Tableau de bord
              </button>
              <button className="nav-mobile-btn nav-mobile-btn-danger" type="button" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;