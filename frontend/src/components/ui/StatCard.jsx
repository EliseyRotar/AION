import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = "primary", 
  trend = null, // { value: "+12%", direction: "up" }
  subtitle = null 
}) {
  const colors = {
    primary: "from-primary-500 to-primary-600 bg-primary-50 dark:bg-primary-900/20",
    emerald: "from-emerald-500 to-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    violet: "from-violet-500 to-violet-600 bg-violet-50 dark:bg-violet-900/20",
    orange: "from-orange-500 to-orange-600 bg-orange-50 dark:bg-orange-900/20",
    pink: "from-pink-500 to-pink-600 bg-pink-50 dark:bg-pink-900/20",
    cyan: "from-cyan-500 to-cyan-600 bg-cyan-50 dark:bg-cyan-900/20"
  };
  
  const [gradientColor, bgColor] = colors[color].split(' ');
  
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp size={14} className="text-emerald-500" />;
    if (trend.direction === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-slate-400" />;
  };
  
  return (
    <div className={`${bgColor} rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover-lift animate-fade-in`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientColor} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-semibold">
            {getTrendIcon()}
            <span className={
              trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
              trend.direction === 'down' ? 'text-red-600 dark:text-red-400' :
              'text-slate-500'
            }>
              {trend.value}
            </span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {value}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}