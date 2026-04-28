import { User, Building2, ArrowRight } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'student' | 'employer') => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const roles = [
    {
      id: 'student',
      title: 'I am a Student',
      desc: 'Hash your certificates and register them on the Stellar ledger.',
      icon: User,
      color: 'from-emerald-400 to-teal-600',
      shadow: 'shadow-emerald-500/20'
    },
    {
      id: 'employer',
      title: 'I am an Employer',
      desc: 'Verify candidate credentials and issue on-chain hiring bonuses.',
      icon: Building2,
      color: 'from-blue-400 to-indigo-600',
      shadow: 'shadow-blue-500/20'
    }
  ];

  return (
    <div className="max-w-4xl w-full mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          Choose Your Path
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Stellarni connects the entire professional ecosystem on a foundation of cryptographic trust.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => onSelectRole(role.id as 'student' | 'employer')}
            className="group relative flex flex-col items-center p-8 rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl hover:border-slate-700 hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-95 text-center h-full"
          >
            <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center shadow-lg ${role.shadow} mb-6 group-hover:scale-110 transition-transform duration-300`}>
              <role.icon className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              {role.title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              {role.desc}
            </p>

            <div className="mt-auto flex items-center gap-2 text-emerald-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              Get Started <ArrowRight className="w-4 h-4" />
            </div>

            {/* Subtle glow effect on hover */}
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
          </button>
        ))}
      </div>
    </div>
  );
}
