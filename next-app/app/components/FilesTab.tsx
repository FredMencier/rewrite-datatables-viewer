'use client';

import React, { useState, useMemo } from 'react';
import { SourceFileResults } from '../types';
import KPICard from './KPICard';
import ChartCard from './ChartCard';
import BarChart from './BarChart';
import PieChart from './PieChart';

interface FilesTabProps {
  sourceResults: SourceFileResults[];
  isLoading?: boolean;
}

// Icônes SVG
const FileIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FilesTab: React.FC<FilesTabProps> = ({ sourceResults, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filtrer les données par terme de recherche
  const filteredData = useMemo(() => {
    if (!searchTerm) return sourceResults;
    const term = searchTerm.toLowerCase();
    return sourceResults.filter(
      (r) =>
        (r.sourcePathBefore?.toLowerCase().includes(term) ?? false) ||
        (r.sourcePathAfter?.toLowerCase().includes(term) ?? false) ||
        r.recipeChanges.toLowerCase().includes(term)
    );
  }, [sourceResults, searchTerm]);

  // Paginer les données
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Préparer les données pour le graphique par type de fichier
  const fileTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    sourceResults.forEach((r) => {
      const path = r.sourcePathBefore || r.sourcePathAfter || '';
      const ext = path.split('.').pop()?.toLowerCase() || 'unknown';
      typeMap.set(ext, (typeMap.get(ext) || 0) + 1);
    });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [sourceResults]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalFiles = sourceResults.length;
    const avgTimeSaved = totalFiles > 0 
      ? sourceResults.reduce((acc, r) => acc + r.estimatedTimeSaving, 0) / totalFiles 
      : 0;

    return {
      totalFiles,
      avgTimeSaved,
    };
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
      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          icon={<FileIcon />}
          value={stats.totalFiles.toLocaleString()}
          label="Fichiers modifies"
          subtitle="total"
        />
        <KPICard
          icon={<ClockIcon />}
          value={formatTime(stats.avgTimeSaved)}
          label="Temps moyen"
          subtitle="par fichier"
        />
      </div>

      {/* Graphique Types de fichiers modifies */}
      <ChartCard
        title="Types de fichiers modifies"
        subtitle="Repartition par extension"
      >
        {fileTypeData.length > 0 ? (
          <PieChart
            data={fileTypeData}
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
            Aucune donnee disponible
          </div>
        )}
      </ChartCard>

      {/* Tableau des fichiers */}
      <ChartCard
        title="Fichiers modifies"
        subtitle={`${filteredData.length} fichiers`}
      >
        {/* Recherche */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Rechercher un fichier..."
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
                  Fichier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type de changement
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Temps economise
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {row.sourcePathAfter || row.sourcePathBefore || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {row.recipeChanges}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {formatTime(row.estimatedTimeSaving)}
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
                Precedent
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

export default FilesTab;
