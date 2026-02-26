import * as d3 from 'd3';
import * as echarts from 'echarts';
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
  private chartInstances: Map<string, echarts.ECharts> = new Map();
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
    const chartContainer = document.getElementById('execution-time-chart');
    if (!chartContainer) return;

    if (this.data.enrichedStats.length === 0) {
      chartContainer.innerHTML = '<div class="chart-empty">Aucune donnée de performance disponible</div>';
      const existingChart = this.chartInstances.get('execution-time-chart');
      if (existingChart) {
        existingChart.dispose();
        this.chartInstances.delete('execution-time-chart');
      }
      return;
    }

    chartContainer.innerHTML = '';

    // Déterminer l'unité de temps active
    const activeTimeButton = document.querySelector('[data-time-unit].active') as HTMLElement;
    const timeUnit = activeTimeButton?.getAttribute('data-time-unit') || 'ms';
    
    const chartData = this.data.enrichedStats
      .sort((a, b) => b.totalExecutionTimeMs - a.totalExecutionTimeMs)
      .slice(0, 10); // Top 10

    const convertTime = (nanoseconds: number): number => {
      switch (timeUnit) {
        case 's': return nanoseconds / 1_000_000_000;
        case 'ms': return nanoseconds / 1_000_000;
        default: return nanoseconds / 1_000_000; // par défaut ms
      }
    };

    const formatTime = (value: number): string => {
      switch (timeUnit) {
        case 's': return `${value.toFixed(3)}s`;
        case 'ms': return `${value.toFixed(0)}ms`;
        default: return `${value.toFixed(0)}ms`;
      }
    };

    const convertedData = chartData.map(d => ({
      ...d,
      totalExecutionTimeConverted: convertTime(d.cumulativeScanningTime + d.cumulativeEditTime),
      scanTimeConverted: convertTime(d.cumulativeScanningTime),
      editTimeConverted: convertTime(d.cumulativeEditTime)
    }));

    const chart = this.getOrCreateChart('execution-time-chart');
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const values = params as Array<{ seriesName: string; value: number }>;
          const total = values.reduce((sum, p) => sum + p.value, 0);
          const lines = values.map(v => `${v.seriesName}: ${formatTime(v.value)}`);
          return `${lines.join('<br/>')}<br/><strong>Total: ${formatTime(total)}</strong>`;
        }
      },
      legend: {
        data: ['Temps de Scan', 'Temps d\'Édition'],
        textStyle: { color: '#cbd5e1' }
      },
      grid: { top: 60, right: 20, bottom: 30, left: 220 },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#94a3b8',
          formatter: (value: number) => formatTime(value)
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } }
      },
      yAxis: {
        type: 'category',
        data: convertedData.map(d => d.recipe.split('.').pop() || d.recipe),
        axisLabel: { color: '#cbd5e1' }
      },
      series: [
        {
          name: 'Temps de Scan',
          type: 'bar',
          stack: 'total',
          data: convertedData.map(d => d.scanTimeConverted),
          itemStyle: { color: '#52c4b3' }
        },
        {
          name: 'Temps d\'Édition',
          type: 'bar',
          stack: 'total',
          data: convertedData.map(d => d.editTimeConverted),
          itemStyle: { color: '#ff6b35' }
        }
      ]
    });
  }

  /**
   * Graphique distribution scan vs edit
   */
  private async renderScanVsEditChart(): Promise<void> {
    const chartContainer = document.getElementById('scan-vs-edit-chart');
    if (!chartContainer) return;

    if (this.data.enrichedStats.length === 0) {
      chartContainer.innerHTML = '<div class="chart-empty">Aucune donnée disponible</div>';
      const existingChart = this.chartInstances.get('scan-vs-edit-chart');
      if (existingChart) {
        existingChart.dispose();
        this.chartInstances.delete('scan-vs-edit-chart');
      }
      return;
    }

    chartContainer.innerHTML = '';

    // Calculer les totaux
    const totalScanTime = this.data.enrichedStats.reduce((sum, d) => sum + d.cumulativeScanningTime, 0) / 1_000_000;
    const totalEditTime = this.data.enrichedStats.reduce((sum, d) => sum + d.cumulativeEditTime, 0) / 1_000_000;

    const pieData = [
      { label: 'Temps de Scan', value: totalScanTime, color: '#52c4b3' },
      { label: 'Temps d\'Édition', value: totalEditTime, color: '#ff6b35' }
    ];

    const chart = this.getOrCreateChart('scan-vs-edit-chart');
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}ms ({d}%)'
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#cbd5e1' }
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '72%'],
          avoidLabelOverlap: true,
          label: { color: '#e2e8f0', formatter: '{b}\n{d}%' },
          data: pieData.map(item => ({
            name: item.label,
            value: Number(item.value.toFixed(1)),
            itemStyle: { color: item.color }
          }))
        }
      ]
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
    const chartContainer = document.getElementById('savings-by-recipe-chart');
    if (!chartContainer) return;

    if (this.data.enrichedStats.length === 0) {
      chartContainer.innerHTML = '<div class="chart-empty">Aucune donnée disponible</div>';
      const existingChart = this.chartInstances.get('savings-by-recipe-chart');
      if (existingChart) {
        existingChart.dispose();
        this.chartInstances.delete('savings-by-recipe-chart');
      }
      return;
    }

    chartContainer.innerHTML = '';

    // Préparer les données pour le graphique
    const chartData = this.data.enrichedStats
      .filter(d => d.totalTimeSaved > 0)
      .sort((a, b) => b.totalTimeSaved - a.totalTimeSaved)
      .slice(0, 10); // Top 10

    // Obtenir le type de graphique sélectionné
    const chartTypeSelector = document.getElementById('savings-chart-type') as HTMLSelectElement;
    const chartType = chartTypeSelector ? chartTypeSelector.value : 'bar';

    const chart = this.getOrCreateChart('savings-by-recipe-chart');

    switch (chartType) {
      case 'pie':
        chart.setOption({
          tooltip: { trigger: 'item' },
          legend: { bottom: 0, textStyle: { color: '#cbd5e1' } },
          series: [
            {
              type: 'pie',
              radius: ['35%', '70%'],
              data: chartData.map(d => ({
                name: d.recipe.split('.').pop() || d.recipe,
                value: d.totalTimeSaved
              })),
              label: { color: '#e2e8f0' }
            }
          ]
        });
        break;
      case 'treemap':
        chart.setOption({
          tooltip: {
            formatter: (params: any) => `${params.name}: ${this.dataProcessor.formatDuration(params.value || 0)}`
          },
          series: [
            {
              type: 'treemap',
              data: chartData.map(d => ({
                name: d.recipe.split('.').pop() || d.recipe,
                value: d.totalTimeSaved
              })),
              breadcrumb: { show: false },
              label: { color: '#f1f5f9' }
            }
          ]
        });
        break;
      case 'bar':
      default:
        chart.setOption({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              const p = params[0];
              return `${p.name}<br/>${this.dataProcessor.formatDuration(Number(p.value))}`;
            }
          },
          grid: { left: 220, right: 20, top: 20, bottom: 30 },
          xAxis: {
            type: 'value',
            axisLabel: {
              color: '#94a3b8',
              formatter: (v: number) => this.dataProcessor.formatDuration(v)
            },
            splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } }
          },
          yAxis: {
            type: 'category',
            axisLabel: { color: '#cbd5e1' },
            data: chartData.map(d => d.recipe.split('.').pop() || d.recipe)
          },
          series: [
            {
              type: 'bar',
              data: chartData.map(d => d.totalTimeSaved),
              itemStyle: { color: '#7c3aed' }
            }
          ]
        });
        break;
    }
  }

  private getOrCreateChart(containerId: string): echarts.ECharts {
    const element = document.getElementById(containerId) as HTMLDivElement | null;
    if (!element) {
      throw new Error(`Conteneur introuvable: ${containerId}`);
    }

    const existing = this.chartInstances.get(containerId);
    if (existing) {
      existing.resize();
      return existing;
    }

    const chart = echarts.init(element, undefined, { renderer: 'canvas' });
    this.chartInstances.set(containerId, chart);
    return chart;
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
