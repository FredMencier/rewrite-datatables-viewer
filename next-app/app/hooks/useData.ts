'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  RecipeRunStats, 
  SourceFileResults, 
  UsageReportEntry,
  ROIMetrics,
  RecipePerformanceMetrics,
  ChangeTypeAggregation,
  RecipeHierarchy 
} from '../types';
import { dataLoader, DataLoader } from '../lib/DataLoader';
import { dataProcessor, DataProcessor } from '../lib/DataProcessor';

/**
 * État de chargement des données
 */
export interface UseDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook pour charger et traiter les données OpenRewrite
 */
export function useData() {
  const [recipeStats, setRecipeStats] = useState<UseDataState<RecipeRunStats[]>>({
    data: null,
    isLoading: true,
    error: null
  });
  
  const [sourceResults, setSourceResults] = useState<UseDataState<SourceFileResults[]>>({
    data: null,
    isLoading: true,
    error: null
  });
  
  const [usageReport, setUsageReport] = useState<UseDataState<UsageReportEntry[]>>({
    data: null,
    isLoading: true,
    error: null
  });

  const loadData = useCallback(async () => {
    // Clear cache and reset loading states
    dataLoader.clearCache();
    setRecipeStats(prev => ({ ...prev, isLoading: true, error: null }));
    setSourceResults(prev => ({ ...prev, isLoading: true, error: null }));
    setUsageReport(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load all data in parallel
      const [stats, results, report] = await Promise.all([
        dataLoader.loadRecipeRunStats(),
        dataLoader.loadSourceFileResults(),
        dataLoader.loadAllUsageReports()
      ]);

      setRecipeStats({ data: stats, isLoading: false, error: null });
      setSourceResults({ data: results, isLoading: false, error: null });
      setUsageReport({ data: report, isLoading: false, error: null });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setRecipeStats(prev => ({ ...prev, isLoading: false, error: errorObj }));
      setSourceResults(prev => ({ ...prev, isLoading: false, error: errorObj }));
      setUsageReport(prev => ({ ...prev, isLoading: false, error: errorObj }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isLoading = recipeStats.isLoading || sourceResults.isLoading || usageReport.isLoading;
  const error = recipeStats.error || sourceResults.error || usageReport.error;

  return {
    recipeStats: recipeStats.data,
    sourceResults: sourceResults.data,
    usageReport: usageReport.data,
    isLoading,
    error,
    reload: loadData
  };
}

/**
 * Hook pour calculer les métriques ROI
 */
export function useROIMetrics(
  recipeStats: RecipeRunStats[] | null, 
  sourceResults: SourceFileResults[] | null
): UseDataState<ROIMetrics> {
  const [state, setState] = useState<UseDataState<ROIMetrics>>({
    data: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!recipeStats || !sourceResults) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    try {
      const metrics = dataProcessor.calculateROIMetrics(recipeStats, sourceResults);
      setState({ data: metrics, isLoading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
    }
  }, [recipeStats, sourceResults]);

  return state;
}

/**
 * Hook pour enrichir les statistiques des recettes
 */
export function useEnrichedRecipeStats(
  recipeStats: RecipeRunStats[] | null, 
  sourceResults: SourceFileResults[] | null
): UseDataState<RecipePerformanceMetrics[]> {
  const [state, setState] = useState<UseDataState<RecipePerformanceMetrics[]>>({
    data: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!recipeStats || !sourceResults) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    try {
      const enriched = dataProcessor.enrichRecipeStats(recipeStats, sourceResults);
      setState({ data: enriched, isLoading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
    }
  }, [recipeStats, sourceResults]);

  return state;
}

/**
 * Hook pour agréger les données par type de changement
 */
export function useChangeTypeAggregation(
  recipeStats: RecipeRunStats[] | null, 
  sourceResults: SourceFileResults[] | null
): UseDataState<ChangeTypeAggregation[]> {
  const [state, setState] = useState<UseDataState<ChangeTypeAggregation[]>>({
    data: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!recipeStats || !sourceResults) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    try {
      const aggregation = dataProcessor.aggregateByChangeType(recipeStats, sourceResults);
      setState({ data: aggregation, isLoading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
    }
  }, [recipeStats, sourceResults]);

  return state;
}

/**
 * Hook pour construire la hiérarchie des recettes
 */
export function useRecipeHierarchy(
  recipeStats: RecipeRunStats[] | null, 
  sourceResults: SourceFileResults[] | null
): UseDataState<RecipeHierarchy[]> {
  const [state, setState] = useState<UseDataState<RecipeHierarchy[]>>({
    data: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!recipeStats || !sourceResults) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    try {
      const hierarchy = dataProcessor.buildRecipeHierarchy(recipeStats, sourceResults);
      setState({ data: hierarchy, isLoading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
    }
  }, [recipeStats, sourceResults]);

  return state;
}

/**
 * Hook pour les données de série temporelle
 */
export function useTimeSeries(
  sourceResults: SourceFileResults[] | null
): UseDataState<Array<{
  cycle: number;
  cumulativeTimeSaved: number;
  filesChanged: number;
  recipes: string[];
}>> {
  const [state, setState] = useState<UseDataState<Array<{
  cycle: number;
  cumulativeTimeSaved: number;
  filesChanged: number;
  recipes: string[];
}>>>({
  data: null,
  isLoading: true,
  error: null
  });

  useEffect(() => {
    if (!sourceResults) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    try {
      const timeSeries = dataProcessor.calculateTimeSeries(sourceResults);
      setState({ data: timeSeries, isLoading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
    }
  }, [sourceResults]);

  return state;
}

/**
 * Hook combiné qui retourne toutes les données et métriques calculées
 */
export function useAllData() {
  const { recipeStats, sourceResults, usageReport, isLoading, error, reload } = useData();
  
  const roiMetrics = useROIMetrics(recipeStats, sourceResults);
  const enrichedStats = useEnrichedRecipeStats(recipeStats, sourceResults);
  const changeAggregation = useChangeTypeAggregation(recipeStats, sourceResults);
  const hierarchy = useRecipeHierarchy(recipeStats, sourceResults);
  const timeSeries = useTimeSeries(sourceResults);

  const isCalculating = 
    roiMetrics.isLoading || 
    enrichedStats.isLoading || 
    changeAggregation.isLoading || 
    hierarchy.isLoading || 
    timeSeries.isLoading;

  const calculationError = 
    roiMetrics.error || 
    enrichedStats.error || 
    changeAggregation.error || 
    hierarchy.error || 
    timeSeries.error;

  return {
    // Raw data
    recipeStats,
    sourceResults,
    usageReport,
    
    // Computed metrics
    roiMetrics: roiMetrics.data,
    enrichedStats: enrichedStats.data,
    changeAggregation: changeAggregation.data,
    hierarchy: hierarchy.data,
    timeSeries: timeSeries.data,
    
    // States
    isLoading,
    isCalculating,
    error: error || calculationError,
    
    // Actions
    reload
  };
}
