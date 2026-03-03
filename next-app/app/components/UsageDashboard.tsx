'use client';

import React, { useState, useMemo } from 'react';
import { UsageReportEntry } from '../types';
import KPICard from './KPICard';
import ChartCard from './ChartCard';
import PieChart from './PieChart';

// Icônes SVG pour les KPIs
const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const LightningIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

interface UsageDashboardProps {
  data: UsageReportEntry[];
  isLoading?: boolean;
}

const UsageDashboard: React.FC<UsageDashboardProps> = ({ data, isLoading = false }) => {
  const [selectedRepo, setSelectedRepo] = useState<string>('all');

  // Obtenir la liste des repositories uniques
  const repositories = useMemo(() => {
    const repos = new Set(data.map(d => d.repositoryPath));
    return Array.from(repos).sort();
  }, [data]);

  // Filtrer les données par repository
  const filteredData = useMemo(() => {
    if (selectedRepo === 'all') return data;
    return data.filter(d => d.repositoryPath === selectedRepo);
  }, [data, selectedRepo]);

  // Calculer les KPIs
  const kpis = useMemo(() => {
    const totalTimeSaved = filteredData.reduce((acc, d) => acc + d.timeSavingsInMinutes, 0);
    const totalRepos = new Set(filteredData.map(d => d.repositoryPath)).size;
    const totalFilesChanged = filteredData.reduce((acc, d) => acc + d.totalFilesChanges, 0);
    const totalRuntime = filteredData.reduce((acc, d) => acc + d.recipeRunInMilliseconds, 0);

    return {
      timeSaved: totalTimeSaved,
      repositories: totalRepos,
      filesChanged: totalFilesChanged,
      runtime: totalRuntime / 1000 / 60, // Convertir en minutes
    };
  }, [filteredData]);

  // Préparer les données pour le graphique camembert (fichiers modifiés par repository)
  const filesByRepoData = useMemo(() => {
    const repoFilesMap = new Map<string, number>();
    
    filteredData.forEach(d => {
      const current = repoFilesMap.get(d.repositoryPath) || 0;
      repoFilesMap.set(d.repositoryPath, current + d.totalFilesChanges);
    });

    return Array.from(repoFilesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Limiter à 10 pour la lisibilité
  }, [filteredData]);

  // Préparer les données pour le graphique camembert (temps économisé par repository)
  const pieChartData = useMemo(() => {
    const repoTimeMap = new Map<string, number>();
    
    filteredData.forEach(d => {
      const current = repoTimeMap.get(d.repositoryPath) || 0;
      repoTimeMap.set(d.repositoryPath, current + d.timeSavingsInMinutes);
    });

    return Array.from(repoTimeMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Limiter à 10 pour la lisibilité
  }, [filteredData]);

  // Préparer les données pour le tableau
  const tableData = useMemo(() => {
    return filteredData.slice(0, 100); // Limiter à 100 entrées
  }, [filteredData]);

  // Formater le temps
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  // Formater la date
  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
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
      {/* Filtre par repository */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <label htmlFor="repo-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrer par repository:
          </label>
          <select
            id="repo-select"
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="mt-1 block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Tous les repositories ({repositories.length})</option>
            {repositories.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<ClockIcon />}
          value={formatTime(kpis.timeSaved)}
          label="Temps économisé"
          subtitle="total"
        />
        <KPICard
          icon={<FolderIcon />}
          value={kpis.repositories}
          label="Repositories"
          subtitle="actifs"
        />
        <KPICard
          icon={<FileIcon />}
          value={kpis.filesChanged.toLocaleString()}
          label="Fichiers modifiés"
          subtitle="total"
        />
        <KPICard
          icon={<LightningIcon />}
          value={formatTime(kpis.runtime)}
          label="Temps d'exécution"
          subtitle="total"
        />
      </div>

      {/* Graphique camembert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Temps économisé par repository"
          subtitle="Répartition du temps économisé (top 10)"
        >
          {pieChartData.length > 0 ? (
            <PieChart
              data={pieChartData}
              height={350}
              radius={['30%', '70%']}
              legendPosition="bottom"
              labelShow={true}
              labelFormatter="{b}: {c} min"
              borderRadius={4}
              borderColor="#1e293b"
              borderWidth={2}
              colors={[
                '#3b82f6',
                '#10b981',
                '#f59e0b',
                '#ef4444',
                '#8b5cf6',
                '#ec4899',
                '#06b6d4',
                '#84cc16',
                '#f97316',
                '#6366f1',
              ]}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Fichiers modifiés par repository"
          subtitle="Répartition des fichiers modifiés (top 10)"
        >
          {filesByRepoData.length > 0 ? (
            <PieChart
              data={filesByRepoData}
              height={350}
              radius={['30%', '70%']}
              legendPosition="bottom"
              labelShow={true}
              labelFormatter="{b}: {c} fichiers"
              borderRadius={4}
              borderColor="#1e293b"
              borderWidth={2}
              colors={[
                '#3b82f6',
                '#10b981',
                '#f59e0b',
                '#ef4444',
                '#8b5cf6',
                '#ec4899',
                '#06b6d4',
                '#84cc16',
                '#f97316',
                '#6366f1',
              ]}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tableau des données */}
      <ChartCard
        title="Historique des exécutions"
        subtitle={`${filteredData.length} exécutions`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipe Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Branche
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fichiers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Temps économisé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Runtime
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tableData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(row.recipeRunCreatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {row.recipeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {row.repositoryPath}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {row.repositoryBranch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {row.totalFilesChanges}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatTime(row.timeSavingsInMinutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(row.recipeRunInMilliseconds / 1000)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination simple */}
        {filteredData.length > 100 && (
          <div className="mt-4 flex justify-center">
            <span className="text-sm text-gray-500">
              Affichage des 100 premières entrées sur {filteredData.length}
            </span>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default UsageDashboard;
