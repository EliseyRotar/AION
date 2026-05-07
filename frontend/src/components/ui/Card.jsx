export default function Card({ children, className = '', hover = false, glass = false }) {
  const base = glass
    ? 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6'
    : 'bg-[#13162a] border border-white/5 rounded-2xl p-6';

  return (
    <div className={`${base} ${hover ? 'hover:border-violet-500/20 hover:-translate-y-0.5 transition-all duration-300' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`pb-4 border-b border-white/5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-base font-semibold text-slate-200 ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`pt-4 ${className}`}>
      {children}
    </div>
  );
}
