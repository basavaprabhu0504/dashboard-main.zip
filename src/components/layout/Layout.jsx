import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Menu, Moon, Settings, ShieldCheck, Sun, X } from 'lucide-react';
import { mockData } from '../../services/mockData';

const navigation = [
  { to: '/', label: 'Home', icon: ShieldCheck },
  { to: '/lab', label: 'Lab Overview', icon: ShieldCheck },
  { to: '/vpn', label: 'VPN Configuration', icon: ShieldCheck },
  { to: '/attack', label: 'Attack Control', icon: ShieldCheck },
  { to: '/packets', label: 'Packet Monitoring', icon: ShieldCheck },
  { to: '/performance', label: 'Performance', icon: ShieldCheck },
  { to: '/logs', label: 'Logs', icon: ShieldCheck },
  { to: '/results', label: 'Results', icon: ShieldCheck },
  { to: '/comparison', label: 'Comparison', icon: ShieldCheck },
  { to: '/report', label: 'Report', icon: ShieldCheck },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-30 w-72 border-r ${darkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'} transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between border-b px-5 py-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}">
            <div>
              <p className="text-lg font-semibold">QuantumVPN</p>
              <p className="text-sm opacity-70">Command Center</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 lg:hidden">
              <X size={18} />
            </button>
          </div>
          <nav className="mt-4 space-y-1 px-3">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${isActive ? (darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700') : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')}`}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className={`flex-1 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
          <header className={`sticky top-0 z-20 border-b ${darkMode ? 'border-slate-800 bg-slate-950/80 backdrop-blur' : 'border-slate-200 bg-white/80 backdrop-blur'}`}>
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-2">
                  <Menu size={18} />
                </button>
                <div>
                  <p className="text-lg font-semibold">{mockData.project.name}</p>
                  <p className="text-sm opacity-70">Engineering Lab • {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => setDarkMode(!darkMode)} className="rounded-full p-2">
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="rounded-full p-2">
                  <Bell size={18} />
                </button>
                <button className="rounded-full p-2">
                  <Settings size={18} />
                </button>
                <div className={`hidden items-center gap-3 rounded-full px-3 py-2 text-sm sm:flex ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
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
