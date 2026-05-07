export default function Badge({ children, variant = "primary", size = "md", icon: Icon = null }) {
  const variants = {
    primary: "badge-primary",
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
  };
  
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5"
  };
  
  return (
    <span className={`badge ${variants[variant]} ${sizes[size]}`}>
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />}
      {children}
    </span>
  );
}