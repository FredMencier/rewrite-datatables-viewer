'use client';

import React, { useState, useMemo } from 'react';
import { RecipeRunStats, RecipeHierarchy } from '../types';
import KPICard from './KPICard';
import ChartCard from './ChartCard';
import BarChart from './BarChart';
import PieChart from './PieChart';

interface RecipesTabProps {
  recipeStats: RecipeRunStats[];
  hierarchy?: RecipeHierarchy[];
  isLoading?: boolean;
}

// Icônes SVG
const BeakerIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
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

const ChartBarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const RecipesTab: React.FC<RecipesTabProps> = ({
  recipeStats,
  hierarchy,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filtrer les données par terme de recherche
  const filteredData = useMemo(() => {
    if (!searchTerm) return recipeStats;
    const term = searchTerm.toLowerCase();
    return recipeStats.filter(
      (r) => r.recipe.toLowerCase().includes(term)
    );
  }, [recipeStats, searchTerm]);

  // Paginer les données
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Préparer les données pour le graphique de temps de scan
  const scanTimeData = useMemo(() => {
    return recipeStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round(r.cumulativeScanningTime / 1000000), // Convertir en ms
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [recipeStats]);

  // Préparer les données pour le graphique de temps d'édition
  const editTimeData = useMemo(() => {
    return recipeStats
      .map((r) => ({
        name: r.recipe.split('.').pop() || r.recipe,
        value: Math.round(r.cumulativeEditTime / 1000000), // Convertir en ms
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [recipeStats]);

  // Préparer les données pour le graphique de distribution des fichiers
  const fileDistributionData = useMemo(() => {
    const buckets = [
      { name: '0-10', min: 0, max: 10, count: 0 },
      { name: '10-50', min: 10, max: 50, count: 0 },
      { name: '50-100', min: 50, max: 100, count: 0 },
      { name: '100-500', min: 100, max: 500, count: 0 },
      { name: '> 500', min: 500, max: Infinity, count: 0 },
    ];

    recipeStats.forEach((r) => {
      const count = r.sourceFileCount;
      for (const bucket of buckets) {
        if (count >= bucket.min && count < bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    return buckets.filter((b) => b.count > 0);
  }, [recipeStats]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalRecipes = recipeStats.length;
    const totalScanTime = recipeStats.reduce(
      (acc, r) => acc + r.cumulativeScanningTime,
      0
    );
    const totalEditTime = recipeStats.reduce(
      (acc, r) => acc + r.cumulativeEditTime,
      0
    );
    const totalFiles = recipeStats.reduce(
      (acc, r) => acc + r.sourceFileCount,
      0
    );
    const totalChanged = recipeStats.reduce(
      (acc, r) => acc + r.sourceFileChangedCount,
      0
    );

    return {
      totalRecipes,
      totalScanTime: totalScanTime / 1000000,
      totalEditTime: totalEditTime / 1000000,
      totalFiles,
      totalChanged,
      avgFilesPerRecipe: totalRecipes > 0 ? totalFiles / totalRecipes : 0,
    };
  }, [recipeStats]);

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
      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<BeakerIcon />}
          value={stats.totalRecipes}
          label="Recettes"
          subtitle="totales"
        />
        <KPICard
          icon={<ClockIcon />}
          value={formatTime(stats.totalScanTime + stats.totalEditTime)}
          label="Temps total"
          subtitle="d'exécution"
        />
        <KPICard
          icon={<DocumentCheckIcon />}
          value={stats.totalChanged.toLocaleString()}
          label="Fichiers modifiés"
          subtitle="total"
        />
        <KPICard
          icon={<ChartBarIcon />}
          value={Math.round(stats.avgFilesPerRecipe)}
          label="Moyenne fichiers"
          subtitle="par recette"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Temps de scan par recette"
          subtitle="Top 10 des recettes avec le plus de temps de scan"
        >
          {scanTimeData.length > 0 ? (
            <BarChart
              data={scanTimeData}
              height={300}
              yAxisLabel="Temps (ms)"
              horizontal
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Temps d'édition par recette"
          subtitle="Top 10 des recettes avec le plus de temps d'édition"
        >
          {editTimeData.length > 0 ? (
            <BarChart
              data={editTimeData}
              height={300}
              yAxisLabel="Temps (ms)"
              horizontal
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Distribution des fichiers traités"
          subtitle="Par catégorie de fichiers"
        >
          {fileDistributionData.length > 0 ? (
            <PieChart
              data={fileDistributionData.map((d) => ({ name: d.name, value: d.count }))}
              height={300}
              radius={['30%', '70%']}
              legendPosition="bottom"
              labelShow={true}
              labelFormatter="{b}: {c}"
              borderRadius={4}
              borderColor="#1e293b"
              borderWidth={2}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Statistiques des recettes"
          subtitle="Informations supplémentaires"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Temps total de scan</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatTime(stats.totalScanTime)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Temps total d&apos;édition</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatTime(stats.totalEditTime)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Ratio scan/édit</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.totalEditTime > 0
                  ? (stats.totalScanTime / stats.totalEditTime).toFixed(2)
                  : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Taux de modification</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.totalFiles > 0
                  ? ((stats.totalChanged / stats.totalFiles) * 100).toFixed(1)
                  : '0'}%
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Tableau des recettes */}
      <ChartCard
        title="Détails des recettes"
        subtitle={`${filteredData.length} recettes`}
      >
        {/* Recherche */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recette
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fichiers
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Modifiés
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Scan (ms)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Édition (ms)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  P99 Scan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {row.recipe}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {row.sourceFileCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {row.sourceFileChangedCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {formatTime(row.cumulativeScanningTime / 1000000)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {formatTime(row.cumulativeEditTime / 1000000)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                    {formatTime(row.percentile99ScanningTime / 1000000)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default RecipesTab;
