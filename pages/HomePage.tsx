import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, Zap, BrainCircuit, Loader2 } from 'lucide-react';
import { getInternshipRecommendations } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    recommendedCategories: string[];
    keySkills: string[];
    advice: string;
  } | null>(null);

  const handleAiInsights = async () => {
    if (!searchQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await getInternshipRecommendations(searchQuery);
      setAiAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const features = [
    { icon: <Search className="text-primary" />, title: t('home.feature1Title'), desc: t('home.feature1Desc') },
    { icon: <Sparkles className="text-resin-purple" />, title: t('home.feature2Title'), desc: t('home.feature2Desc') },
    { icon: <Zap className="text-accent" />, title: t('home.feature3Title'), desc: t('home.feature3Desc') },
  ];

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.8s_ease-out]">
      <div className="max-w-7xl mx-auto py-24">
        <section className="max-w-4xl mb-24">
          <span className="font-mono text-[0.7rem] text-primary tracking-[0.2em] uppercase mb-4 block">
            {t('home.eyebrow')}
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.08] tracking-tight mb-10 text-text">
            {t('home.headline')}
          </h1>
          <p className="text-xl text-text-secondary mb-12 max-w-2xl leading-relaxed">
            {t('home.subhead')}
          </p>

          <div className="relative max-w-2xl group mb-8">
            <div className="glass-input p-2 pl-8 rounded-full flex items-center transition-all duration-300 focus-within:ring-1 ring-primary/30">
              <input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                className="bg-transparent border-none outline-none flex-1 text-lg py-3 text-text placeholder:text-text-muted"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiInsights()}
              />
              <button
                type="button"
                onClick={handleAiInsights}
                disabled={isAiLoading}
                className="bg-text text-bg px-8 py-3 rounded-full font-mono text-[0.7rem] font-bold uppercase hover:bg-primary hover:text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAiLoading ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                {isAiLoading ? t('home.analyzing') : t('home.aiInsights')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="text-text-secondary hover:text-text px-6 py-2 rounded-full font-mono text-[0.65rem] font-bold uppercase border border-border hover:border-border-strong transition-all"
            >
              {t('home.browseRoles')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/smartmatch')}
              className="text-primary hover:text-text px-6 py-2 rounded-full font-mono text-[0.65rem] font-bold uppercase border border-primary/20 hover:border-primary/50 transition-all flex items-center gap-2"
            >
              <Sparkles size={14} /> {t('home.smartmatchCta')}
            </button>
          </div>
        </section>

        {aiAnalysis && (
          <div className="mb-24 glass-card rounded-[40px] p-10 border-primary/20 animate-[revealUp_0.6s_ease-out_forwards]">
            <div className="flex flex-col md:flex-row gap-12">
              <div className="flex-1">
                <h3 className="text-primary font-mono text-[0.7rem] uppercase mb-6 tracking-widest flex items-center gap-2">
                  <BrainCircuit size={16} /> {t('home.adviceTitle')}
                </h3>
                <p className="text-xl text-text leading-relaxed italic">"{aiAnalysis.advice}"</p>
              </div>
              <div className="lg:w-1/3 space-y-8">
                <div>
                  <h3 className="text-resin-purple font-mono text-[0.6rem] uppercase mb-4 tracking-widest">
                    {t('home.growthSectors')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.recommendedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="bg-resin-purple/10 border border-resin-purple/20 px-3 py-1 rounded-full text-[0.65rem] text-resin-purple font-mono uppercase"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-accent font-mono text-[0.6rem] uppercase mb-4 tracking-widest">
                    {t('home.skillsPolish')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.keySkills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-accent-muted border border-accent/20 px-3 py-1 rounded-full text-[0.65rem] text-accent font-mono uppercase"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {features.map((item) => (
            <div key={item.title} className="glass-card p-10 rounded-[40px] hover:border-border-strong transition-all">
              <div className="mb-6">{item.icon}</div>
              <h3 className="text-2xl font-bold mb-4 font-display">{item.title}</h3>
              <p className="text-text-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="glass-card p-16 rounded-[60px] relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 font-display">
                {t('home.deepDiveTitle')}
              </h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">{t('home.deepDiveBody')}</p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm font-mono text-text-secondary">
                  <div className="w-2 h-2 rounded-full bg-primary" /> {t('home.bullet1')}
                </li>
                <li className="flex items-center gap-3 text-sm font-mono text-text-secondary">
                  <div className="w-2 h-2 rounded-full bg-resin-purple" /> {t('home.bullet2')}
                </li>
                <li className="flex items-center gap-3 text-sm font-mono text-text-secondary">
                  <div className="w-2 h-2 rounded-full bg-accent" /> {t('home.bullet3')}
                </li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/smartmatch')}
                className="bg-primary text-white px-8 py-3 rounded-full font-mono text-xs font-bold uppercase hover:opacity-90 transition-all"
              >
                {t('home.launchSmartmatch')}
              </button>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-64 h-64 relative">
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                <div className="relative glass-card w-full h-full rounded-[40px] flex items-center justify-center border border-primary/30">
                  <Sparkles size={80} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
