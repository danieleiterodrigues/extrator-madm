
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

interface ResultsViewProps {
    initialSearch?: string;
    initialStatus?: string;
}

const ResultsView: React.FC<ResultsViewProps> = ({ initialSearch, initialStatus }) => {
  const [stats, setStats] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
      search: initialSearch || '', 
      status: initialStatus || 'Todos' 
  });
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch || '');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Handle Initial Params Change (Search & Status)
  useEffect(() => {
    if (initialSearch !== undefined) {
        setFilters(prev => ({ ...prev, search: initialSearch }));
        setDebouncedSearch(initialSearch);
    }
    if (initialStatus) {
        setFilters(prev => ({ ...prev, status: initialStatus }));
    }
  }, [initialSearch, initialStatus]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, filters.status, pagination.page, pagination.pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsData = await dataService.getAnalysisStats();
       setStats(statsData);

      const resultsData = await dataService.getAnalysisResults(pagination.page, pagination.pageSize, { 
            search: debouncedSearch,
            status: filters.status === 'Todos' ? undefined : filters.status 
      });
      
      setResults(resultsData.items);
      setPagination(prev => ({ ...prev, total: resultsData.total }));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonExport = async () => {
    try {
        const exportData = await dataService.getAllAnalysisResults({
             search: debouncedSearch,
             status: filters.status === 'Todos' ? undefined : filters.status 
        });

        if (exportData.length === 0) {
            alert("Nenhum dado para exportar com os filtros atuais.");
            return;
        }

        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `analise_export_full_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("JSON Export failed", e);
        alert("Falha na exportação JSON");
    }
  };

  const handleExport = async () => {
    // Show some indication? For now just async wait.
    // Ideally we should have an exportLoading state, but let's reuse loading or just blocking?
    // Let's just fetch.
    try {
        const exportData = await dataService.getAllAnalysisResults({
             search: debouncedSearch,
             status: filters.status === 'Todos' ? undefined : filters.status 
        });

        if (exportData.length === 0) return;

        // Simple CSV Export
        const headers = ["ID", "Nome", "Documento", "Nascimento", "Telefone", "Relato Original", "Data Análise", "Tipo", "Status", "Justificativa"];
        const csvContent = [
        headers.join(","),
        ...exportData.map((r: any) => [
            r.id, 
            `"${r.nome || ''}"`,
            `"${r.documento || ''}"`,
            `"${r.data_nascimento || ''}"`,
            `"${r.telefone || ''}"`,
            `"${r.motivo_acidente ? r.motivo_acidente.replace(/"/g, '""') : ''}"`,
            r.time, 
            `"${r.type}"`, 
            r.status, 
            `"${r.justification ? r.justification.replace(/"/g, '""') : ''}"`
        ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `analise_export_full_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Export failed", e);
    }
  };

  const handleManualValidation = async (item: any) => {
      try {
          if (!confirm(`Deseja alterar o status do item #${item.id} para VALIDAR MANUALMENTE?`)) return;
          
          await dataService.saveAnalysisBatch([{
              id: item.id,
              validity: 'Validar Manualmente', 
              justificativa: item.justification,
              score: item.score
          }]);
          fetchData(); // Refresh list
      } catch (e) {
          console.error("Error updating status:", e);
          alert("Erro ao atualizar status");
      }
  };
  
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading && results.length === 0 && stats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 relative">
      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10">
            <div className="p-6 border-b border-border-light dark:border-border-dark flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detalhes da Análise</h3>
                  <p className="text-sm text-muted-light dark:text-muted-dark font-mono mt-1">ID: {selectedItem.id} • {selectedItem.time}</p>
               </div>
               <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lead Data Section */}
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border-light dark:border-border-dark col-span-2 md:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-muted-light dark:text-muted-dark tracking-widest block mb-3 border-b border-border-light dark:border-border-dark pb-1">Dados do Lead</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase block">Nome</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white block truncate" title={selectedItem.nome}>{selectedItem.nome}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase block">Documento</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white font-mono">{selectedItem.documento}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase block">Nascimento</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedItem.data_nascimento}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase block">Telefone</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedItem.telefone}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] text-slate-500 uppercase block">Relato Original</span>
                                <span className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2" title={selectedItem.motivo_acidente}>{selectedItem.motivo_acidente}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border-light dark:border-border-dark col-span-2">
                         <span className="text-[10px] uppercase font-bold text-muted-light dark:text-muted-dark tracking-widest block mb-2">Classificação IA</span>
                         <Badge variant="info" className="text-lg px-3 py-1">{selectedItem.type}</Badge>
                    </div>
                </div>
                
                <div className="space-y-2">
                   <span className="text-[10px] uppercase font-bold text-muted-light dark:text-muted-dark tracking-widest">Justificativa Semântica</span>
                   <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border-light dark:border-border-dark text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                       {selectedItem.justification}
                   </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border-light dark:border-border-dark">
                    <Button variant="outline" onClick={() => setSelectedItem(null)}>Fechar</Button>
                    {selectedItem.status === 'Ignorado' ? (
                       <Button variant="primary" onClick={async () => {
                           try {
                               await dataService.reprocessRecord(selectedItem.id);
                               setSelectedItem(null);
                               fetchData();
                           } catch (e) {
                               alert("Erro ao reprocessar");
                           }
                       }}>
                            <span className="material-symbols-outlined mr-2">sync</span>
                            Enviar para Análise
                       </Button>
                    ) : (selectedItem.status !== 'Válido' && selectedItem.status !== 'Validar Manualmente' && (
                        <Button variant="primary" onClick={async () => {
                            try {
                                if (!selectedItem) return;
                                await dataService.saveAnalysisBatch([{
                                    id: selectedItem.id,
                                    validity: 'Validar Manualmente', 
                                    justificativa: selectedItem.justification,
                                    score: selectedItem.score
                                }]);
                                setSelectedItem(null);
                                fetchData(); // Refresh list
                            } catch (e) {
                                console.error("Error updating status:", e);
                                alert("Erro ao atualizar status");
                            }
                        }}>
                             <span className="material-symbols-outlined mr-2">edit_note</span>
                             Trocar status para VALIDAR MANUALMENTE
                        </Button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Resultados da Análise</h2>
            <Badge variant="success">Análise Concluída</Badge>
          </div>
          <p className="text-sm text-muted-light dark:text-muted-dark font-medium">Lote #2023-10-24-A • Processamento local via Motor</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" onClick={handleJsonExport}>
            <span className="material-symbols-outlined text-[20px] mr-2">data_object</span>
            JSON
          </Button>
          <Button variant="primary" size="md" className="shadow-lg shadow-primary/20" onClick={handleExport}>
            <span className="material-symbols-outlined text-[20px] mr-2">ios_share</span>
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="group hover:border-primary/50 transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-muted-light dark:text-muted-dark uppercase tracking-widest">{stat.label}</span>
              <span className={`material-symbols-outlined text-${stat.color}`}>{stat.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{stat.value}</span>
              {stat.sub && (
                <Badge variant={stat.color as any} className="px-1.5 py-0">
                  {stat.sub}
                </Badge>
              )}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
              <div className={`bg-${stat.color} h-full`} style={{ width: stat.sub || '100%' }}></div>
            </div>
          </Card>
        ))}
      </div>

      <Card noPadding className="overflow-hidden flex flex-col shadow-ui-lg">
        <div className="p-4 border-b border-border-light dark:border-border-dark flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                <input 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
                placeholder="Buscar por nome, ID ou justificativa..." 
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
            </div>
            <select 
                className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
                <option value="Todos">Todos os Status</option>
                <option value="Válido">✅ Válidos</option>
                <option value="Inválido">❌ Inválidos</option>
                <option value="Atenção">⚠️ Atenção</option>
                <option value="Validar Manualmente">📝 Validar Manualmente</option>
                <option value="Ignorado">🚫 Ignorados (Estrutural)</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-light dark:text-muted-dark font-bold uppercase">Itens por pág:</span>
                <select 
                    className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary/50"
                    value={pagination.pageSize}
                    onChange={(e) => setPagination(prev => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
                >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                </select>
             </div>
             <div className="text-[10px] text-muted-light dark:text-muted-dark font-bold uppercase tracking-tighter">
                <span className="text-slate-900 dark:text-white">{pagination.total}</span> registros
             </div>
          </div>
        </div>
        
        <div className="overflow-auto min-h-[400px]">
          {loading ? (
             <div className="flex h-40 items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
             </div>
          ) : results.length === 0 ? (
             <div className="flex flex-col h-40 items-center justify-center text-muted-light">
                <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                <p>Nenhum resultado encontrado para os filtros.</p>
             </div>
          ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] text-muted-light dark:text-muted-dark uppercase bg-slate-50 dark:bg-slate-900/50 font-bold border-b border-border-light dark:border-border-dark sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-6 py-4 tracking-widest">ID / Timestamp</th>
                <th className="px-6 py-4 tracking-widest">Classificação IA</th>
                <th className="px-6 py-4 tracking-widest">Justificativa Semântica</th>

                <th className="px-6 py-4 tracking-widest text-center">Status Final</th>
                <th className="px-6 py-4 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {results.map((item, i) => (
                <tr key={i} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${item.highlight ? `border-l-4 border-l-${item.highlight}` : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">{item.id}</span>
                      <span className="text-[10px] text-muted-light dark:text-muted-dark font-medium">{item.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info">{item.type || 'N/A'}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs font-medium leading-relaxed">
                      {item.justification || 'Sem análise disponível'}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <Badge 
                      variant={
                          item.status === 'Válido' ? 'success' : 
                          item.status === 'Atenção' ? 'warning' : 
                          item.status === 'Validar Manualmente' ? 'warning' :
                          filters.status === 'Ignorado' ? 'neutral' : // Gray for Ignored
                          'danger'
                      } 
                      dot
                      className={item.status === 'Atenção' ? 'animate-pulse' : ''}
                    >
                      {item.status || 'Pendente'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 items-center">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedItem(item)}>
                          <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-primary">visibility</span>
                        </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
           <div className="text-xs text-muted-light dark:text-muted-dark">
               Página <span className="font-bold text-slate-900 dark:text-white">{pagination.page}</span> de <span className="font-bold text-slate-900 dark:text-white">{totalPages || 1}</span>
           </div>
           <div className="flex gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={pagination.page === 1 || loading}
                 onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
               >
                   Anterior
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={pagination.page >= totalPages || loading}
                 onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
               >
                   Próximo
               </Button>
           </div>
        </div>
      </Card>


    </div>
  );
};

export default ResultsView;
