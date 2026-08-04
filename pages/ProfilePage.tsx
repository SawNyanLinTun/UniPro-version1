import React from 'react';
import { User, FileText, Briefcase, GraduationCap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Profile identity / skills / education data left as current mock values
  const displayName = user?.name ?? 'Supakorn Tech';
  const skills = ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes'];

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-12">
            <section className="glass-card p-12 rounded-[60px] flex items-center gap-10">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-resin-purple flex items-center justify-center p-1 shrink-0">
                <div className="w-full h-full rounded-full bg-bg flex items-center justify-center overflow-hidden">
                  <User size={64} className="text-text-muted" />
                </div>
              </div>
              <div>
                <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">{displayName}</h1>
                <p className="font-mono text-sm text-primary uppercase tracking-widest">
                  Computer Engineering @ Chula
                </p>
                <div className="flex gap-4 mt-6">
                  <button type="button" className="text-[0.6rem] font-mono border border-border px-4 py-2 rounded-lg hover:bg-surface-hover">
                    {t('profile.edit')}
                  </button>
                  <button type="button" className="text-[0.6rem] font-mono border border-border px-4 py-2 rounded-lg hover:bg-surface-hover">
                    {t('profile.settings')}
                  </button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-10 rounded-[40px]">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-3 font-display">
                    <FileText size={20} className="text-primary" /> {t('profile.cv')}
                  </h3>
                  <button type="button" className="text-xs text-primary hover:underline">
                    {t('profile.update')}
                  </button>
                </div>
                <div className="p-6 bg-surface-elevated border border-border rounded-2xl flex items-center gap-4">
                  <FileText className="text-text-muted" />
                  <div>
                    <p className="text-sm font-bold">tech_resume_v2.pdf</p>
                    <p className="text-[0.6rem] text-text-muted uppercase font-mono">{t('profile.updatedAgo')}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-10 rounded-[40px]">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-3 font-display">
                  <Briefcase size={20} className="text-resin-purple" /> {t('profile.stats')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-elevated rounded-2xl">
                    <p className="text-[0.6rem] font-mono text-text-muted uppercase">{t('profile.matchScore')}</p>
                    <p className="text-2xl font-black">94%</p>
                  </div>
                  <div className="p-4 bg-surface-elevated rounded-2xl">
                    <p className="text-[0.6rem] font-mono text-text-muted uppercase">{t('profile.applied')}</p>
                    <p className="text-2xl font-black">08</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:w-80 space-y-8">
            <div className="glass-card p-8 rounded-[40px]">
              <h3 className="font-mono text-[0.6rem] uppercase text-primary mb-6 tracking-widest">
                {t('profile.education')}
              </h3>
              <div className="flex gap-4 mb-6">
                <GraduationCap className="text-text-muted shrink-0" size={20} />
                <div>
                  <p className="text-sm font-bold">Chulalongkorn University</p>
                  <p className="text-xs text-text-muted">B.Eng Computer Engineering</p>
                  <p className="text-xs text-text-muted">Graduation 2025</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[40px]">
              <h3 className="font-mono text-[0.6rem] uppercase text-primary mb-6 tracking-widest">
                {t('profile.skills')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-surface-elevated rounded-full text-[0.6rem] font-mono border border-border"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
