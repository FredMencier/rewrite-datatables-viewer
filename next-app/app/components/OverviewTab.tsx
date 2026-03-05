'use client';

import React, { useMemo } from 'react';
import { RecipeRunStats, SourceFileResults, ROIMetrics, RecipePerformanceMetrics } from '../types';
import KPICard from './KPICard';
import ChartCard from './ChartCard';
import LineChart from './LineChart';
import Treemap from './Treemap';
import NightingaleChart from './NightingaleChart';

interface OverviewTabProps {
  recipeStats: RecipeRunStats[];
  sourceResults: SourceFileResults[];
  roiMetrics: ROIMetrics | null;
  enrichedStats: RecipePerformanceMetrics[];
  isLoading?: boolean;
}

// Icônes SVG
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

const BeakerIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const OverviewTab: React.FC<OverviewTabProps> = ({
  recipeStats,
  sourceResults,
  roiMetrics,
  enrichedStats,
  isLoading = false,
}) => {
  // Préparer les données pour le graphique de distribution des temps
  const recipeTimeData = useMemo(() => {
    return recipeStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round((r.cumulativeScanningTime + r.cumulativeEditTime) / 1000000),
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

  // Formater le temps (secondes)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Formater le temps (millisecondes)
  const formatTimeMs = (ms: number): string => {
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
      {/* Cartes KPI principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          icon={<BeakerIcon />}
          value={recipeStats.length.toString()}
          label="Nombre de recettes"
          subtitle="total"
        />
        <KPICard
          icon={<DocumentCheckIcon />}
          value={roiMetrics ? roiMetrics.totalFilesChanged.toLocaleString() : '0'}
          label="Fichiers modifies"
          subtitle="total"
        />
        <KPICard
          icon={<ClockIcon />}
          value={roiMetrics && roiMetrics.totalFilesProcessed > 0
            ? formatTime(roiMetrics.impactPerFile)
            : '0s'}
          label="Temps moyen par fichier"
          subtitle=""
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Temps d'execution par recette"
          subtitle="Top 10 des recettes les plus longues"
        >
          {recipeTimeData.length > 0 ? (
            <NightingaleChart
              data={recipeTimeData}
              height={350}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnee disponible
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Nombre de fichiers modifies par recette"
          subtitle="Top 10 des recettes avec le plus de modifications"
        >
          {fileChangeData.length > 0 ? (
            <Treemap
              data={fileChangeData}
              height={350}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnee disponible
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tableau détaillé des performances */}
      <ChartCard
        title="Détails des performances"
        subtitle={`${enrichedStats.length} recettes`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recette
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Scan (ms)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Temps (ms)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fichiers
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Modifiés
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {enrichedStats.slice(0, 20).map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {row.recipe}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    {formatTimeMs(row.cumulativeScanningTime / 1000000)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    {formatTimeMs(row.totalExecutionTimeMs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    {row.sourceFileCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    {row.sourceFileChangedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {enrichedStats.length > 20 && (
          <div className="mt-4 flex justify-center">
            <span className="text-sm text-gray-500">
              Affichage des 20 premières recettes sur {enrichedStats.length}
            </span>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default OverviewTab;
