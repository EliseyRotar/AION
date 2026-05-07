import { Heart, Github } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  const team = [
    "Lorenzo Androni",
    "Alessandro Vezzoli", 
    "Federico Agazzi",
    "Francesco Lo Iacono",
    "Lorenzo Gherardi"
  ];
  
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Team credits */}
        <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            👨‍💻 Team di Sviluppo
          </p>
          <div className="flex flex-wrap gap-2">
            {team.map((member, i) => (
              <span 
                key={i} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm text-slate-600 dark:text-slate-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-purple-500"></span>
                {member}
              </span>
            ))}
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            © {currentYear} AION. Sviluppato con 
            <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" /> 
            in Italia
          </p>
          
          <a 
            href="https://github.com/LorAnd245" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <Github size={18} />
            <span className="text-sm font-medium">GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}