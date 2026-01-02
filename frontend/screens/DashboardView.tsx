import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { dataService } from '../services/dataService';
import { AccidentRecord } from '../types';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

import { Screen } from '../types';
import { useEngine } from '../contexts/EngineContext';

interface DashboardViewProps {
  onNavigate?: (screen: Screen, params?: any) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);

  const { isRunning, metrics } = useEngine();

  // Fetch Stats (Global)
  const fetchStats = useCallback(async () => {
    try {
      const data = await dataService.getDashboardStatsRaw();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh when Engine is running
  useEffect(() => {
      let interval: any;
      if (isRunning) {
          interval = setInterval(() => {
              fetchStats();
          }, 5000);
      }
      return () => {
          if (interval) clearInterval(interval);
      }
  }, [isRunning, fetchStats]);

  const handleChartClick = (data: any, index: number) => {
    // When clicking on Bar/Cell, 'data' is usually the entry object itself
    // Recharts passes (data, index, event) to Bar onClick
    if (data && data.motivo) {
        onNavigate?.('results', { search: data.motivo });
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Dashboard Geral</h1>
      
      {/* MACRO STATS SECTION */}
      {/* MACRO STATS SECTION */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-2">
          {/* LEFT COL: MACRO STATS + PIE */}
          <div className="lg:col-span-2 flex flex-col gap-4">
             {/* TOP ROW: Total, Analyzed, Ignored */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Total */}
                 <Card className="border-l-4 border-l-blue-500">
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-sm text-slate-500 font-bold uppercase mb-2">Total Registros</span>
                      <span className="text-4xl font-black text-slate-800 dark:text-white">{stats.total_records}</span>
                    </div>
                 </Card>
                 {/* Analisados */}
                 <Card className="border-l-4 border-l-purple-500">
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-sm text-slate-500 font-bold uppercase mb-2">Analisados IA</span>
                      <span className="text-4xl font-black text-purple-600">{stats.analyzed_records}</span>
                    </div>
                 </Card>
                 {/* Ignorados */}
                 <div onClick={() => onNavigate?.('results', { status: 'Ignorado' })} className="cursor-pointer transition-transform hover:scale-105 h-full">
                     <Card className="border-l-4 border-l-slate-400 bg-slate-50/50 dark:bg-slate-800/50 h-full">
                        <div className="flex flex-col items-center justify-center h-full">
                           <span className="text-sm text-slate-500 font-bold uppercase mb-2">Ignorados</span>
                           <span className="text-4xl font-black text-slate-500">{stats.invalid_records}</span>
                           <span className="text-[10px] text-slate-400 mt-1">Estrutural/Vazio</span>
                        </div>
                     </Card>
                 </div>
             </div>
             
             {/* Breakdown Row - NOW INTERACTIVE */}
             <div className="col-span-1 md:col-span-2 grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div onClick={() => onNavigate?.('results', { status: 'Válido' })} className="cursor-pointer transition-transform hover:scale-105">
                    <Card className="border-t-4 border-t-green-500 h-full">
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                        <span className="text-xs text-slate-500 font-bold uppercase text-center">IA: Válidos</span>
                        <span className="text-2xl font-black text-green-600">{stats.analyzed_valid || 0}</span>
                        </div>
                    </Card>
                </div>
                <div onClick={() => onNavigate?.('results', { status: 'Inválido' })} className="cursor-pointer transition-transform hover:scale-105">
                    <Card className="border-t-4 border-t-red-500 h-full">
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                        <span className="text-xs text-slate-500 font-bold uppercase text-center">IA: Inválidos</span>
                        <span className="text-2xl font-black text-red-600">{stats.analyzed_invalid || 0}</span>
                        </div>
                    </Card>
                </div>
                <div onClick={() => onNavigate?.('results', { status: 'Atenção' })} className="cursor-pointer transition-transform hover:scale-105">
                    <Card className="border-t-4 border-t-yellow-500 h-full">
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                        <span className="text-xs text-slate-500 font-bold uppercase text-center">IA: Atenção</span>
                        <span className="text-2xl font-black text-yellow-600">{stats.analyzed_attention || 0}</span>
                        </div>
                    </Card>
                </div>
                <div onClick={() => onNavigate?.('results', { status: 'Validar Manualmente' })} className="cursor-pointer transition-transform hover:scale-105">
                    <Card className="border-t-4 border-t-orange-500 h-full">
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                        <span className="text-xs text-slate-500 font-bold uppercase text-center">IA: Validar</span>
                        <span className="text-2xl font-black text-orange-600">{stats.analyzed_manual || 0}</span>
                        </div>
                    </Card>
                </div>
             </div>
          </div>

          {/* RIGHT COL: EFFICIENCY CHART */}
          <Card className="" noPadding>
             <div className="flex flex-col items-center justify-center h-full p-4">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 mt-2">Eficiência da IA</span>
               <ResponsiveContainer width="100%" height={200}>
                 <PieChart>
                   <Pie
                     data={[
                       { name: 'Válidos', value: stats.analyzed_valid || 0, fill: '#16a34a' },
                       { name: 'Inválidos', value: stats.analyzed_invalid || 0, fill: '#dc2626' },
                       { name: 'Atenção', value: stats.analyzed_attention || 0, fill: '#eab308' },
                       { name: 'Manual', value: stats.analyzed_manual || 0, fill: '#f97316' }
                     ]}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     
                     dataKey="value"
                   >
                     {(stats.analyzed_valid > 0) && <Cell key="valid" fill="#16a34a" />}
                     {(stats.analyzed_invalid > 0) && <Cell key="invalid" fill="#dc2626" />}
                     {(stats.analyzed_attention > 0) && <Cell key="attention" fill="#eab308" />}
                     {(stats.analyzed_manual > 0) && <Cell key="manual" fill="#f97316" />}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
               <div className="flex gap-4 mb-2 justify-center flex-wrap">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-600"></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Válido</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-600"></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Inválido</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Atenção</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Manual</span></div>
               </div>
             </div>
          </Card>
        </div>
      )}

      {/* ACCIDENT REASONS CHART */}
      {stats?.by_reason && (
        <Card className="p-4" noPadding>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
             <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Top Motivos de Acidente</h3>
          </div>
          <div className="h-[400px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stats.by_reason.slice(0, 10)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }} 
                barCategoryGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="motivo" 
                    type="category" 
                    width={220} 
                    tick={{fontSize: 11, fill: '#64748b'}} 
                    interval={0} 
                    tickMargin={10}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]} 
                    barSize={16}
                    isAnimationActive={false} 
                >
                  {stats.by_reason.slice(0, 10).map((entry: any, index: number) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? '#3b82f6' : '#8b5cf6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DashboardView;
