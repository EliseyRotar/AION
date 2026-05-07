import { Heart, Github } from 'lucide-react';

const team = [
  "Lorenzo Androni",
  "Alessandro Vezzoli",
  "Federico Agazzi",
  "Francesco Lo Iacono",
  "Lorenzo Gherardi"
];

export default function Footer() {
  return (
    <footer className="
      border-t border-slate-200 dark:border-white/5
      bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100
      dark:bg-gradient-to-r dark:from-[#0a0c18] dark:via-[#0d1020] dark:to-[#0a0c18]
      mt-auto
    ">
      <div className="px-5 lg:px-8 py-5">
        {/* Team */}
        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-white/5">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest mb-3">
            👨‍💻 Team di Sviluppo
          </p>
          <div className="flex flex-wrap gap-2">
            {team.map((member, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1
                bg-slate-200 dark:bg-white/5
                border border-slate-300 dark:border-white/10
                rounded-full text-xs text-slate-700 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex-shrink-0" />
                {member}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600 dark:text-slate-600 flex items-center gap-1.5">
            © {new Date().getFullYear()} AION. Sviluppato con
            <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" />
            in Italia
          </p>
          <a
            href="https://github.com/LorAnd245"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-xs
              text-slate-600 dark:text-slate-600
              hover:text-slate-900 dark:hover:text-slate-300
              bg-slate-200 dark:bg-white/5
              hover:bg-slate-300 dark:hover:bg-white/10
              border border-slate-300 dark:border-white/10
              rounded-xl transition-all"
          >
            <Github size={14} /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
