import React, { useEffect, useMemo, useState } from 'react';
import { Search, Coins, Loader2 } from 'lucide-react';
import InternshipCard, { ApplyState, SaveState } from '../components/InternshipCard';
import { api, ApiJob } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const BrowsePage: React.FC = () => {
  const { t } = useLanguage();
  const { isAuthenticated, user, accessToken, openAuthModal } = useAuth();

  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');

  const isStudent = isAuthenticated && user?.role === 'student';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [openJobs, applications, saved] = await Promise.all([
          api.listJobs(),
          isStudent ? api.listApplications(accessToken) : Promise.resolve([]),
          isStudent ? api.listSaved(accessToken) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setJobs(openJobs);
        setAppliedIds(new Set(applications.map((a) => a.internshipId)));
        setSavedIds(new Set(saved.map((j) => j.id)));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStudent, accessToken]);

  // Category / location values stay as companies typed them, same convention as the Scholarship Ledger.
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(jobs.map((j) => j.category))).sort()],
    [jobs]
  );
  const locations = useMemo(
    () => ['All', ...Array.from(new Set(jobs.map((j) => j.location))).sort()],
    [jobs]
  );

  const filteredInternships = useMemo(() => {
    return jobs.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesLocation = selectedLocation === 'All' || item.location === selectedLocation;
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [jobs, searchQuery, selectedCategory, selectedLocation]);

  const labelFor = (value: string) => (value === 'All' ? t('common.all') : value);

  const applyStateFor = (job: ApiJob): ApplyState => {
    if (!isAuthenticated) return 'locked';
    if (user?.role !== 'student') return 'hidden';
    if (appliedIds.has(job.id)) return 'applied';
    if (applyingId === job.id) return 'busy';
    return 'idle';
  };

  const handleApply = async (job: ApiJob) => {
    setApplyingId(job.id);
    setApplyError(null);
    try {
      await api.apply(job.id, accessToken);
      setAppliedIds((prev) => new Set(prev).add(job.id));
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingId(null);
    }
  };

  const saveStateFor = (job: ApiJob): SaveState => {
    if (!isAuthenticated) return 'locked';
    if (user?.role !== 'student') return 'hidden';
    if (savingId === job.id) return 'busy';
    return savedIds.has(job.id) ? 'saved' : 'idle';
  };

  const handleToggleSave = async (job: ApiJob) => {
    setSavingId(job.id);
    setSaveError(null);
    const alreadySaved = savedIds.has(job.id);
    try {
      if (alreadySaved) {
        await api.unsaveJob(job.id, accessToken);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      } else {
        await api.saveJob(job.id, accessToken);
        setSavedIds((prev) => new Set(prev).add(job.id));
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16">
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-6">{t('browse.title')}</h1>
          <div className="glass-input max-w-2xl flex items-center p-2 pl-6 rounded-full">
            <Search className="text-text-muted mr-4" size={20} />
            <input
              type="text"
              placeholder={t('browse.searchPlaceholder')}
              className="bg-transparent border-none outline-none flex-1 py-3 text-text placeholder:text-text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {error && <p className="text-sm text-error mb-6 break-words">{error}</p>}
        {applyError && <p className="text-sm text-error mb-6 break-words">{applyError}</p>}
        {saveError && <p className="text-sm text-error mb-6 break-words">{saveError}</p>}

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="lg:w-72 space-y-10">
            <div>
              <h3 className="font-mono text-[0.7rem] uppercase text-primary mb-6 tracking-widest">
                {t('browse.categories')}
              </h3>
              <div className="flex flex-col gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left text-sm py-2 px-4 rounded-xl transition-all ${
                      selectedCategory === cat
                        ? 'bg-surface-elevated text-text font-bold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {labelFor(cat)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-mono text-[0.7rem] uppercase text-primary mb-6 tracking-widest">
                {t('browse.location')}
              </h3>
              <div className="flex flex-col gap-3">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    className={`text-left text-sm py-2 px-4 rounded-xl transition-all ${
                      selectedLocation === loc
                        ? 'bg-surface-elevated text-text font-bold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {labelFor(loc)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-10">
              <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
                {t('browse.showing', { count: filteredInternships.length })}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
                {filteredInternships.map((internship, i) => (
                  <InternshipCard
                    key={internship.id}
                    internship={internship}
                    delay={`${i * 0.05}s`}
                    applyState={applyStateFor(internship)}
                    onApply={() => handleApply(internship)}
                    onSignInRequired={() => openAuthModal('request')}
                    saveState={saveStateFor(internship)}
                    onToggleSave={() => handleToggleSave(internship)}
                  />
                ))}
                {filteredInternships.length === 0 && (
                  <div className="col-span-full py-24 text-center glass-card rounded-[40px] flex flex-col items-center">
                    <Coins size={40} className="text-text-muted mb-4" />
                    <p className="text-text-muted font-mono text-sm uppercase tracking-widest">
                      {t('browse.empty')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowsePage;
