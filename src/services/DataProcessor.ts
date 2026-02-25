import { 
  RecipeRunStats, 
  SourceFileResults, 
  ROIMetrics, 
  RecipePerformanceMetrics, 
  ChangeTypeAggregation,
  RecipeHierarchy,
  TimeUnit 
} from '../types/data';

/**
 * Service responsable du traitement et calcul des métriques sur les données OpenRewrite
 */
export class DataProcessor {
  private static instance: DataProcessor;

  private constructor() {}

  public static getInstance(): DataProcessor {
    if (!DataProcessor.instance) {
      DataProcessor.instance = new DataProcessor();
    }
    return DataProcessor.instance;
  }

  /**
   * Calcule les métriques ROI globales
   */
  public calculateROIMetrics(
    recipeStats: RecipeRunStats[], 
    sourceResults: SourceFileResults[]
  ): ROIMetrics {
    // Calcul du temps total économisé (en secondes)
    const totalTimeSaved = sourceResults.reduce((sum, result) => sum + result.estimatedTimeSaving, 0);

    // Calcul du temps total d'exécution (conversion ns -> s)
    const totalExecutionTime = recipeStats.reduce((sum, stats) => {
      const scanTimeMs = stats.cumulativeScanningTime / 1_000_000; // ns to ms
      const editTimeMs = stats.cumulativeEditTime / 1_000_000; // ns to ms
      return sum + (scanTimeMs + editTimeMs) / 1000; // ms to s
    }, 0);

    // Calcul du ROI (pourcentage)
    const roi = totalExecutionTime > 0 ? (totalTimeSaved / totalExecutionTime) * 100 : 0;

    // Calcul de l'efficacité
    const totalFilesProcessed = recipeStats.reduce((sum, stats) => sum + stats.sourceFileCount, 0);
    
    // Calcul des fichiers uniques modifiés à partir des résultats sources
    const uniqueFilesChanged = new Set(
      sourceResults
        .filter(result => result.sourcePathAfter || result.sourcePathBefore)
        .map(result => result.sourcePathAfter || result.sourcePathBefore)
    ).size;
    
    const efficiency = totalFilesProcessed > 0 ? (uniqueFilesChanged / totalFilesProcessed) * 100 : 0;

    // Impact moyen par fichier
    const impactPerFile = uniqueFilesChanged > 0 ? totalTimeSaved / uniqueFilesChanged : 0;

    return {
      totalTimeSaved,
      totalExecutionTime,
      roi,
      efficiency,
      impactPerFile,
      totalFilesProcessed,
      totalFilesChanged: uniqueFilesChanged
    };
  }

  /**
   * Enrichit les données RecipeRunStats avec des métriques calculées
   */
  public enrichRecipeStats(
    recipeStats: RecipeRunStats[], 
    sourceResults: SourceFileResults[]
  ): RecipePerformanceMetrics[] {
    return recipeStats.map(stats => {
      // Calcul du temps total d'exécution en ms
      const totalExecutionTimeMs = (stats.cumulativeScanningTime + stats.cumulativeEditTime) / 1_000_000;

      // Calcul du ratio scan/edit
      const scanEditRatio = stats.cumulativeEditTime > 0 
        ? stats.cumulativeScanningTime / stats.cumulativeEditTime 
        : stats.cumulativeScanningTime > 0 ? Infinity : 0;

      // Calcul de l'efficacité des changements
      const changeEfficiency = stats.sourceFileCount > 0 
        ? (stats.sourceFileChangedCount / stats.sourceFileCount) * 100 
        : 0;

      // Calcul du temps économisé total pour cette recette
      const totalTimeSaved = sourceResults
        .filter(result => result.recipeChanges === stats.recipe)
        .reduce((sum, result) => sum + result.estimatedTimeSaving, 0);

      // Calcul du ROI spécifique à cette recette
      const executionTimeSec = totalExecutionTimeMs / 1000;
      const recipeROI = executionTimeSec > 0 ? (totalTimeSaved / executionTimeSec) * 100 : 0;

      return {
        ...stats,
        totalExecutionTimeMs,
        scanEditRatio,
        changeEfficiency,
        totalTimeSaved,
        recipeROI
      };
    });
  }

  /**
   * Agrège les données par type de changement
   */
  public aggregateByChangeType(
    recipeStats: RecipeRunStats[], 
    sourceResults: SourceFileResults[]
  ): ChangeTypeAggregation[] {
    const aggregationMap = new Map<string, {
      filesAffected: Set<string>;
      timeSaved: number;
      executionTime: number;
      recipes: Set<string>;
    }>();

    // Traiter les résultats de fichiers sources
    sourceResults.forEach(result => {
      const changeType = this.extractChangeType(result.recipeChanges);
      
      if (!aggregationMap.has(changeType)) {
        aggregationMap.set(changeType, {
          filesAffected: new Set(),
          timeSaved: 0,
          executionTime: 0,
          recipes: new Set()
        });
      }

      const agg = aggregationMap.get(changeType)!;
      if (result.sourcePathAfter) {
        agg.filesAffected.add(result.sourcePathAfter);
      }
      agg.timeSaved += result.estimatedTimeSaving;
      agg.recipes.add(result.recipeChanges);
    });

    // Ajouter les temps d'exécution des recettes
    recipeStats.forEach(stats => {
      const changeType = this.extractChangeType(stats.recipe);
      const agg = aggregationMap.get(changeType);
      
      if (agg) {
        agg.executionTime += (stats.cumulativeScanningTime + stats.cumulativeEditTime) / 1_000_000; // ns to ms
      }
    });

    // Convertir en tableau
    return Array.from(aggregationMap.entries()).map(([changeType, data]) => ({
      changeType,
      filesAffected: data.filesAffected.size,
      timeSaved: data.timeSaved,
      executionTime: data.executionTime,
      recipes: Array.from(data.recipes)
    }));
  }

  /**
   * Construit la hiérarchie des recettes
   */
  public buildRecipeHierarchy(
    recipeStats: RecipeRunStats[], 
    sourceResults: SourceFileResults[]
  ): RecipeHierarchy[] {
    const enrichedStats = this.enrichRecipeStats(recipeStats, sourceResults);
    const hierarchyMap = new Map<string, RecipeHierarchy>();

    // Créer les nœuds de base
    enrichedStats.forEach(stats => {
      hierarchyMap.set(stats.recipe, {
        name: stats.recipe,
        parent: null,
        children: [],
        metrics: stats,
        depth: 0
      });
    });

    // Sans information de parenté, toutes les recettes sont considérées comme racines
    return Array.from(hierarchyMap.values());
  }

  /**
   * Calcule les métriques de tendance temporelle
   */
  public calculateTimeSeries(sourceResults: SourceFileResults[]): Array<{
    cycle: number;
    cumulativeTimeSaved: number;
    filesChanged: number;
    recipes: string[];
  }> {
    const cycleMap = new Map<number, {
      timeSaved: number;
      files: Set<string>;
      recipes: Set<string>;
    }>();

    sourceResults.forEach(result => {
      if (!cycleMap.has(result.cycle)) {
        cycleMap.set(result.cycle, {
          timeSaved: 0,
          files: new Set(),
          recipes: new Set()
        });
      }

      const cycle = cycleMap.get(result.cycle)!;
      cycle.timeSaved += result.estimatedTimeSaving;
      if (result.sourcePathAfter) {
        cycle.files.add(result.sourcePathAfter);
      }
      cycle.recipes.add(result.recipeChanges);
    });

    // Convertir en tableau et calculer les valeurs cumulatives
    const cycles = Array.from(cycleMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([cycleNum, data]) => ({
        cycle: cycleNum,
        timeSaved: data.timeSaved,
        filesChanged: data.files.size,
        recipes: Array.from(data.recipes)
      }));

    // Calculer les valeurs cumulatives
    let cumulativeTimeSaved = 0;
    return cycles.map(cycle => {
      cumulativeTimeSaved += cycle.timeSaved;
      return {
        cycle: cycle.cycle,
        cumulativeTimeSaved,
        filesChanged: cycle.filesChanged,
        recipes: cycle.recipes
      };
    });
  }

  /**
   * Convertit les unités de temps
   */
  public convertTimeUnit(
    nanoseconds: number, 
    targetUnit: TimeUnit
  ): number {
    switch (targetUnit) {
      case 'ns': return nanoseconds;
      case 'ms': return nanoseconds / 1_000_000;
      case 's': return nanoseconds / 1_000_000_000;
      case 'min': return nanoseconds / 60_000_000_000;
      case 'h': return nanoseconds / 3_600_000_000_000;
      default: return nanoseconds;
    }
  }

  /**
   * Formate les nombres avec des séparateurs de milliers
   */
  public formatNumber(
    value: number, 
    decimals: number = 2, 
    locale: string = 'fr-FR'
  ): string {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Formate les durées de façon lisible
   */
  public formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}min ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}min`;
    }
  }

  /**
   * Extrait le type de changement à partir du nom de la recette
   */
  private extractChangeType(recipeName: string): string {
    if (!recipeName) return 'Unknown';

    // Extraction basée sur les patterns courants d'OpenRewrite
    if (recipeName.includes('migrate')) return 'Migration';
    if (recipeName.includes('OrderImports')) return 'Import Organization';
    if (recipeName.includes('StringFormatted')) return 'String Formatting';
    if (recipeName.includes('CompositeRecipe')) return 'Composite';
    if (recipeName.includes('security')) return 'Security';
    if (recipeName.includes('junit')) return 'Testing';
    if (recipeName.includes('logging')) return 'Logging';

    // Extraction par package
    const parts = recipeName.split('.');
    if (parts.length > 2) {
      return parts[parts.length - 2] || 'Other'; // Avant-dernière partie
    }

    return 'Other';
  }

  /**
   * Calcule les statistiques de répartition
   */
  public calculateDistributionStats(values: number[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    percentile95: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, percentile95: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted.length % 2 === 0
      ? ((sorted[sorted.length / 2 - 1] || 0) + (sorted[sorted.length / 2] || 0)) / 2
      : (sorted[Math.floor(sorted.length / 2)] || 0);
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const percentile95Index = Math.floor(sorted.length * 0.95);
    const percentile95 = sorted[percentile95Index] || 0;

    return {
      mean,
      median,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      stdDev,
      percentile95
    };
  }
}