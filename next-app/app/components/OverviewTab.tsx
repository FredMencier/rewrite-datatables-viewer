'use client';

import React, { useMemo } from 'react';
import { RecipeRunStats, SourceFileResults, ROIMetrics } from '../types';
import KPICard from './KPICard';
import ChartCard from './ChartCard';
import PieChart from './PieChart';
import BarChart from './BarChart';
import TimeSeriesChart from './TimeSeriesChart';

interface OverviewTabProps {
  recipeStats: RecipeRunStats[];
  sourceResults: SourceFileResults[];
  roiMetrics: ROIMetrics | null;
  isLoading?: boolean;
}

// Icônes SVG
const ChartPieIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DocumentCheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const OverviewTab: React.FC<OverviewTabProps> = ({
  recipeStats,
  sourceResults,
  roiMetrics,
  isLoading = false,
}) => {
  // Préparer les données pour le graphique de distribution des temps
  const recipeTimeData = useMemo(() => {
    return recipeStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round((r.cumulativeScanningTime + r.cumulativeEditTime) / 1000000), // Convertir en ms
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [recipeStats]);

  // Préparer les données pour le graphique de modification de fichiers
  const fileChangeData = useMemo(() => {
    return recipeStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: r.sourceFileChangedCount,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [recipeStats]);

  // Préparer les données pour la série temporelle
  const timeSeriesData = useMemo(() => {
    const cycleData = sourceResults.reduce((acc, r) => {
      const existing = acc.get(r.cycle);
      if (existing) {
        existing.filesChanged += 1;
        existing.timeSaved += r.estimatedTimeSaving;
      } else {
        acc.set(r.cycle, { filesChanged: 1, timeSaved: r.estimatedTimeSaving });
      }
      return acc;
    }, new Map<number, { filesChanged: number; timeSaved: number }>());

    return [{
      name: 'Fichiers modifiés',
      data: Array.from(cycleData.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([cycle, data]) => ({
          date: `Cycle ${cycle}`,
          value: data.filesChanged,
        })),
    }];
  }, [sourceResults]);

  // Formater le temps
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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
      {/* Cartes KPI principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<ClockIcon />}
          value={roiMetrics ? formatTime(roiMetrics.totalTimeSaved) : '0s'}
          label="Temps économisé"
          subtitle="total"
        />
        <KPICard
          icon={<DocumentCheckIcon />}
          value={roiMetrics ? roiMetrics.totalFilesChanged.toLocaleString() : '0'}
          label="Fichiers modifiés"
          subtitle="total"
        />
        <KPICard
          icon={<ChartPieIcon />}
          value={roiMetrics ? `${roiMetrics.efficiency.toFixed(1)}%` : '0%'}
          label="Efficacité"
          subtitle="globale"
        />
        <KPICard
          icon={<TrendUpIcon />}
          value={roiMetrics ? `${roiMetrics.roi.toFixed(0)}%` : '0%'}
          label="ROI"
          subtitle="retour sur investissement"
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Temps d'exécution par recette"
          subtitle="Top 10 des recettes les plus longues"
        >
          {recipeTimeData.length > 0 ? (
            <BarChart
              data={recipeTimeData}
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
          title="Fichiers modifiés par recette"
          subtitle="Top 10 des recettes avec le plus de modifications"
        >
          {fileChangeData.length > 0 ? (
            <BarChart
              data={fileChangeData}
              height={350}
              yAxisLabel="Fichiers"
              horizontal
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>
      </div>

      {/* Graphique de série temporelle */}
      <ChartCard
        title="Évolution des modifications"
        subtitle="Fichiers modifiés par cycle"
      >
        {timeSeriesData[0].data.length > 0 ? (
          <TimeSeriesChart
            series={timeSeriesData}
            height={300}
            showArea
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            Aucune donnée disponible
          </div>
        )}
      </ChartCard>

      {/* Statistiques supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Nombre de recettes
          </h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {recipeStats.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Temps moyen par fichier
          </h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {roiMetrics && roiMetrics.totalFilesProcessed > 0
              ? formatTime(roiMetrics.impactPerFile)
              : '0s'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Ratio temps économie/exécution
          </h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {roiMetrics && roiMetrics.totalExecutionTime > 0
              ? `${(roiMetrics.totalTimeSaved / roiMetrics.totalExecutionTime).toFixed(1)}x`
              : '0x'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
