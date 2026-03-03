import { RecipeRunStats, SourceFileResults, UsageReportEntry } from '../types';

/**
 * Service responsable du chargement et parsing des fichiers CSV OpenRewrite
 * Utilise fetch pour charger les fichiers CSV
 */
export class DataLoader {
  private static instance: DataLoader;
  
  // Cache pour éviter de recharger les données
  private cache: Map<string, unknown[]> = new Map();

  private constructor() {}

  public static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  /**
   * Parse une chaîne CSV en tableau de colonnes
   */
  private parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    // Parser l'en-tête
    const headers = this.parseCSVLine(lines[0]);
    
    // Parser chaque ligne
    const data: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length > 0) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
    
    return data;
  }

  /**
   * Parse une ligne CSV en tenant compte des guillemets
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Charge un fichier CSV depuis le chemin donné
   */
  private async fetchCSV(filePath: string): Promise<Record<string, string>[]> {
    // Add timestamp to bypass browser cache
    const separator = filePath.includes('?') ? '&' : '?';
    const url = `${filePath}${separator}_t=${Date.now()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} pour ${filePath}`);
    }
    const text = await response.text();
    return this.parseCSV(text);
  }

  /**
   * Charge un fichier JSON
   */
  private async fetchJSON(filePath: string): Promise<any> {
    const separator = filePath.includes('?') ? '&' : '?';
    const url = `${filePath}${separator}_t=${Date.now()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} pour ${filePath}`);
    }
    return response.json();
  }

  /**
   * Charge et parse le fichier RecipeRunStats.csv
   */
  public async loadRecipeRunStats(filePath: string = '/data/org.openrewrite.table.RecipeRunStats.csv'): Promise<RecipeRunStats[]> {
    const cacheKey = `recipe-stats-${filePath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as RecipeRunStats[];
    }

    try {
      const csvData = await this.fetchCSV(filePath);
      
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
  public async loadSourceFileResults(filePath: string = '/data/org.openrewrite.table.SourcesFileResults.csv'): Promise<SourceFileResults[]> {
    const cacheKey = `source-results-${filePath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as SourceFileResults[];
    }

    try {
      const csvData = await this.fetchCSV(filePath);
      
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
  public async loadUsageReport(filePath: string = '/data/usage-report.csv'): Promise<UsageReportEntry[]> {
    const cacheKey = `usage-report-${filePath}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as UsageReportEntry[];
    }

    try {
      const csvData = await this.fetchCSV(filePath);
      return this.parseUsageReportData(csvData, cacheKey);
    } catch (error) {
      console.error('Erreur lors du chargement des données usage-report:', error);
      throw new Error(`Impossible de charger les données depuis ${filePath}: ${error}`);
    }
  }

  /**
   * Charge tous les fichiers usage-report-<timestamp>.csv et combine les donnees
   */
  public async loadAllUsageReports(): Promise<UsageReportEntry[]> {
    const cacheKey = 'usage-report-all';

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as UsageReportEntry[];
    }

    try {
      let usageReportFiles: string[] = [];

      // Charger le manifest pour obtenir la liste des fichiers
      try {
        const manifest = await this.fetchJSON('/data/manifest.json');
        if (manifest && manifest.usageReports) {
          usageReportFiles = manifest.usageReports.map((filename: string) => `/data/${filename}`);
        }
      } catch (e) {
        // Si le manifest n'existe pas, utiliser le fichier par defaut
        console.warn('Manifest non trouve, utilisation du fichier par defaut');
      }

      // Si aucun fichier dans le manifest, utiliser le fichier par defaut
      if (usageReportFiles.length === 0) {
        usageReportFiles = ['/data/usage-report-1772437230910.csv'];
      }

      const allData: UsageReportEntry[] = [];

      for (const filePath of usageReportFiles) {
        try {
          const csvData = await this.fetchCSV(filePath);
          const parsedData = this.parseUsageReportData(csvData, '');
          allData.push(...parsedData);
        } catch (error) {
          // Ignorer les fichiers non trouves
        }
      }

      // Trier par date de creation (plus recent en premier)
      allData.sort((a, b) => {
        const dateA = new Date(a.recipeRunCreatedAt || '').getTime();
        const dateB = new Date(b.recipeRunCreatedAt || '').getTime();
        return dateB - dateA;
      });

      this.cache.set(cacheKey, allData);
      return allData;
    } catch (error) {
      console.error('Erreur lors du chargement de tous les usage reports:', error);
      throw error;
    }
  }

  /**
   * Parse les données usage-report CSV
   */
  private parseUsageReportData(csvData: Record<string, string>[], cacheKey: string): UsageReportEntry[] {
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

    if (cacheKey) {
      this.cache.set(cacheKey, parsedData);
    }
    return parsedData;
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
  private isDescriptionRow(row: Record<string, string>): boolean {
    if (!row) return false;
    
    // Recherche des mots-clés indiquant une description
    const firstValue = Object.values(row)[0];
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
  private parseString(value: string | undefined): string {
    if (value === null || value === undefined) return '';
    
    let str = value.trim();
    
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
  private parseStringOrNull(value: string | undefined): string | null {
    const parsed = this.parseString(value);
    return parsed === '' || parsed.toLowerCase() === 'null' ? null : parsed;
  }

  /**
   * Parse un nombre en gérant les formats scientifiques et les erreurs
   */
  private parseNumber(value: string | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    
    // Conversion en chaîne et nettoyage
    let str = value.trim();
    
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

// Export d'une instance singleton
export const dataLoader = DataLoader.getInstance();
