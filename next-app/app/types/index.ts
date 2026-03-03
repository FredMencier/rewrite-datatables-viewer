/**
 * Interface pour les statistiques d'exécution des recettes OpenRewrite
 * Correspond au fichier org.openrewrite.table.RecipeRunStats.csv
 */
export interface RecipeRunStats {
  /** Le nom de la recette dont les stats sont mesurées */
  recipe: string;
  /** Le nombre de fichiers source sur lesquels la recette a été exécutée */
  sourceFileCount: number;
  /** Le nombre de fichiers source qui ont été modifiés lors de l'exécution */
  sourceFileChangedCount: number;
  /** Le temps total passé durant la phase de scan de cette recette (en nanosecondes) */
  cumulativeScanningTime: number;
  /** 99% des scans ont été complétés dans ce délai (en nanosecondes) */
  percentile99ScanningTime: number;
  /** Le temps maximal pour scanner un fichier source (en nanosecondes) */
  maxScanningTime: number;
  /** Le temps total passé durant la phase d'édition de cette recette (en nanosecondes) */
  cumulativeEditTime: number;
  /** 99% des éditions ont été complétées dans ce délai (en nanosecondes) */
  percentile99EditTime: number;
  /** Le temps maximal pour éditer un fichier source (en nanosecondes) */
  maxEditTime: number;
}

/**
 * Interface pour les résultats des modifications de fichiers sources
 * Correspond au fichier org.openrewrite.table.SourcesFileResults.csv
 */
export interface SourceFileResults {
  /** Le chemin du fichier source avant l'exécution (null si créé pendant l'exécution) */
  sourcePathBefore: string | null;
  /** Le chemin du fichier source après l'exécution (null si supprimé pendant l'exécution) */
  sourcePathAfter: string | null;
  /** La recette spécifique qui a fait un changement */
  recipeChanges: string;
  /** Effort estimé qu'un développeur devrait fournir pour corriger manuellement (en secondes) */
  estimatedTimeSaving: number;
  /** Le cycle de recette dans lequel le changement a été fait */
  cycle: number;
}

/**
 * Interface pour les métriques de ROI calculées
 */
export interface ROIMetrics {
  /** Temps total économisé (en secondes) */
  totalTimeSaved: number;
  /** Temps total d'exécution des recettes (en secondes) */
  totalExecutionTime: number;
  /** Retour sur investissement (pourcentage) */
  roi: number;
  /** Efficacité globale (pourcentage) */
  efficiency: number;
  /** Impact moyen par fichier (secondes économisées par fichier) */
  impactPerFile: number;
  /** Nombre total de fichiers traités */
  totalFilesProcessed: number;
  /** Nombre total de fichiers modifiés */
  totalFilesChanged: number;
}

/**
 * Interface pour les métriques de performance par recette
 */
export interface RecipePerformanceMetrics extends RecipeRunStats {
  /** Temps total d'exécution (scan + edit) en millisecondes */
  totalExecutionTimeMs: number;
  /** Ratio scan/edit */
  scanEditRatio: number;
  /** Efficacité (fichiers modifiés / fichiers traités) */
  changeEfficiency: number;
  /** Temps économisé total pour cette recette (en secondes) */
  totalTimeSaved: number;
  /** ROI spécifique à cette recette */
  recipeROI: number;
}

/**
 * Interface pour les données agrégées par type de changement
 */
export interface ChangeTypeAggregation {
  /** Type de changement (basé sur le nom de la recette) */
  changeType: string;
  /** Nombre de fichiers affectés */
  filesAffected: number;
  /** Temps total économisé (en secondes) */
  timeSaved: number;
  /** Temps d'exécution total (en millisecondes) */
  executionTime: number;
  /** Liste des recettes associées */
  recipes: string[];
}

/**
 * Interface pour les données de hiérarchie des recettes
 */
export interface RecipeHierarchy {
  /** Nom de la recette */
  name: string;
  /** Recette parent (null si racine) */
  parent: string | null;
  /** Recettes enfants */
  children: RecipeHierarchy[];
  /** Métriques de performance */
  metrics: RecipePerformanceMetrics;
  /** Niveau de profondeur dans la hiérarchie */
  depth: number;
}

/**
 * Interface pour les données de flux de fichiers (Sankey)
 */
export interface FileFlowData {
  /** Nœuds du diagramme de flux */
  nodes: Array<{
    id: string;
    name: string;
    type: 'recipe' | 'file' | 'change';
    value: number;
  }>;
  /** Liens entre les nœuds */
  links: Array<{
    source: string;
    target: string;
    value: number;
    timeSaved: number;
  }>;
}

/**
 * Interface pour les données temporelles (évolution dans le temps)
 */
export interface TimeSeriesData {
  /** Timestamp ou cycle */
  time: number | string;
  /** Temps économisé cumulé */
  cumulativeTimeSaved: number;
  /** Temps d'exécution */
  executionTime: number;
  /** Nombre de fichiers traités */
  filesProcessed: number;
  /** Nouvelles recettes ajoutées */
  newRecipes: string[];
}

/**
 * Type union pour les unités de temps
 */
export type TimeUnit = 'ns' | 'ms' | 's' | 'min' | 'h';

/**
 * Interface pour les options de formatage
 */
export interface FormatOptions {
  /** Unité de temps à utiliser */
  timeUnit: TimeUnit;
  /** Nombre de décimales */
  decimals: number;
  /** Utiliser des séparateurs de milliers */
  useThousandsSeparator: boolean;
}

/**
 * Interface pour le reporting d'usage des recettes
 * Correspond au fichier usage-report.csv
 */
export interface UsageReportEntry {
  runId: string;
  recipeId: string;
  organizationId: string;
  recipeRunState: string;
  repositoryOrigin: string;
  repositoryPath: string;
  repositoryBranch: string;
  recipeRunUserEmail: string;
  errorMarkers: number;
  warningMarkers: number;
  infoMarkers: number;
  debugMarkers: number;
  totalFilesResults: number;
  totalFilesSearched: number;
  totalFilesChanges: number;
  timeSavingsInMinutes: number;
  astLoadInMilliseconds: number;
  recipeRunInMilliseconds: number;
  dependencyResolutionInMilliseconds: number;
  recipeRunCreatedAt: string;
  recipeRunUpdatedAt: string;
  stack: string;
  priority: string;
  commitId: string | null;
  type: string | null;
  commitState: string | null;
  commitUserEmail: string | null;
  commitModifiedAt: string | null;
}
