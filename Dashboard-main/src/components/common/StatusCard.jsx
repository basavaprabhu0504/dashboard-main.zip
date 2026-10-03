export default function StatusCard({ title, value, subtitle, tone = 'blue' }) {
  const tones = {
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    blue: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    yellow: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    red: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    gray: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-panel ${tones[tone]}`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="mt-2 text-sm opacity-70">{subtitle}</p>}
    </div>
  );
}
