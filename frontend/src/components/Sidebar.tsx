import React from "react";
import {
  Home,
  Binary,
  KeyRound,
  Lock,
  Unlock,
  Workflow,
  BarChart3,
  BookOpen,
  Cpu,
} from "lucide-react";

export type NavTab =
  | "home"
  | "prime-gen"
  | "key-gen"
  | "encryption"
  | "decryption"
  | "visualisation"
  | "performance"
  | "about";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: "home" as NavTab, label: "Home", icon: Home },
    { id: "prime-gen" as NavTab, label: "1. Prime Generation", icon: Binary },
    { id: "key-gen" as NavTab, label: "2. Key Generation", icon: KeyRound },
    { id: "encryption" as NavTab, label: "3. Encryption", icon: Lock },
    { id: "decryption" as NavTab, label: "4. Decryption", icon: Unlock },
    { id: "visualisation" as NavTab, label: "Visualisation", icon: Workflow },
    { id: "performance" as NavTab, label: "Performance", icon: BarChart3 },
    { id: "about" as NavTab, label: "About RSA", icon: BookOpen },
  ];

  return (
    <aside className="app-sidebar" aria-label="Main Navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <svg
            className="w-7 h-7 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-title">RSA</span>
          <span className="brand-subtitle">Cryptography Demonstrator</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon className="nav-icon" size={18} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-card">
          <div className="footer-title">
            <Cpu size={15} className="text-indigo-400" />
            <span>Parallel Prime Generation</span>
          </div>
          <p className="footer-desc">using Sieve of Eratosthenes</p>
          <div className="footer-tags">
            <span>Serial</span>
            <span className="dot">•</span>
            <span>OpenMP</span>
            <span className="dot">•</span>
            <span>Compare</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
