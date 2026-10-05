import React, { useCallback, useEffect, useState } from 'react';
import { HeartOff, Loader2 } from 'lucide-react';
import InternshipCard from '../components/InternshipCard';
import { api, ApiJob } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SavedPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, accessToken } = useAuth();

  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await api.listSaved(accessToken));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user?.role === 'student') load();
    else setLoading(false);
  }, [user, load]);

  const handleUnsave = async (job: ApiJob) => {
    setRemovingId(job.id);
    setError(null);
    try {
      await api.unsaveJob(job.id, accessToken);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemovingId(null);
    }
  };

  if (user && user.role !== 'student') {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold mb-3">{t('saved.studentOnly')}</h1>
        <p className="text-text-secondary text-sm">{t('saved.studentOnlyBody')}</p>
      </div>
    );
  }

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-5xl font-extrabold tracking-tight mb-4">{t('saved.title')}</h1>
        <p className="text-text-secondary mb-16">{t('saved.subtitle')}</p>

        {error && <p className="text-sm text-error mb-6 break-words">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {jobs.map((internship, i) => (
              <InternshipCard
                key={internship.id}
                internship={internship}
                delay={`${i * 0.1}s`}
                saveState={removingId === internship.id ? 'busy' : 'saved'}
                onToggleSave={() => handleUnsave(internship)}
              />
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center glass-card rounded-[40px]">
            <HeartOff size={48} className="text-text-muted mb-6" />
            <p className="text-text-muted font-mono text-sm uppercase tracking-widest">{t('saved.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPage;
