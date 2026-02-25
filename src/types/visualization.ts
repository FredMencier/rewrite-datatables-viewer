import * as d3 from 'd3';

/**
 * Interface de base pour toutes les visualisations
 */
export interface BaseVisualizationConfig {
  /** Conteneur SVG ou DIV pour la visualisation */
  container: d3.Selection<HTMLElement, unknown, null, undefined>;
  /** Largeur de la visualisation */
  width: number;
  /** Hauteur de la visualisation */
  height: number;
  /** Marges autour du graphique */
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Options d'animation */
  animation?: {
    duration: number;
    easing: (t: number) => number;
  };
  /** Couleurs personnalisées */
  colors?: string[];
}

/**
 * Configuration pour les graphiques en barres
 */
export interface BarChartConfig extends BaseVisualizationConfig {
  /** Orientation du graphique */
  orientation: 'horizontal' | 'vertical';
  /** Espacement entre les barres (0-1) */
  padding: number;
  /** Afficher les valeurs sur les barres */
  showValues: boolean;
  /** Format des valeurs affichées */
  valueFormat: (value: number) => string;
}

/**
 * Configuration pour les graphiques en secteurs (pie/donut)
 */
export interface PieChartConfig extends BaseVisualizationConfig {
  /** Rayon intérieur (pour donut chart) */
  innerRadius: number;
  /** Rayon extérieur */
  outerRadius: number;
  /** Angle de début */
  startAngle: number;
  /** Angle de fin */
  endAngle: number;
  /** Afficher les étiquettes */
  showLabels: boolean;
  /** Position des étiquettes */
  labelOffset: number;
}

/**
 * Configuration pour les bubble charts
 */
export interface BubbleChartConfig extends BaseVisualizationConfig {
  /** Taille minimale des bulles */
  minRadius: number;
  /** Taille maximale des bulles */
  maxRadius: number;
  /** Force de collision entre bulles */
  collisionForce: number;
  /** Afficher les axes */
  showAxes: boolean;
}

/**
 * Configuration pour les heatmaps
 */
export interface HeatmapConfig extends BaseVisualizationConfig {
  /** Taille des cellules */
  cellSize: number;
  /** Palette de couleurs */
  colorScheme: string[];
  /** Domaine des valeurs */
  domain: [number, number];
  /** Afficher les valeurs dans les cellules */
  showValues: boolean;
}

/**
 * Configuration pour les graphiques de réseau
 */
export interface NetworkConfig extends BaseVisualizationConfig {
  /** Force de répulsion entre nœuds */
  repulsionForce: number;
  /** Force d'attraction des liens */
  linkForce: number;
  /** Taille des nœuds */
  nodeSize: number;
  /** Épaisseur des liens */
  linkWidth: number;
  /** Afficher les étiquettes des nœuds */
  showNodeLabels: boolean;
}

/**
 * Configuration pour les diagrammes de Sankey
 */
export interface SankeyConfig extends BaseVisualizationConfig {
  /** Largeur des nœuds */
  nodeWidth: number;
  /** Espacement entre nœuds */
  nodePadding: number;
  /** Nombre d'itérations pour l'algorithme */
  iterations: number;
  /** Alignement des nœuds */
  nodeAlign: 'left' | 'right' | 'center' | 'justify';
}

/**
 * Configuration pour les TreeMaps
 */
export interface TreeMapConfig extends BaseVisualizationConfig {
  /** Algorithme de tiling */
  tile: any; // d3 hierarchy tiling method
  /** Padding autour des rectangles */
  padding: number;
  /** Coins arrondis */
  borderRadius: number;
  /** Afficher les étiquettes */
  showLabels: boolean;
}

/**
 * Interface pour les données de tooltip
 */
export interface TooltipData {
  /** Titre du tooltip */
  title: string;
  /** Contenu principal */
  content: Array<{
    label: string;
    value: string | number;
    format?: (value: any) => string;
  }>;
  /** Position du tooltip */
  position: {
    x: number;
    y: number;
  };
}

/**
 * Interface pour les événements des visualisations
 */
export interface VisualizationEvents {
  /** Clic sur un élément */
  onClick?: (data: any, event: MouseEvent) => void;
  /** Survol d'un élément */
  onHover?: (data: any, event: MouseEvent) => void;
  /** Fin de survol */
  onHoverEnd?: (data: any, event: MouseEvent) => void;
  /** Brush/sélection */
  onBrush?: (selection: any) => void;
  /** Zoom */
  onZoom?: (transform: d3.ZoomTransform) => void;
}

/**
 * Interface pour l'état d'une visualisation
 */
export interface VisualizationState {
  /** Données actuellement affichées */
  data: any[];
  /** Filtres appliqués */
  filters: Record<string, any>;
  /** État de zoom/pan */
  transform: d3.ZoomTransform | null;
  /** Sélection actuelle */
  selection: any[] | null;
  /** État de chargement */
  loading: boolean;
  /** Erreurs */
  error: string | null;
}

/**
 * Interface pour les métriques de performance des visualisations
 */
export interface VisualizationPerformance {
  /** Temps de rendu (ms) */
  renderTime: number;
  /** Nombre d'éléments SVG créés */
  elementCount: number;
  /** Mémoire utilisée (estimation) */
  memoryUsage: number;
  /** Nombre de mises à jour */
  updateCount: number;
}

/**
 * Type pour les différents types de graphiques disponibles
 */
export type ChartType = 
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'bubble'
  | 'heatmap'
  | 'network'
  | 'sankey'
  | 'treemap'
  | 'radar'
  | 'scatter'
  | 'area'
  | 'gauge';

/**
 * Interface pour les options d'export
 */
export interface ExportOptions {
  /** Format d'export */
  format: 'png' | 'svg' | 'pdf' | 'json';
  /** Qualité pour PNG (0-1) */
  quality?: number;
  /** Largeur d'export */
  width?: number;
  /** Hauteur d'export */
  height?: number;
  /** Nom du fichier */
  filename?: string;
}

/**
 * Interface pour les thèmes de visualisation
 */
export interface VisualizationTheme {
  /** Couleurs primaires */
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  /** Polices */
  fonts: {
    primary: string;
    monospace: string;
  };
  /** Tailles */
  sizes: {
    small: number;
    medium: number;
    large: number;
  };
  /** Palette de couleurs pour les données */
  dataColors: string[];
}

/**
 * Interface pour les filtres de données
 */
export interface DataFilter {
  /** Champ à filtrer */
  field: string;
  /** Opérateur de comparaison */
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  /** Valeur(s) de comparaison */
  value: any;
  /** Actif ou non */
  active: boolean;
}

/**
 * Interface pour l'agrégation de données
 */
export interface DataAggregation {
  /** Champ de groupement */
  groupBy: string[];
  /** Métriques à calculer */
  metrics: Array<{
    field: string;
    operation: 'sum' | 'avg' | 'min' | 'max' | 'count';
    alias?: string;
  }>;
}

/**
 * Interface pour les contrôles interactifs
 */
export interface InteractiveControls {
  /** Filtres disponibles */
  filters: DataFilter[];
  /** Options d'agrégation */
  aggregation?: DataAggregation;
  /** Tri */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  /** Pagination */
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}