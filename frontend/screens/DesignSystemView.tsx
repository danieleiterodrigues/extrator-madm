
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { SYSTEM_PROMPT } from '../constants';

const DesignSystemView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ColorSwatch = ({ color, name, hex }: { color: string, name: string, hex: string }) => (
    <div className="flex flex-col gap-2">
      <div className={`h-16 w-full rounded-md border border-border-light dark:border-border-dark shadow-sm ${color}`}></div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">{name}</span>
        <span className="text-[10px] font-mono text-muted-dark uppercase tracking-tight">{hex}</span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1200px] flex flex-col gap-10 pb-20">
      <div className="flex flex-col gap-2 border-b border-border-light dark:border-border-dark pb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Design System & Engine Prompt</h1>
        <p className="text-sm text-muted-light dark:text-muted-dark font-medium max-w-2xl">
          Documentação centralizada de tokens visuais, componentes e o System Prompt mestre para manutenção de consistência via IA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Colors */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">01. Cores e Tokens</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch color="bg-primary" name="Primary Blue" hex="#135BEC" />
              <ColorSwatch color="bg-surface-dark" name="Surface Dark" hex="#111722" />
              <ColorSwatch color="bg-background-dark" name="BG Dark" hex="#0A0F18" />
              <ColorSwatch color="bg-border-dark" name="Border Dark" hex="#1E293B" />
              <ColorSwatch color="bg-success" name="Status Success" hex="#10B981" />
              <ColorSwatch color="bg-warning" name="Status Warning" hex="#F59E0B" />
              <ColorSwatch color="bg-danger" name="Status Danger" hex="#EF4444" />
              <ColorSwatch color="bg-muted-dark" name="Muted Text" hex="#94A3B8" />
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">02. Tipografia</h3>
            <Card className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest">Display - Inter</p>
                <p className="text-2xl font-bold font-display">Heading Enterprise Bold</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest">Body - Noto Sans</p>
                <p className="text-sm font-medium font-body leading-relaxed">
                  O sistema prioriza legibilidade e alta densidade de informação para analistas.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest">Mono - JetBrains Mono</p>
                <p className="text-xs font-mono text-primary font-bold tracking-tight">#ID-REG-8492-2023-SQL</p>
              </div>
            </Card>
          </section>

          {/* Components */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">03. Componentes</h3>
            <Card className="space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest border-b border-border-dark/50 pb-2">Buttons Variations</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary Action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost Icon</Button>
                  <Button variant="danger">Critical</Button>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest border-b border-border-dark/50 pb-2">Badge States</p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success" dot>Válido</Badge>
                  <Badge variant="warning" dot className="animate-pulse">Atenção</Badge>
                  <Badge variant="danger" dot>Inválido</Badge>
                  <Badge variant="info">Processando</Badge>
                  <Badge variant="outline">Desativado</Badge>
                </div>
              </div>
            </Card>
          </section>
        </div>

        {/* System Prompt Section */}
        <div className="lg:col-span-1">
          <section className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">04. Engine Prompt</h3>
              <Button 
                variant={copied ? "primary" : "outline"} 
                size="sm" 
                onClick={copyPrompt}
                className="h-8 transition-all"
              >
                <span className="material-symbols-outlined text-sm mr-2">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'COPIADO!' : 'COPIAR PROMPT'}
              </Button>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-indigo-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex flex-col h-[600px] rounded-lg border border-border-dark bg-[#0a0f18] overflow-hidden">
                <div className="bg-slate-900/80 px-4 py-2 flex items-center gap-2 border-b border-white/5">
                  <span className="material-symbols-outlined text-primary text-sm">terminal</span>
                  <span className="text-[10px] font-mono font-bold text-muted-dark tracking-widest uppercase">system_prompt_master.txt</span>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-950/50">
                  <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                    {SYSTEM_PROMPT}
                  </pre>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-dark font-medium leading-normal italic px-2">
              * Utilize este prompt ao iniciar novos contextos de chat para que a IA respeite o ecossistema visual e técnico do Extrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemView;
