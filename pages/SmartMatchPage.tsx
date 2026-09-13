import React, { useRef, useState } from 'react';
import {
  ListOrdered, CheckCircle2, FileText, Share2, Sparkles, ChevronRight, Loader2, Copy, Upload,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api, type ApiCvAnalyze, type ApiMatchResult } from '../services/api';

const SmartMatchPage: React.FC = () => {
  const { t } = useLanguage();
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<ApiCvAnalyze | null>(null);
  const [matchRows, setMatchRows] = useState<ApiMatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const preferenceRows = [
    'Distributed Systems Associate @ Agoda',
    'UI/UX Design Intern @ Lineman',
    'Data Science Intern @ SCB 10X',
  ];

  const steps = [
    { num: 1, label: t('smart.step1'), icon: <FileText size={20} /> },
    { num: 2, label: t('smart.step2'), icon: <Share2 size={20} /> },
    { num: 3, label: t('smart.step3'), icon: <ListOrdered size={20} /> },
    { num: 4, label: t('smart.step4'), icon: <CheckCircle2 size={20} /> },
  ];

  const onFilePicked = (file: File | null) => {
    setError(null);
    setAnalyzeResult(null);
    if (!file) {
      setSelectedFile(null);
      setFileName(null);
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
  };

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      if (!selectedFile) {
        setError(t('smart.uploadRequired'));
        return;
      }
      setIsProcessing(true);
      try {
        const result = await api.analyzeCv(selectedFile, accessToken);
        setAnalyzeResult(result);
        setStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('smart.analyzeFailed'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (step === 3) {
      setIsProcessing(true);
      try {
        const matches = await api.runMatch(accessToken);
        setMatchRows(matches);
        setStep(4);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('smart.matchFailed'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep((s) => Math.min(4, s + 1));
    }, 400);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('unipro.co.th/eval/auth-882-991');
    alert(t('smart.copyAlert'));
  };

  const displayMatches =
    matchRows.length > 0
      ? matchRows.slice(0, 5).map((m) => ({
          company: m.company,
          role: m.role,
          score: `${Math.round(((m.hscr + m.sssa) / 2) * 100)}%`,
        }))
      : [
          { company: 'Agoda', role: 'Distributed Systems', score: '—' },
          { company: 'KBTG', role: 'Business Development', score: '—' },
          { company: 'Omise', role: 'ML Engineer', score: '—' },
        ];

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-4xl mx-auto">
        <header className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full text-primary text-[0.6rem] font-mono uppercase tracking-widest mb-6">
            <Sparkles size={14} /> {t('smart.badge')}
          </div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-4">{t('smart.title')}</h1>
          <p className="text-text-secondary max-w-xl mx-auto">{t('smart.subtitle')}</p>
        </header>

        <div className="flex justify-between mb-20 relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.num} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                  step >= s.num
                    ? 'bg-primary text-white scale-110 shadow-[0_0_20px_rgba(79,109,247,0.35)]'
                    : 'bg-bg border border-border text-text-muted'
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`mt-4 font-mono text-[0.6rem] uppercase tracking-widest ${
                  step >= s.num ? 'text-text' : 'text-text-muted'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="glass-card p-12 rounded-[40px] mb-12 min-h-[400px] flex flex-col justify-center relative">
          {isProcessing && (
            <div className="absolute inset-0 z-20 glass-card rounded-[40px] flex flex-col items-center justify-center bg-bg/60 backdrop-blur-xl animate-[fadeIn_0.2s]">
              <Loader2 size={48} className="text-primary animate-spin mb-4" />
              <p className="font-mono text-[0.7rem] uppercase tracking-widest text-text">
                {step === 1 ? t('smart.processingCv') : t('smart.processing')}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center text-center animate-[fadeIn_0.3s]">
              <div className="w-20 h-20 bg-surface rounded-[24px] flex items-center justify-center mb-8 border border-border">
                <Upload size={32} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 font-display">{t('smart.uploadTitle')}</h3>
              <p className="text-text-secondary mb-10 max-w-sm">{t('smart.uploadBody')}</p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-md border-2 border-dashed rounded-[32px] p-12 transition-all group flex flex-col items-center justify-center
                ${fileName ? 'border-primary bg-primary-muted' : 'border-border hover:border-primary/50'}`}
              >
                <p className="text-sm font-mono text-text-muted group-hover:text-text transition-colors mb-2 uppercase">
                  {fileName ? t('smart.fileReceived') : t('smart.dragPdf')}
                </p>
                {fileName && <span className="text-primary font-bold">{fileName}</span>}
              </button>

              {analyzeResult && (
                <p className="mt-6 text-xs text-text-secondary font-mono max-w-md">
                  {t('smart.analyzeOk')
                    .replace('{skills}', String(analyzeResult.skills.length))
                    .replace('{dims}', String(analyzeResult.embedding_dims))}
                </p>
              )}
              {error && (
                <p className="mt-4 text-sm text-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-[fadeIn_0.3s]">
              <h3 className="text-2xl font-bold mb-6 font-display">{t('smart.evalTitle')}</h3>
              <p className="text-text-secondary mb-10">{t('smart.evalBody')}</p>
              {analyzeResult && (
                <div className="mb-8 p-5 glass-card rounded-2xl text-left">
                  <p className="text-[0.6rem] font-mono uppercase tracking-widest text-text-muted mb-3">
                    {t('smart.extractedSkills')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analyzeResult.skills.length === 0 && (
                      <span className="text-sm text-text-secondary">{t('smart.noSkills')}</span>
                    )}
                    {analyzeResult.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[0.65rem] font-mono px-3 py-1 rounded-full border border-border"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-text-muted font-mono">{t('smart.privacyNote')}</p>
                </div>
              )}
              <div className="glass-input p-4 rounded-2xl flex items-center justify-between mb-10 gap-4">
                <code className="text-xs text-primary overflow-hidden whitespace-nowrap">
                  unipro.co.th/eval/auth-882-991
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 text-[0.6rem] font-mono bg-text text-bg px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors shrink-0"
                >
                  <Copy size={12} /> {t('smart.copyLink')}
                </button>
              </div>
              <div className="p-6 bg-resin-purple/5 border border-resin-purple/20 rounded-[24px]">
                <p className="text-xs text-resin-purple uppercase font-mono tracking-widest mb-2">
                  {t('smart.whyTitle')}
                </p>
                <p className="text-sm text-text-secondary">{t('smart.whyBody')}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-[fadeIn_0.3s]">
              <h3 className="text-2xl font-bold mb-6 font-display">{t('smart.rankTitle')}</h3>
              <p className="text-text-secondary mb-10">{t('smart.rankBody')}</p>
              <div className="space-y-4 mb-10">
                {preferenceRows.map((item, i) => (
                  <div
                    key={item}
                    className="p-5 glass-card rounded-2xl flex items-center gap-6 cursor-grab active:cursor-grabbing hover:translate-x-2 transition-all group"
                  >
                    <span className="text-primary font-mono text-xl opacity-40 group-hover:opacity-100">
                      0{i + 1}
                    </span>
                    <span className="font-bold flex-1">{item}</span>
                    <ListOrdered size={16} className="text-text-muted" />
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-sm text-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="animate-[fadeIn_0.3s] text-center">
              <div className="w-24 h-24 bg-primary-muted rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/20">
                <Sparkles size={40} className="text-primary" />
              </div>
              <h3 className="text-3xl font-extrabold mb-4 font-display">{t('smart.doneTitle')}</h3>
              <p className="text-text-secondary mb-12">{t('smart.doneBody')}</p>

              <div className="space-y-4 max-w-lg mx-auto mb-12">
                {displayMatches.map((match) => (
                  <div
                    key={`${match.company}-${match.role}`}
                    className="p-6 glass-card rounded-[24px] border border-border hover:border-primary/30 flex justify-between items-center text-left transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-lg mb-1">{match.company}</h4>
                      <p className="text-[0.6rem] text-text-muted font-mono uppercase">{match.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary">{match.score}</span>
                      <p className="text-[0.5rem] font-mono text-text-muted uppercase">{t('smart.score')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isProcessing}
            className={`font-mono text-[0.7rem] uppercase tracking-widest transition-all ${
              step === 1 ? 'opacity-0' : 'text-text-secondary hover:text-text disabled:opacity-30'
            }`}
          >
            {t('common.back')}
          </button>

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={isProcessing}
            className="bg-text text-bg px-10 py-4 rounded-full font-mono text-xs font-bold uppercase hover:bg-primary hover:text-white transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {step === 4 ? t('smart.dashboard') : t('smart.continue')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartMatchPage;
