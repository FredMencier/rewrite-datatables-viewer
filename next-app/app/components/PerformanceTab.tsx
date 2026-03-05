'use client';

import React, { useMemo } from 'react';
import { RecipePerformanceMetrics } from '../types';
import KPICard from './KPICard';
import ChartCard from './ChartCard';
import BarChart from './BarChart';
import TimeSeriesChart from './TimeSeriesChart';

interface PerformanceTabProps {
  enrichedStats: RecipePerformanceMetrics[];
  isLoading?: boolean;
}

// Icônes SVG
const SpeedIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const PercentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
);

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  enrichedStats,
  isLoading = false,
}) => {
  // Préparer les données pour le graphique de temps d'exécution
  const executionTimeData = useMemo(() => {
    return enrichedStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round(r.totalExecutionTimeMs),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [enrichedStats]);

  // Préparer les données pour le graphique de ratio scan/edit
  const scanEditRatioData = useMemo(() => {
    return enrichedStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round(r.scanEditRatio * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [enrichedStats]);

  // Préparer les données pour le graphique d'efficacité
  const efficiencyData = useMemo(() => {
    return enrichedStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round(r.changeEfficiency * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [enrichedStats]);

  // Préparer les données pour la série temporelle (ROI par recette)
  const roiTimeSeriesData = useMemo(() => {
    // Grouper par recette et calculer le ROI moyen
    const roiByRecipe = enrichedStats.reduce((acc, r) => {
      const name = r.recipe.split('.').pop() || r.recipe;
      if (!acc[name]) {
        acc[name] = { totalROI: 0, count: 0 };
      }
      acc[name].totalROI += r.recipeROI;
      acc[name].count += 1;
      return acc;
    }, {} as Record<string, { totalROI: number; count: number }>);

    const sortedRecipes = Object.entries(roiByRecipe)
      .map(([name, data]) => ({
        name,
        value: data.totalROI / data.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return [{
      name: 'ROI',
      data: sortedRecipes.map((r, i) => ({
        date: `Recipe ${i + 1}`,
        value: r.value,
      })),
    }];
  }, [enrichedStats]);

  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    if (enrichedStats.length === 0) {
      return {
        avgExecutionTime: 0,
        avgEfficiency: 0,
        avgROI: 0,
        totalTimeSaved: 0,
      };
    }

    const totalTime = enrichedStats.reduce((acc, r) => acc + r.totalExecutionTimeMs, 0);
    const totalEfficiency = enrichedStats.reduce((acc, r) => acc + r.changeEfficiency, 0);
    const totalROI = enrichedStats.reduce((acc, r) => acc + r.recipeROI, 0);
    const totalSaved = enrichedStats.reduce((acc, r) => acc + r.totalTimeSaved, 0);

    return {
      avgExecutionTime: totalTime / enrichedStats.length,
      avgEfficiency: (totalEfficiency / enrichedStats.length) * 100,
      avgROI: totalROI / enrichedStats.length,
      totalTimeSaved: totalSaved,
    };
  }, [enrichedStats]);

  // Formater le temps
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes KPI de performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<ClockIcon />}
          value={formatTime(globalStats.avgExecutionTime)}
          label="Temps moyen"
          subtitle="par recette"
        />
        <KPICard
          icon={<PercentIcon />}
          value={`${globalStats.avgEfficiency.toFixed(1)}%`}
          label="Efficacité moyenne"
          subtitle="de modification"
        />
        <KPICard
          icon={<ChartBarIcon />}
          value={`${globalStats.avgROI.toFixed(0)}%`}
          label="ROI moyen"
          subtitle="par recette"
        />
        <KPICard
          icon={<SpeedIcon />}
          value={formatTime(globalStats.totalTimeSaved * 1000)}
          label="Temps total économisé"
          subtitle="pour les recettes"
        />
      </div>

      {/* Graphiques de performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Temps d'exécution par recette"
          subtitle="Top 10 des recettes les plus lentes"
        >
          {executionTimeData.length > 0 ? (
            <BarChart
              data={executionTimeData}
              height={350}
              yAxisLabel="Temps (ms)"
              horizontal
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Ratio Scan/Edit"
          subtitle="Temps de scan vs temps d'édition"
        >
          {scanEditRatioData.length > 0 ? (
            <BarChart
              data={scanEditRatioData}
              height={350}
              yAxisLabel="Ratio"
              horizontal
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Efficacité de modification"
          subtitle="Fichiers modifiés / fichiers traités"
        >
          {efficiencyData.length > 0 ? (
            <BarChart
              data={efficiencyData}
              height={350}
              yAxisLabel="Efficacité (%)"
              horizontal
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="ROI par recette"
          subtitle="Retour sur investissement"
        >
          {roiTimeSeriesData[0].data.length > 0 ? (
            <TimeSeriesChart
              series={roiTimeSeriesData}
              height={350}
              showArea={false}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default PerformanceTab;
