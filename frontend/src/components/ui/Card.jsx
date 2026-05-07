export default function Card({ children, className = "", hover = false, glass = false }) {
  const baseClass = glass 
    ? "glass rounded-2xl p-6" 
    : "card p-6";
    
  const hoverClass = hover ? "card-hover" : "";
  
  return (
    <div className={`${baseClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`pb-4 border-b border-slate-200 dark:border-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <h3 className={`text-lg font-bold text-slate-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`pt-4 ${className}`}>
      {children}
    </div>
  );
}