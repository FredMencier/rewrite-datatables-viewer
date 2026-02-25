import * as d3 from 'd3';
import { RecipeRunStats, SourceFileResults, UsageReportEntry } from '../types/data';

/**
 * Service responsable du chargement et parsing des fichiers CSV OpenRewrite
 */
export class DataLoader {
  private static instance: DataLoader;
  
  // Cache pour éviter de recharger les données
  private cache: Map<string, any[]> = new Map();

  private constructor() {}

  public static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  /**
   * Charge et parse le fichier RecipeRunStats.csv
   */
  public async loadRecipeRunStats(filePath: string = 'data/org.openrewrite.table.RecipeRunStats.csv'): Promise<RecipeRunStats[]> {
    const cacheKey = `recipe-stats-${filePath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as RecipeRunStats[];
    }

    try {
      const csvData = await d3.csv(filePath);
      
      // Ignore la première ligne si c'est une description
      const dataRows = csvData.filter((_, index) => index > 0 || !this.isDescriptionRow(csvData[0]));
      
      const parsedData: RecipeRunStats[] = dataRows.map(row => {
        return {
          recipe: this.parseString(row['The recipe']),
          sourceFileCount: this.parseNumber(row['Source file count']),
          sourceFileChangedCount: this.parseNumber(row['Source file changed count']),
          cumulativeScanningTime: this.parseNumber(row['Cumulative scanning time (ns)']),
          percentile99ScanningTime: this.parseNumber(row['99th percentile scanning time (ns)']),
          maxScanningTime: this.parseNumber(row['Max scanning time (ns)']),
          cumulativeEditTime: this.parseNumber(row['Cumulative edit time (ns)']),
          percentile99EditTime: this.parseNumber(row['99th percentile edit time (ns)']),
          maxEditTime: this.parseNumber(row['Max edit time (ns)']),
        };
      }).filter(item => item.recipe && item.recipe.trim() !== '');

      this.cache.set(cacheKey, parsedData);
      return parsedData;
    } catch (error) {
      console.error('Erreur lors du chargement des données RecipeRunStats:', error);
      throw new Error(`Impossible de charger les données depuis ${filePath}: ${error}`);
    }
  }

  /**
   * Charge et parse le fichier SourcesFileResults.csv
   */
  public async loadSourceFileResults(filePath: string = 'data/org.openrewrite.table.SourcesFileResults.csv'): Promise<SourceFileResults[]> {
    const cacheKey = `source-results-${filePath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as SourceFileResults[];
    }

    try {
      const csvData = await d3.csv(filePath);
      
      // Ignore la première ligne si c'est une description
      const dataRows = csvData.filter((_, index) => index > 0 || !this.isDescriptionRow(csvData[0]));
      
      const parsedData: SourceFileResults[] = dataRows.map(row => {
        return {
          sourcePathBefore: this.parseStringOrNull(row['Source path before the run']),
          sourcePathAfter: this.parseStringOrNull(row['Source path after the run']),
          recipeChanges: this.parseString(row['Recipe that made changes']),
          estimatedTimeSaving: this.parseNumber(row['Estimated time saving']),
          cycle: this.parseNumber(row['Cycle']),
        };
      }).filter(item => item.recipeChanges && item.recipeChanges.trim() !== '');

      this.cache.set(cacheKey, parsedData);
      return parsedData;
    } catch (error) {
      console.error('Erreur lors du chargement des données SourceFileResults:', error);
      throw new Error(`Impossible de charger les données depuis ${filePath}: ${error}`);
    }
  }

  /**
   * Charge et parse le fichier usage-report.csv
   */
  public async loadUsageReport(filePath: string = 'data/usage-report.csv'): Promise<UsageReportEntry[]> {
    const cacheKey = `usage-report-${filePath}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as UsageReportEntry[];
    }

    try {
      const csvData = await d3.csv(filePath);

      const parsedData: UsageReportEntry[] = csvData.map(row => {
        return {
          runId: this.parseString(row['runId']),
          recipeId: this.parseString(row['recipeId']),
          organizationId: this.parseString(row['organizationId']),
          recipeRunState: this.parseString(row['recipeRunState']),
          repositoryOrigin: this.parseString(row['repositoryOrigin']),
          repositoryPath: this.parseString(row['repositoryPath']),
          repositoryBranch: this.parseString(row['repositoryBranch']),
          recipeRunUserEmail: this.parseString(row['recipeRunUserEmail']),
          errorMarkers: this.parseNumber(row['errorMarkers']),
          warningMarkers: this.parseNumber(row['warningMarkers']),
          infoMarkers: this.parseNumber(row['infoMarkers']),
          debugMarkers: this.parseNumber(row['debugMarkers']),
          totalFilesResults: this.parseNumber(row['totalFilesResults']),
          totalFilesSearched: this.parseNumber(row['totalFilesSearched']),
          totalFilesChanges: this.parseNumber(row['totalFilesChanges']),
          timeSavingsInMinutes: this.parseNumber(row['timeSavingsInMinutes']),
          astLoadInMilliseconds: this.parseNumber(row['astLoadInMilliseconds']),
          recipeRunInMilliseconds: this.parseNumber(row['recipeRunInMilliseconds']),
          dependencyResolutionInMilliseconds: this.parseNumber(row['dependencyResolutionInMilliseconds']),
          recipeRunCreatedAt: this.parseString(row['recipeRunCreatedAt']),
          recipeRunUpdatedAt: this.parseString(row['recipeRunUpdatedAt']),
          stack: this.parseString(row['stack']),
          priority: this.parseString(row['priority']),
          commitId: this.parseStringOrNull(row['commitId']),
          type: this.parseStringOrNull(row['type']),
          commitState: this.parseStringOrNull(row['commitState']),
          commitUserEmail: this.parseStringOrNull(row['commitUserEmail']),
          commitModifiedAt: this.parseStringOrNull(row['commitModifiedAt'])
        };
      }).filter(item => {
        if (!item.runId || !item.recipeId) {
          return false;
        }

        const commitState = (item.commitState || '').trim().toUpperCase();
        return commitState === 'COMPLETED';
      });

      this.cache.set(cacheKey, parsedData);
      return parsedData;
    } catch (error) {
      console.error('Erreur lors du chargement des données usage-report:', error);
      throw new Error(`Impossible de charger les données depuis ${filePath}: ${error}`);
    }
  }

  /**
   * Charge tous les fichiers de données disponibles
   */
  public async loadAllData(): Promise<{
    recipeStats: RecipeRunStats[];
    sourceResults: SourceFileResults[];
    usageReport: UsageReportEntry[];
  }> {
    try {
      const [recipeStats, sourceResults, usageReport] = await Promise.all([
        this.loadRecipeRunStats(),
        this.loadSourceFileResults(),
        this.loadUsageReport()
      ]);

      return {
        recipeStats,
        sourceResults,
        usageReport
      };
    } catch (error) {
      console.error('Erreur lors du chargement de toutes les données:', error);
      throw error;
    }
  }

  /**
   * Vide le cache et force le rechargement
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Vérifie si une ligne est une ligne de description (en-tête explicatif)
   */
  private isDescriptionRow(row: any): boolean {
    if (!row) return false;
    
    // Recherche des mots-clés indiquant une description
    const firstValue = Object.values(row)[0] as string;
    if (!firstValue) return false;
    
    const descriptionKeywords = [
      'The recipe whose stats are being measured',
      'The source path of the file before the run',
      'measured both individually',
      'null when'
    ];
    
    return descriptionKeywords.some(keyword => 
      firstValue.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Parse une chaîne de caractères en gérant les quotes et espaces
   */
  private parseString(value: any): string {
    if (value === null || value === undefined) return '';
    
    let str = String(value).trim();
    
    // Supprime les guillemets de début et fin si présents
    if ((str.startsWith('"') && str.endsWith('"')) || 
        (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }
    
    return str;
  }

  /**
   * Parse une chaîne en retournant null si vide ou "null"
   */
  private parseStringOrNull(value: any): string | null {
    const parsed = this.parseString(value);
    return parsed === '' || parsed.toLowerCase() === 'null' ? null : parsed;
  }

  /**
   * Parse un nombre en gérant les formats scientifiques et les erreurs
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    
    // Conversion en chaîne et nettoyage
    let str = String(value).trim();
    
    // Supprime les guillemets si présents
    if ((str.startsWith('"') && str.endsWith('"')) || 
        (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1).trim();
    }
    
    // Gestion des valeurs vides ou "null"
    if (str === '' || str.toLowerCase() === 'null') return 0;
    
    // Parse le nombre (gère automatiquement la notation scientifique)
    const parsed = parseFloat(str);
    
    return isNaN(parsed) ? 0 : parsed;
  }


  /**
   * Récupère les statistiques de cache
   */
  public getCacheStats(): {
    size: number;
    keys: string[];
    totalItems: number;
  } {
    const keys = Array.from(this.cache.keys());
    const totalItems = Array.from(this.cache.values())
      .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

    return {
      size: this.cache.size,
      keys,
      totalItems
    };
  }
}
