import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { logout as logoutAPI } from '@/api/auth';
import { ClipboardList, LogOut, UserCircle, BarChart3, History, Cpu, MapPin, Users, LayoutDashboard, GitPullRequest, ShieldAlert } from 'lucide-react';
import Cookies from 'js-cookie';
import './dashboard-layout.css';

// Menu items per role
const MENU_CONFIG = {
  client: {
    brand: 'AT-Customer',
    brandSub: 'Espace Abonné',
    sections: [
      { label: 'Mon Espace', items: [
        { label: 'Réclamations', icon: ClipboardList, path: '/client/dashboard' },
      ]},
    ],
  },
  agent: {
    brand: 'AT-Agent',
    brandSub: 'Call Center',
    sections: [
      { label: 'Pilotage', items: [
        { label: 'Performance', icon: BarChart3, path: '/agent/dashboard', tab: 'dashboard' },
        { label: 'Tickets', icon: ClipboardList, path: '/agent/dashboard', tab: 'tickets' },
        { label: 'Historique', icon: History, path: '/agent/dashboard', tab: 'history' },
      ]},
    ],
  },
  agent_technique: {
    brand: 'AT-Technique',
    brandSub: 'Support National',
    sections: [
      { label: 'Pilotage', items: [
        { label: 'Performance', icon: BarChart3, path: '/technique/dashboard', tab: 'dashboard' },
        { label: 'Tickets Escaladés', icon: Cpu, path: '/technique/dashboard', tab: 'tickets' },
        { label: 'Historique', icon: History, path: '/technique/dashboard', tab: 'history' },
      ]},
    ],
  },
  agent_annexe: {
    brand: 'AT-Annexe',
    brandSub: 'Support Local',
    sections: [
      { label: 'Pilotage', items: [
        { label: 'Performance', icon: BarChart3, path: '/annexe/dashboard', tab: 'dashboard' },
        { label: 'Tickets Escaladés', icon: MapPin, path: '/annexe/dashboard', tab: 'tickets' },
        { label: 'Historique', icon: History, path: '/annexe/dashboard', tab: 'history' },
      ]},
    ],
  },
  admin: {
    brand: 'AT-Admin',
    brandSub: 'Direction Générale',
    sections: [
      { label: 'Pilotage', items: [
        { label: 'National', icon: LayoutDashboard, path: '/admin/dashboard', tab: 'stats' },
      ]},
      { label: 'Flux', items: [
        { label: 'Assignations', icon: GitPullRequest, path: '/admin/dashboard', tab: 'assignment' },
        { label: 'Experts', icon: Users, path: '/admin/dashboard', tab: 'agents' },
        { label: 'Audit', icon: History, path: '/admin/dashboard', tab: 'history' },
      ]},
      { label: 'Sécurité', items: [
        { label: 'Connexions', icon: ShieldAlert, path: '/admin/dashboard', tab: 'sessions' },
      ]},
    ],
  },
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      const refreshToken = Cookies.get('refresh');
      await logoutAPI(refreshToken);
    } catch (e) {}
    logout();
    navigate('/');
  };

  const role = user?.role || 'client';
  const config = MENU_CONFIG[role] || MENU_CONFIG.client;
  const displayName = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Utilisateur';
  const roleLabel = {
    client: 'Abonné',
    agent: 'Agent Support',
    agent_technique: 'Technicien',
    agent_annexe: 'Annexe',
    admin: 'Administrateur',
  }[role] || role;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="sidebar-brand-text">
            <h2>{config.brand}</h2>
            <p>{config.brandSub}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto pb-4">
          {config.sections.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="sidebar-section-label">{section.label}</div>
              <nav className="sidebar-nav">
                {section.items.map((item, idx) => {
                  const isActive = location.pathname === item.path &&
                    (!item.tab || location.search.includes(`tab=${item.tab}`));
                  return (
                    <button
                      key={idx}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (item.tab) {
                          navigate(`${item.path}?tab=${item.tab}`);
                        } else {
                          navigate(item.path);
                        }
                      }}
                    >
                      <item.icon />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <UserCircle className="w-5 h-5" />
            </div>
            <div className="sidebar-user-info">
              <h4>{displayName || 'Abonné AT'}</h4>
              <p>{roleLabel}</p>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
