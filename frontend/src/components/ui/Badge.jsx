export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default:  'bg-white/5 text-slate-400 border-white/10',
    primary:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
    success:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger:   'bg-red-500/10 text-red-400 border-red-500/20',
    cyan:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}
