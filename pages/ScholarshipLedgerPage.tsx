import React, { useMemo, useState } from 'react';
import { GraduationCap, Hash, Building2, Shield } from 'lucide-react';
import { ScholarshipAlumni, ScholarshipTrack } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const MOCK_ALUMNI: ScholarshipAlumni[] = [
  {
    id: 'a1',
    track: 'web_development',
    maskedName: 'S****k T.',
    nameHash: 'a3f1c9e8b2d44710',
    companyLabel: 'Agoda',
    companyHash: '91bc44aa7712fe03',
    scholarshipYear: 2023,
    role: 'Frontend Intern',
    skills: ['react', 'typescript', 'css'],
    radar: {
      technicalSkills: 82,
      experienceDepth: 64,
      projects: 78,
      softSkills: 70,
      academicStrength: 75,
      toolsStack: 80,
    },
  },
  {
    id: 'a2',
    track: 'engineering',
    maskedName: 'N****a P.',
    nameHash: 'bb8812cd9930aa11',
    companyLabel: 'SCB 10X',
    companyHash: '55ee19ff0022cc88',
    scholarshipYear: 2022,
    role: 'ML Research Intern',
    skills: ['python', 'pytorch', 'nlp'],
    radar: {
      technicalSkills: 88,
      experienceDepth: 72,
      projects: 81,
      softSkills: 68,
      academicStrength: 90,
      toolsStack: 76,
    },
  },
  {
    id: 'a3',
    track: 'accounting',
    maskedName: 'K****n S.',
    nameHash: 'cc2200ffaabb9911',
    companyLabel: 'KBTG',
    companyHash: '33aa77bb1100dd22',
    scholarshipYear: 2024,
    role: 'Finance Ops Intern',
    skills: ['excel', 'sql', 'fintech'],
    radar: {
      technicalSkills: 60,
      experienceDepth: 58,
      projects: 55,
      softSkills: 84,
      academicStrength: 86,
      toolsStack: 62,
    },
  },
];

const ScholarshipLedgerPage: React.FC = () => {
  const { t } = useLanguage();
  const [track, setTrack] = useState<ScholarshipTrack | 'all'>('all');

  const trackLabel: Record<ScholarshipTrack, string> = {
    web_development: t('sch.web'),
    accounting: t('sch.acc'),
    engineering: t('sch.eng'),
  };

  const rows = useMemo(
    () => MOCK_ALUMNI.filter((a) => track === 'all' || a.track === track),
    [track]
  );

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-14 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full text-primary text-[0.6rem] font-mono uppercase tracking-widest mb-6">
            <Shield size={14} /> {t('sch.badge')}
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 font-display">{t('sch.title')}</h1>
          <p className="text-text-secondary text-lg leading-relaxed">{t('sch.subtitle')}</p>
        </header>

        <div className="flex flex-wrap gap-3 mb-10">
          {(['all', 'web_development', 'engineering', 'accounting'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTrack(key)}
              className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-widest border transition-colors ${
                track === key
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text-secondary hover:text-text hover:border-border-strong'
              }`}
            >
              {key === 'all' ? t('sch.allTracks') : trackLabel[key]}
            </button>
          ))}
        </div>

        <div className="grid gap-6">
          {rows.map((alum) => (
            <article key={alum.id} className="glass-card rounded-[28px] p-8 flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary-muted text-primary flex items-center justify-center shrink-0">
                <GraduationCap size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold">{alum.maskedName}</h2>
                  <span className="text-[0.65rem] font-mono uppercase tracking-widest text-text-muted px-3 py-1 rounded-full border border-border">
                    {trackLabel[alum.track]}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  {alum.role} · Class of {alum.scholarshipYear}
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Hash size={12} /> {alum.nameHash}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={12} /> {alum.companyLabel} · {alum.companyHash}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[0.6rem] font-mono uppercase tracking-widest text-text-muted mb-1">{t('sch.coverage')}</p>
                <p className="text-3xl font-black text-primary">
                  {Math.round(
                    (alum.radar.technicalSkills +
                      alum.radar.experienceDepth +
                      alum.radar.projects +
                      alum.radar.softSkills +
                      alum.radar.academicStrength +
                      alum.radar.toolsStack) /
                      6
                  )}
                  %
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScholarshipLedgerPage;
