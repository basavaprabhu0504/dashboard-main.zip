import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Atom,
  Bell,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  X,
  Home as HomeIcon,
  Server,
  Sliders,
  ShieldAlert,
  Radio,
  Activity,
  Terminal,
  Layers,
  FileText,
} from 'lucide-react';
import { mockData } from '../../services/mockData';

const navigation = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/qvpn', label: 'QVPN', icon: Atom },
  { to: '/lab', label: 'Lab Overview', icon: Server },
  { to: '/vpn', label: 'VPN Configuration', icon: Sliders },
  { to: '/attack', label: 'Attack Control', icon: ShieldAlert },
  { to: '/packets', label: 'Packet Monitoring', icon: Radio },
  { to: '/performance', label: 'Performance', icon: Activity },
  { to: '/logs', label: 'Logs', icon: Terminal },
  { to: '/results', label: 'Results', icon: ShieldCheck },
  { to: '/comparison', label: 'Comparison', icon: Layers },
  { to: '/report', label: 'Report', icon: FileText },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="flex min-h-screen relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Sidebar with dedicated scrollable navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex flex-col w-72 border-r ${
            darkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'
          } backdrop-blur shadow-2xl transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header */}
          <div
            className={`flex shrink-0 items-center justify-between border-b px-5 py-5 ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div>
              <p className="text-lg font-semibold tracking-tight">QuantumVPN</p>
              <p className="text-xs opacity-70">Command Center</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Navigation List */}
          <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4 select-none">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    isActive
                      ? darkMode
                        ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                        : 'bg-cyan-100 text-cyan-700 font-medium'
                      : darkMode
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div
            className={`shrink-0 border-t p-3 text-[11px] text-center opacity-60 ${
              darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            QVPN • Host-Only Evaluation Lab
          </div>
        </aside>

        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
          }`}
        >
          <header
            className={`sticky top-0 z-20 border-b ${
              darkMode ? 'border-slate-800 bg-slate-950/80 backdrop-blur' : 'border-slate-200 bg-white/80 backdrop-blur'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`rounded-lg p-2 transition ${
                    darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title={sidebarOpen ? 'Hide navigation' : 'Show navigation'}
                >
                  <Menu size={18} />
                </button>
                <div>
                  <p className="text-lg font-semibold">{mockData.project.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="rounded-full p-2 transition hover:bg-slate-800/60"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="rounded-full p-2 transition hover:bg-slate-800/60">
                  <Bell size={18} />
                </button>
                <button className="rounded-full p-2 transition hover:bg-slate-800/60">
                  <Settings size={18} />
                </button>
                <div
                  className={`hidden items-center gap-3 rounded-full px-3 py-2 text-sm sm:flex ${
                    darkMode ? 'bg-slate-900' : 'bg-slate-100'
                  }`}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span>Researcher</span>
                </div>
              </div>
            </div>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
