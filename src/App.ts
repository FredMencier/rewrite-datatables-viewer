import * as d3 from 'd3';
import { DataLoader } from './services/DataLoader';
import { DataProcessor } from './services/DataProcessor';
import { 
  RecipeRunStats, 
  SourceFileResults, 
  ROIMetrics, 
  RecipePerformanceMetrics,
  UsageReportEntry
} from './types/data';

/**
 * Classe principale de l'application Migration Data Visualizer
 * Coordonne tous les services et composants de visualisation
 */
export class App {
  private dataLoader: DataLoader;
  private dataProcessor: DataProcessor;
  private currentTab: string = 'usage';
  private data: {
    recipeStats: RecipeRunStats[];
    sourceResults: SourceFileResults[];
    roiMetrics: ROIMetrics | null;
    enrichedStats: RecipePerformanceMetrics[];
    usageReport: UsageReportEntry[];
  } = {
    recipeStats: [],
    sourceResults: [],
    roiMetrics: null,
    enrichedStats: [],
    usageReport: []
  };

  constructor() {
    this.dataLoader = DataLoader.getInstance();
    this.dataProcessor = DataProcessor.getInstance();
  }

  /**
   * Initialise l'application
   */
  public async initialize(): Promise<void> {
    try {
      this.showLoading(true);
      
      // Configurer les gestionnaires d'événements
      this.setupEventHandlers();
      
      // Charger et traiter les données
      await this.loadAndProcessData();
      
      // Initialiser l'interface utilisateur
      this.initializeUI();
      
      // Afficher le dashboard par défaut
      await this.showTab('usage');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      this.showError('Impossible de charger les données', error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Charge et traite toutes les données nécessaires
   */
  private async loadAndProcessData(): Promise<void> {
    const { recipeStats, sourceResults, usageReport } = await this.dataLoader.loadAllData();
    
    this.data.recipeStats = recipeStats;
    this.data.sourceResults = sourceResults;
    this.data.usageReport = usageReport;
    
    // Calculer les métriques ROI
    this.data.roiMetrics = this.dataProcessor.calculateROIMetrics(recipeStats, sourceResults);
    
    // Enrichir les statistiques de recettes
    this.data.enrichedStats = this.dataProcessor.enrichRecipeStats(recipeStats, sourceResults);
    
    console.log('Données chargées:', {
      recipes: recipeStats.length,
      sourceResults: sourceResults.length,
      usageReport: usageReport.length,
      roi: this.data.roiMetrics?.roi.toFixed(2) + '%'
    });
  }

  /**
   * Configure les gestionnaires d'événements de l'interface
   */
  private setupEventHandlers(): void {
    // Gestionnaires des onglets
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabId = target.getAttribute('data-tab');
        if (tabId) {
          await this.showTab(tabId);
        }
      });
    });

    // Gestionnaire du bouton actualiser
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        await this.refreshData();
      });
    }

    // Gestionnaire du bouton export
    const exportButton = document.getElementById('export-data');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        this.exportCurrentView();
      });
    }

    // Gestionnaire du sélecteur de type de graphique
    const chartTypeSelector = document.getElementById('savings-chart-type') as HTMLSelectElement;
    if (chartTypeSelector) {
      chartTypeSelector.addEventListener('change', async () => {
        if (this.currentTab === 'overview') {
          await this.renderSavingsByRecipeChart();
        }
      });
    }

    // Gestionnaires des boutons d'unité de temps (Performance)
    document.querySelectorAll('[data-time-unit]').forEach(button => {
      button.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const timeUnit = target.getAttribute('data-time-unit');
        
        if (timeUnit && this.currentTab === 'performance') {
          // Mettre à jour l'état visuel des boutons
          document.querySelectorAll('[data-time-unit]').forEach(btn => {
            btn.classList.remove('active');
          });
          target.classList.add('active');
          
          // Redessiner le graphique avec la nouvelle unité
          await this.renderExecutionTimeChart();
        }
      });
    });
  }

  /**
   * Initialise les éléments de l'interface utilisateur
   */
  private initializeUI(): void {
    // Mettre à jour les cartes KPI
    this.updateKPICards();
    
    // Afficher le message de bienvenue
    this.showToast('Données chargées avec succès', 'success');
  }

  /**
   * Affiche un onglet spécifique
   */
  private async showTab(tabId: string): Promise<void> {
    try {
      this.showLoading(true);
      
      // Mettre à jour l'état des boutons d'onglets
      document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabId) {
          button.classList.add('active');
        }
      });

      // Masquer tous les panneaux d'onglets
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
      });

      // Afficher le panneau sélectionné
      const targetPanel = document.getElementById(`${tabId}-tab`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      this.currentTab = tabId;

      // Charger le contenu de l'onglet
      switch (tabId) {
        case 'usage':
          await this.renderUsageTab();
          break;
        case 'overview':
          await this.renderOverviewTab();
          break;
        case 'performance':
          await this.renderPerformanceTab();
          break;
        case 'files':
          await this.renderFilesTab();
          break;
        case 'recipes':
          await this.renderRecipesTab();
          break;
        default:
          console.warn('Onglet inconnu:', tabId);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'affichage de l\'onglet:', error);
      this.showError(`Impossible d'afficher l'onglet ${tabId}`, error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Met à jour les cartes KPI du dashboard
   */
  private updateKPICards(): void {
    if (!this.data.roiMetrics) return;

    const { roiMetrics, enrichedStats } = this.data;

    // Temps total économisé
    const totalTimeSavedElement = document.getElementById('total-time-saved');
    if (totalTimeSavedElement) {
      totalTimeSavedElement.textContent = this.dataProcessor.formatDuration(roiMetrics.totalTimeSaved);
    }

    // Fichiers modifiés
    const totalFilesElement = document.getElementById('total-files-changed');
    if (totalFilesElement) {
      totalFilesElement.textContent = roiMetrics.totalFilesChanged.toString();
    }


    // Nombre de recettes
    const recipesElement = document.getElementById('recipes-count');
    if (recipesElement) {
      recipesElement.textContent = enrichedStats.length.toString();
    }
  }

  /**
   * Rendu de l'onglet Reporting d'usage (page d'accueil)
   */
  private async renderUsageTab(): Promise<void> {
    console.log('Rendu de l\'onglet Reporting d\'Usage');

    const container = document.getElementById('usage-tab');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (this.data.usageReport.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chart-empty';
      empty.textContent = 'Aucune donnée de reporting disponible';
      container.appendChild(empty);
      return;
    }

    const wrapper = document.createElement('section');
    wrapper.className = 'chart-container full-width';

    const card = document.createElement('div');
    card.className = 'chart-card';

    const header = document.createElement('div');
    header.className = 'chart-header';
    header.innerHTML = `<h3>Usage report (usage-report.csv) - ${this.data.usageReport.length} lignes</h3>`;

    const body = document.createElement('div');
    body.className = 'chart-body';

    const tableContainer = document.createElement('div');
    tableContainer.style.overflowX = 'auto';
    tableContainer.className = 'usage-table-container';

    body.appendChild(tableContainer);
    card.appendChild(header);
    card.appendChild(body);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    this.renderUsageReportTable(tableContainer, this.data.usageReport);
  }

  /**
   * Tableau de reporting d'usage
   */
  private renderUsageReportTable(
    container: HTMLElement,
    usageData: UsageReportEntry[]
  ): void {
    const meta = document.createElement('div');
    meta.className = 'usage-meta';

    const table = document.createElement('table');
    table.className = 'usage-table';

    const columns: Array<{ key: keyof UsageReportEntry; label: string }> = [
      { key: 'runId', label: 'runId' },
      { key: 'recipeId', label: 'recipeId' },
      { key: 'organizationId', label: 'organizationId' },
      { key: 'recipeRunState', label: 'recipeRunState' },
      { key: 'repositoryOrigin', label: 'repositoryOrigin' },
      { key: 'repositoryPath', label: 'repositoryPath' },
      { key: 'repositoryBranch', label: 'repositoryBranch' },
      { key: 'recipeRunUserEmail', label: 'recipeRunUserEmail' },
      { key: 'errorMarkers', label: 'errorMarkers' },
      { key: 'warningMarkers', label: 'warningMarkers' },
      { key: 'infoMarkers', label: 'infoMarkers' },
      { key: 'debugMarkers', label: 'debugMarkers' },
      { key: 'totalFilesResults', label: 'totalFilesResults' },
      { key: 'totalFilesSearched', label: 'totalFilesSearched' },
      { key: 'totalFilesChanges', label: 'totalFilesChanges' },
      { key: 'timeSavingsInMinutes', label: 'timeSavingsInMinutes' },
      { key: 'astLoadInMilliseconds', label: 'astLoadInMilliseconds' },
      { key: 'recipeRunInMilliseconds', label: 'recipeRunInMilliseconds' },
      { key: 'dependencyResolutionInMilliseconds', label: 'dependencyResolutionInMilliseconds' },
      { key: 'recipeRunCreatedAt', label: 'recipeRunCreatedAt' },
      { key: 'recipeRunUpdatedAt', label: 'recipeRunUpdatedAt' },
      { key: 'stack', label: 'stack' },
      { key: 'priority', label: 'priority' },
      { key: 'commitId', label: 'commitId' },
      { key: 'type', label: 'type' },
      { key: 'commitState', label: 'commitState' },
      { key: 'commitUserEmail', label: 'commitUserEmail' },
      { key: 'commitModifiedAt', label: 'commitModifiedAt' }
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const indexHeader = document.createElement('th');
    indexHeader.textContent = '#';
    headerRow.appendChild(indexHeader);

    columns.forEach(({ label }) => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');
    usageData.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.className = 'usage-row';

      const indexCell = document.createElement('td');
      indexCell.textContent = String(index + 1);
      tr.appendChild(indexCell);

      columns.forEach(({ key }) => {
        const td = document.createElement('td');
        const value = row[key];
        td.textContent = value === null || value === undefined ? '' : String(value);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    meta.textContent = `Colonnes: ${columns.length} | Lignes: ${usageData.length}`;

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(meta);
    container.appendChild(table);
  }

  /**
   * Rendu de l'onglet Vue d'ensemble
   */
  private async renderOverviewTab(): Promise<void> {
    console.log('Rendu de l\'onglet Vue d\'ensemble');
    
    // Ici nous implementerons les visualisations principales
    // Pour l'instant, nous affichons les données de base
    const overviewContainer = document.getElementById('overview-tab');
    if (!overviewContainer) return;

    // Mettre à jour les graphiques principaux
    await this.renderSavingsByRecipeChart();
  }

  /**
   * Rendu de l'onglet Performance
   */
  private async renderPerformanceTab(): Promise<void> {
    console.log('Rendu de l\'onglet Performance');
    
    // Rendre les graphiques de performance
    await this.renderExecutionTimeChart();
    await this.renderScanVsEditChart();
  }

  /**
   * Graphique des temps d'exécution par recette
   */
  private async renderExecutionTimeChart(): Promise<void> {
    const container = d3.select('#execution-time-chart');
    container.selectAll('*').remove();

    if (this.data.enrichedStats.length === 0) {
      container.append('div')
        .attr('class', 'chart-empty')
        .text('Aucune donnée de performance disponible');
      return;
    }

    // Déterminer l'unité de temps active
    const activeTimeButton = document.querySelector('[data-time-unit].active') as HTMLElement;
    const timeUnit = activeTimeButton?.getAttribute('data-time-unit') || 'ms';
    
    // Préparer les données pour le graphique
    const chartData = this.data.enrichedStats
      .sort((a, b) => b.totalExecutionTimeMs - a.totalExecutionTimeMs)
      .slice(0, 10); // Top 10

    // Fonction de conversion selon l'unité
    const convertTime = (nanoseconds: number): number => {
      switch (timeUnit) {
        case 's': return nanoseconds / 1_000_000_000;
        case 'ms': return nanoseconds / 1_000_000;
        default: return nanoseconds / 1_000_000; // par défaut ms
      }
    };

    // Fonction de formatage pour les labels
    const formatTime = (value: number): string => {
      switch (timeUnit) {
        case 's': return `${value.toFixed(3)}s`;
        case 'ms': return `${value.toFixed(0)}ms`;
        default: return `${value.toFixed(0)}ms`;
      }
    };

    // Convertir les données selon l'unité sélectionnée
    const convertedData = chartData.map(d => ({
      ...d,
      totalExecutionTimeConverted: convertTime(d.cumulativeScanningTime + d.cumulativeEditTime),
      scanTimeConverted: convertTime(d.cumulativeScanningTime),
      editTimeConverted: convertTime(d.cumulativeEditTime)
    }));

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 80, left: 120 };
    const containerElement = container.node() as HTMLElement;
    const containerWidth = containerElement?.getBoundingClientRect().width || 800;
    const width = Math.max(800, containerWidth) - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Créer le SVG
    const svg = container.append('svg')
      .attr('class', 'chart-svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Échelles
    const yScale = d3.scaleBand()
      .domain(convertedData.map(d => d.recipe.split('.').pop() || d.recipe))
      .range([0, height])
      .padding(0.1);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(convertedData, d => d.totalExecutionTimeConverted) || 0])
      .range([0, width]);

    // Couleurs fixes pour les types de temps
    const scanColor = '#52c4b3';  // Teal pour le scan
    const editColor = '#ff6b35';  // Orange pour l'édition

    // Axes
    g.append('g')
      .attr('class', 'axis y-axis')
      .call(d3.axisLeft(yScale));

    g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => formatTime(Number(d))));

    // Barres de scan - couleur teal pour toutes les recettes
    g.selectAll('.bar-scan')
      .data(convertedData)
      .enter().append('rect')
      .attr('class', 'bar scanning')
      .attr('y', d => yScale(d.recipe.split('.').pop() || d.recipe) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', d => xScale(d.scanTimeConverted))
      .attr('fill', scanColor);

    // Barres d'édition - couleur orange pour toutes les recettes - empilées sur scan
    g.selectAll('.bar-edit')
      .data(convertedData)
      .enter().append('rect')
      .attr('class', 'bar editing')
      .attr('y', d => yScale(d.recipe.split('.').pop() || d.recipe) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', d => xScale(d.scanTimeConverted))
      .attr('width', d => xScale(d.editTimeConverted))
      .attr('fill', editColor);

    // Ajouter les valeurs totales comme labels
    g.selectAll('.time-label')
      .data(convertedData)
      .enter().append('text')
      .attr('class', 'time-label')
      .attr('x', d => xScale(d.totalExecutionTimeConverted) + 5)
      .attr('y', d => (yScale(d.recipe.split('.').pop() || d.recipe) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .style('fill', 'var(--text-secondary)')
      .text(d => formatTime(d.totalExecutionTimeConverted));

    // Ajouter une légende
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('rect')
      .attr('x', -10)
      .attr('y', -10)
      .attr('width', 140)
      .attr('height', 50)
      .attr('fill', 'var(--panel-background)')
      .attr('stroke', 'var(--border-color)')
      .attr('rx', 5);

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 15)
      .attr('height', 8)
      .attr('fill', scanColor);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 8)
      .style('font-size', '10px')
      .style('fill', 'var(--text-secondary)')
      .text('Temps de Scan');

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 15)
      .attr('width', 15)
      .attr('height', 8)
      .attr('fill', editColor);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 23)
      .style('font-size', '10px')
      .style('fill', 'var(--text-secondary)')
      .text('Temps d\'Édition');
  }

  /**
   * Graphique distribution scan vs edit
   */
  private async renderScanVsEditChart(): Promise<void> {
    const container = d3.select('#scan-vs-edit-chart');
    container.selectAll('*').remove();

    if (this.data.enrichedStats.length === 0) {
      container.append('div')
        .attr('class', 'chart-empty')
        .text('Aucune donnée disponible');
      return;
    }

    // Calculer les totaux
    const totalScanTime = this.data.enrichedStats.reduce((sum, d) => sum + d.cumulativeScanningTime, 0) / 1_000_000;
    const totalEditTime = this.data.enrichedStats.reduce((sum, d) => sum + d.cumulativeEditTime, 0) / 1_000_000;

    const pieData = [
      { label: 'Temps de Scan', value: totalScanTime, color: '#52c4b3' },
      { label: 'Temps d\'Édition', value: totalEditTime, color: '#ff6b35' }
    ];

    // Dimensions agrandies
    const containerElement = container.node() as HTMLElement;
    const containerWidth = containerElement?.getBoundingClientRect().width || 600;
    const width = Math.min(containerWidth - 40, 600);
    const height = 500;
    const radius = Math.min(width, height) / 2 - 60;

    // Créer le SVG centré
    const svg = container.append('svg')
      .attr('class', 'chart-svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('margin', '0 auto');

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Arc generator
    const arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    // Arc pour les labels externes
    const labelArc = d3.arc()
      .innerRadius(radius + 20)
      .outerRadius(radius + 20);

    // Pie generator
    const pie = d3.pie()
      .value((d: any) => d.value)
      .sort(null);

    // Créer les secteurs
    const arcs = g.selectAll('.arc')
      .data(pie(pieData as any))
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('class', 'pie-slice')
      .attr('d', arc as any)
      .attr('fill', (d: any) => d.data.color)
      .style('stroke', 'var(--panel-border)')
      .style('stroke-width', '2px');

    // Ajouter les labels externes
    arcs.append('text')
      .attr('class', 'chart-label')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--text-primary)')
      .style('font-weight', 'bold')
      .style('font-size', '14px')
      .text((d: any) => d.data.label);

    // Ajouter les valeurs au centre des secteurs
    arcs.append('text')
      .attr('class', 'value-label')
      .attr('transform', (d: any) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('font-size', '12px')
      .text((d: any) => `${d.data.value.toFixed(1)}ms`);

    // Ajouter les pourcentages
    arcs.append('text')
      .attr('class', 'percentage-label')
      .attr('transform', (d: any) => {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1] + 15})`;
      })
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('font-size', '11px')
      .text((d: any) => {
        const total = totalScanTime + totalEditTime;
        const percentage = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0';
        return `${percentage}%`;
      });
  }


  /**
   * Rendu de l'onglet Fichiers
   */
  private async renderFilesTab(): Promise<void> {
    console.log('Rendu de l\'onglet Fichiers');
    
    const container = d3.select('#file-changes-chart');
    container.selectAll('*').remove();

    if (this.data.sourceResults.length === 0) {
      container.append('div')
        .attr('class', 'chart-empty')
        .text('Aucun fichier modifié trouvé');
      return;
    }

    // Créer le conteneur principal
    const filesContainer = container.append('div')
      .attr('class', 'files-container');

    // Titre et statistiques
    const headerDiv = filesContainer.append('div')
      .attr('class', 'files-header');

    headerDiv.append('h3')
      .attr('class', 'files-title')
      .text(`Fichiers Modifiés (${this.data.sourceResults.length})`);

    // Champ de filtre
    const filterContainer = headerDiv.append('div')
      .attr('class', 'filter-container');

    const filterInput = filterContainer.append('input')
      .attr('type', 'text')
      .attr('class', 'file-filter')
      .attr('placeholder', 'Filtrer les fichiers...')
      .attr('id', 'file-filter-input');

    // Conteneur du tableau
    const tableContainer = filesContainer.append('div')
      .attr('class', 'files-table-container');

    // Créer le tableau
    const table = tableContainer.append('table')
      .attr('class', 'files-table');

    // En-tête du tableau
    const thead = table.append('thead');
    const headerRow = thead.append('tr');
    
    const headers = [
      { key: 'file', label: 'Fichier', sortable: true },
      { key: 'recipe', label: 'Recette', sortable: true },
      { key: 'timeSaved', label: 'Temps Économisé', sortable: true },
      { key: 'cycle', label: 'Cycle', sortable: true }
    ];

    headers.forEach(header => {
      const th = headerRow.append('th')
        .attr('class', header.sortable ? 'sortable' : '')
        .text(header.label);
        
      if (header.sortable) {
        th.style('cursor', 'pointer')
          .on('click', () => this.sortFilesTable(header.key));
      }
    });

    // Corps du tableau
    const tbody = table.append('tbody')
      .attr('id', 'files-table-body');

    // Remplir le tableau
    this.renderFilesTableRows(tbody, this.data.sourceResults);

    // Gestionnaire de filtre
    filterInput.on('input', (event) => {
      const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
      const filteredData = this.data.sourceResults.filter(item => {
        const filePath = item.sourcePathAfter || item.sourcePathBefore || '';
        const recipe = item.recipeChanges || '';
        return filePath.toLowerCase().includes(filterValue) ||
               recipe.toLowerCase().includes(filterValue);
      });
      
      tbody.selectAll('*').remove();
      this.renderFilesTableRows(tbody, filteredData);
    });
  }

  /**
   * Rendu des lignes du tableau des fichiers
   */
  private renderFilesTableRows(tbody: d3.Selection<any, any, any, any>, data: SourceFileResults[]): void {
    const rows = tbody.selectAll('tr')
      .data(data)
      .enter().append('tr')
      .attr('class', 'file-row');

    // Colonne fichier
    rows.append('td')
      .attr('class', 'file-path')
      .html(d => {
        const path = d.sourcePathAfter || d.sourcePathBefore || 'N/A';
        const fileName = path.split('/').pop() || path;
        const directory = path.substring(0, path.lastIndexOf('/'));
        
        return `
          <div class="file-info">
            <div class="file-name">${fileName}</div>
            ${directory ? `<div class="file-directory">${directory}</div>` : ''}
          </div>
        `;
      });

    // Colonne recette
    rows.append('td')
      .attr('class', 'recipe-name')
      .text(d => {
        const recipeParts = d.recipeChanges.split('.');
        return recipeParts[recipeParts.length - 1] || d.recipeChanges;
      });

    // Colonne temps économisé
    rows.append('td')
      .attr('class', 'time-saved')
      .text(d => this.dataProcessor.formatDuration(d.estimatedTimeSaving));

    // Colonne cycle
    rows.append('td')
      .attr('class', 'cycle-number')
      .text(d => d.cycle?.toString() || 'N/A');
  }

  /**
   * Trie le tableau des fichiers
   */
  private sortFilesTable(sortKey: string): void {
    let sortedData = [...this.data.sourceResults];
    
    switch (sortKey) {
      case 'file':
        sortedData.sort((a, b) => {
          const pathA = a.sourcePathAfter || a.sourcePathBefore || '';
          const pathB = b.sourcePathAfter || b.sourcePathBefore || '';
          return pathA.localeCompare(pathB);
        });
        break;
      case 'recipe':
        sortedData.sort((a, b) => a.recipeChanges.localeCompare(b.recipeChanges));
        break;
      case 'timeSaved':
        sortedData.sort((a, b) => b.estimatedTimeSaving - a.estimatedTimeSaving);
        break;
      case 'cycle':
        sortedData.sort((a, b) => (b.cycle || 0) - (a.cycle || 0));
        break;
    }

    const tbody = d3.select('#files-table-body');
    tbody.selectAll('*').remove();
    this.renderFilesTableRows(tbody, sortedData);
  }

  /**
   * Rendu de l'onglet Recettes
   */
  private async renderRecipesTab(): Promise<void> {
    console.log('Rendu de l\'onglet Recettes');
    // Implémentation à venir
  }

  /**
   * Graphique des économies par recette avec différents types de visualisation
   */
  private async renderSavingsByRecipeChart(): Promise<void> {
    const container = d3.select('#savings-by-recipe-chart');
    container.selectAll('*').remove();

    if (this.data.enrichedStats.length === 0) {
      container.append('div')
        .attr('class', 'chart-empty')
        .text('Aucune donnée disponible');
      return;
    }

    // Préparer les données pour le graphique
    const chartData = this.data.enrichedStats
      .filter(d => d.totalTimeSaved > 0)
      .sort((a, b) => b.totalTimeSaved - a.totalTimeSaved)
      .slice(0, 10); // Top 10

    // Obtenir le type de graphique sélectionné
    const chartTypeSelector = document.getElementById('savings-chart-type') as HTMLSelectElement;
    const chartType = chartTypeSelector ? chartTypeSelector.value : 'bar';

    // Rendu selon le type sélectionné
    switch (chartType) {
      case 'pie':
        this.renderPieChart(container, chartData);
        break;
      case 'treemap':
        this.renderTreemapChart(container, chartData);
        break;
      case 'bar':
      default:
        this.renderBarChart(container, chartData);
        break;
    }
  }

  /**
   * Rendu du graphique en barres
   */
  private renderBarChart(container: d3.Selection<any, any, any, any>, chartData: RecipePerformanceMetrics[]): void {
    // Dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 150 };
    const width = Math.max(800, container.node()?.getBoundingClientRect().width || 800) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Créer le SVG
    const svg = container.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Échelles
    const yScale = d3.scaleBand()
      .domain(chartData.map(d => d.recipe.split('.').pop() || d.recipe))
      .range([0, height])
      .padding(0.1);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.totalTimeSaved) || 0])
      .range([0, width]);

    // Échelle de couleurs
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Axes
    g.append('g')
      .attr('class', 'axis y-axis')
      .call(d3.axisLeft(yScale));

    g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => this.dataProcessor.formatDuration(Number(d))));

    // Barres
    g.selectAll('.bar')
      .data(chartData)
      .enter().append('rect')
      .attr('class', 'bar savings')
      .attr('y', d => yScale(d.recipe.split('.').pop() || d.recipe) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', d => xScale(d.totalTimeSaved))
      .attr('fill', (_, i) => colorScale(i.toString()));

    // Labels avec valeurs
    g.selectAll('.bar-label')
      .data(chartData)
      .enter().append('text')
      .attr('class', 'bar-label')
      .attr('x', d => xScale(d.totalTimeSaved) + 5)
      .attr('y', d => (yScale(d.recipe.split('.').pop() || d.recipe) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text(d => this.dataProcessor.formatDuration(d.totalTimeSaved));
  }

  /**
   * Rendu du graphique camembert
   */
  private renderPieChart(container: d3.Selection<any, any, any, any>, chartData: RecipePerformanceMetrics[]): void {
    // Dimensions
    const width = 500;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    // Créer le SVG
    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('margin', '0 auto')
      .style('display', 'block');

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Arc generator
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Arc pour les labels
    const labelArc = d3.arc()
      .innerRadius(radius + 10)
      .outerRadius(radius + 10);

    // Pie generator
    const pie = d3.pie<RecipePerformanceMetrics>()
      .value(d => d.totalTimeSaved)
      .sort(null);

    // Échelle de couleurs
    const colorScale = d3.scaleOrdinal(d3.schemeSet3);

    // Créer les secteurs
    const arcs = g.selectAll('.arc')
      .data(pie(chartData))
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('class', 'pie-slice')
      .attr('d', arc as any)
      .attr('fill', (_, i) => colorScale(i.toString()))
      .style('stroke', 'var(--panel-border)')
      .style('stroke-width', '2px');

    // Ajouter les labels
    arcs.append('text')
      .attr('class', 'chart-label')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-primary)')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const recipeName = d.data.recipe.split('.').pop() || d.data.recipe;
        return recipeName.length > 12 ? recipeName.substring(0, 12) + '...' : recipeName;
      });

    // Ajouter les pourcentages au centre des secteurs
    arcs.append('text')
      .attr('class', 'percentage-label')
      .attr('transform', (d: any) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const total = chartData.reduce((sum, item) => sum + item.totalTimeSaved, 0);
        const percentage = ((d.data.totalTimeSaved / total) * 100).toFixed(1);
        return `${percentage}%`;
      });
  }

  /**
   * Rendu du graphique TreeMap
   */
  private renderTreemapChart(container: d3.Selection<any, any, any, any>, chartData: RecipePerformanceMetrics[]): void {
    // Dimensions
    const width = Math.max(800, container.node()?.getBoundingClientRect().width || 800);
    const height = 400;

    // Créer le SVG
    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);

    // Préparer les données pour le treemap
    const hierarchyData = {
      name: 'root',
      children: chartData.map(d => ({
        name: d.recipe.split('.').pop() || d.recipe,
        value: d.totalTimeSaved,
        fullName: d.recipe
      }))
    };

    // Créer la hiérarchie
    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Créer le treemap
    const treemap = d3.treemap<any>()
      .size([width, height])
      .padding(2)
      .round(true);

    treemap(root);

    // Échelle de couleurs
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Créer les rectangles
    const leaf = svg.selectAll('g')
      .data(root.leaves())
      .enter().append('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    leaf.append('rect')
      .attr('class', 'treemap-rect')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (_: any, i: number) => colorScale(i.toString()))
      .style('stroke', 'var(--panel-border)')
      .style('stroke-width', '2px')
      .style('opacity', 0.8);

    // Ajouter les labels
    leaf.append('text')
      .attr('class', 'treemap-label')
      .attr('x', 4)
      .attr('y', 16)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text((d: any) => d.data.name);

    // Ajouter les valeurs
    leaf.append('text')
      .attr('class', 'treemap-value')
      .attr('x', 4)
      .attr('y', 32)
      .style('font-size', '10px')
      .style('fill', 'white')
      .text((d: any) => this.dataProcessor.formatDuration(d.data.value));
  }


  /**
   * Actualise les données
   */
  private async refreshData(): Promise<void> {
    try {
      this.showLoading(true);
      this.dataLoader.clearCache();
      await this.loadAndProcessData();
      this.updateKPICards();
      await this.showTab(this.currentTab);
      this.showToast('Données actualisées', 'success');
    } catch (error) {
      this.showError('Erreur lors de l\'actualisation', error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Exporte la vue actuelle
   */
  private exportCurrentView(): void {
    // Implémentation basique pour l'instant
    const data = {
      tab: this.currentTab,
      timestamp: new Date().toISOString(),
      data: this.data
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openrewrite-data-${this.currentTab}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Données exportées', 'success');
  }

  /**
   * Affiche/masque l'indicateur de chargement
   */
  private showLoading(show: boolean): void {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      if (show) {
        loadingElement.classList.remove('hidden');
      } else {
        loadingElement.classList.add('hidden');
      }
    }
  }

  /**
   * Affiche un message d'erreur
   */
  private showError(message: string, error: Error): void {
    console.error(message, error);
    this.showToast(`${message}: ${error.message}`, 'error');
  }

  /**
   * Affiche un toast notification
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const toastContainer = this.getOrCreateToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
        <button class="toast-close">×</button>
      </div>
      <div class="toast-body">${message}</div>
    `;
    
    // Gestionnaire de fermeture
    const closeButton = toast.querySelector('.toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        toast.remove();
      });
    }
    
    // Auto-fermeture après 5 secondes
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
    
    toastContainer.appendChild(toast);
  }

  /**
   * Obtient ou crée le conteneur de toasts
   */
  private getOrCreateToastContainer(): HTMLElement {
    let container = document.querySelector('.toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }
}
