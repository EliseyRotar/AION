import { useState } from 'react';
import { User, Mail, Shield, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Il mio Profilo</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Gestisci le tue informazioni personali</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center">
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-xl mx-auto mb-4"
            style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
          >
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            {user?.full_name || user?.username}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{user?.email}</p>
          
          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${
            user?.role === 'admin' 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            <Shield size={16} />
            {user?.role === 'admin' ? 'Amministratore' : 'Utente'}
          </span>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Informazioni Account</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <User className="text-primary-600 dark:text-primary-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Username</p>
                <p className="font-semibold text-slate-900 dark:text-white">{user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Mail className="text-primary-600 dark:text-primary-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-semibold text-slate-900 dark:text-white">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Shield className="text-primary-600 dark:text-primary-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ruolo</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {user?.role === 'admin' ? 'Amministratore' : 'Utente Standard'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Per modificare le tue informazioni, contatta un amministratore.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}