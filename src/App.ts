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
  private recipeIdFilters: string[] = [];
  private selectedRepositoryPath: string = 'all';
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
   * Graphique camembert du temps économisé par repository
   */
  private renderUsagePieChart(container: HTMLElement, usageData: UsageReportEntry[]): void {
    // Calculer le temps économisé par repository
    const repoTimeMap = new Map<string, number>();
    usageData.forEach(entry => {
      const repo = entry.repositoryPath;
      const timeSaved = entry.timeSavingsInMinutes || 0;
      repoTimeMap.set(repo, (repoTimeMap.get(repo) || 0) + timeSaved);
    });

    // Trier par temps économisé décroissant
    const sortedData = Array.from(repoTimeMap.entries())
      .sort((a, b) => b[1] - a[1]);

    // Couleurs pour le graphique
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    const pieData = sortedData.map(([repo, minutes], index) => ({
      name: repo,
      value: minutes,
      itemStyle: { color: colors[index % colors.length] }
    }));

    // Ne garder que les repos avec un temps économisé > 0
    const filteredPieData = pieData.filter(d => d.value > 0);

    if (filteredPieData.length === 0) {
      container.innerHTML = '<div class="chart-empty">Aucune donnée de temps économisé disponible</div>';
      return;
    }

    const chart = this.getOrCreateChart('usage-pie-chart');
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `${params.name}<br/>Temps économisé: ${params.value} min (${params.percent}%)`;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        textStyle: { color: '#cbd5e1' },
        formatter: (name: string) => {
          const item = filteredPieData.find(d => d.name === name);
          return item ? `${name}: ${item.value} min` : name;
        }
      },
      series: [
        {
          type: 'pie',
          radius: ['30%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#1e293b',
            borderWidth: 2
          },
          label: {
            show: true,
            color: '#e2e8f0',
            formatter: '{b}: {c} min'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            }
          },
          data: filteredPieData
        }
      ]
    });
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

    // Extraire les repositoryPath uniques
    const repositoryPaths = [...new Set(this.data.usageReport.map(entry => entry.repositoryPath))];
    repositoryPaths.sort();

    // Wrapper principal
    const wrapper = document.createElement('section');
    wrapper.className = 'chart-container full-width';

    // Ajouter les cartes KPI et le filtre
    const kpiSection = document.createElement('section');
    kpiSection.className = 'kpi-cards';

    // Carte pour le temps économisé
    const timeSavedCard = document.createElement('div');
    timeSavedCard.className = 'kpi-card';
    
    // Utiliser le même format que l'onglet vue d'ensemble (formatDuration)
    // Le temps économisé dans usageReport est en minutes (timeSavingsInMinutes)
    const totalMinutes = this.data.usageReport.reduce((sum, entry) => sum + (entry.timeSavingsInMinutes || 0), 0);
    const formattedTimeSaved = this.dataProcessor.formatDuration(totalMinutes * 60); // Convertir minutes en secondes
    
    timeSavedCard.innerHTML = `
      <div class="kpi-icon">⏱️</div>
      <div class="kpi-content">
        <div class="kpi-value" id="usage-time-saved">${formattedTimeSaved}</div>
        <div class="kpi-label">Temps Total Économisé</div>
      </div>
    `;
    kpiSection.appendChild(timeSavedCard);

    // Carte pour le nombre de repositories
    const reposCard = document.createElement('div');
    reposCard.className = 'kpi-card';
    reposCard.innerHTML = `
      <div class="kpi-icon">📁</div>
      <div class="kpi-content">
        <div class="kpi-value" id="usage-repos-count">${repositoryPaths.length}</div>
        <div class="kpi-label">Repositories</div>
      </div>
    `;
    kpiSection.appendChild(reposCard);

    // Carte pour le nombre de fichiers modifiés
    const totalFilesChanged = this.data.usageReport.reduce((sum, entry) => sum + (entry.totalFilesChanges || 0), 0);
    const filesCard = document.createElement('div');
    filesCard.className = 'kpi-card';
    filesCard.innerHTML = `
      <div class="kpi-icon">📝</div>
      <div class="kpi-content">
        <div class="kpi-value" id="usage-files-changed">${totalFilesChanged}</div>
        <div class="kpi-label">Fichiers Modifiés</div>
      </div>
    `;
    kpiSection.appendChild(filesCard);

    // Carte pour le temps de runtime total
    const totalRuntimeMs = this.data.usageReport.reduce((sum, entry) => sum + (entry.recipeRunInMilliseconds || 0), 0);
    const totalRuntimeMinutes = Math.round(totalRuntimeMs / 60000);
    const runtimeCard = document.createElement('div');
    runtimeCard.className = 'kpi-card';
    runtimeCard.innerHTML = `
      <div class="kpi-icon">⏱️</div>
      <div class="kpi-content">
        <div class="kpi-value" id="usage-lines-count">${totalRuntimeMinutes} min</div>
        <div class="kpi-label">Recipes Runtime Total</div>
      </div>
    `;
    kpiSection.appendChild(runtimeCard);

    wrapper.appendChild(kpiSection);

    // Section de filtre repositoryPath (sans chart-card, sans chart-body)
    const filterSection = document.createElement('section');
    filterSection.className = 'chart-container full-width';
    filterSection.style.marginTop = '1rem';

    const selectContainer = document.createElement('div');
    selectContainer.style.display = 'flex';
    selectContainer.style.gap = '1rem';
    selectContainer.style.alignItems = 'center';
    selectContainer.style.flexWrap = 'wrap';
    selectContainer.style.margin = '1rem';

    const selectLabel = document.createElement('label');
    selectLabel.textContent = 'Repository:';
    selectLabel.style.fontWeight = '600';
    selectLabel.style.color = 'var(--text-secondary)';

    const repositorySelect = document.createElement('select');
    repositorySelect.id = 'repository-path-select';
    repositorySelect.className = 'repository-select';
    repositorySelect.style.padding = '0.5rem';
    repositorySelect.style.borderRadius = '4px';
    repositorySelect.style.border = '1px solid #60a5fa';
    repositorySelect.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    repositorySelect.style.color = 'var(--text-primary)';
    repositorySelect.style.minWidth = '300px';
    repositorySelect.style.fontSize = '0.875rem';

    // Option "Tous les repositories"
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Tous les repositories';
    repositorySelect.appendChild(allOption);

    // Options pour chaque repositoryPath
    repositoryPaths.forEach(path => {
      const option = document.createElement('option');
      option.value = path;
      option.textContent = path;
      repositorySelect.appendChild(option);
    });

    // Restaurer la sélection précédente
    if (this.selectedRepositoryPath !== 'all') {
      repositorySelect.value = this.selectedRepositoryPath;
    }

    // Gestionnaire de changement
    repositorySelect.addEventListener('change', () => {
      this.selectedRepositoryPath = repositorySelect.value;
      this.refreshUsageTabData(container);
    });

    selectContainer.appendChild(selectLabel);
    selectContainer.appendChild(repositorySelect);
    filterSection.appendChild(selectContainer);
    wrapper.appendChild(filterSection);

    // Graphique camembert dans un chart-card séparé
    const pieChartSection = document.createElement('section');
    pieChartSection.className = 'chart-container full-width';
    pieChartSection.style.marginTop = '0.5rem';

    const pieChartCard = document.createElement('div');
    pieChartCard.className = 'chart-card';

    const pieChartBody = document.createElement('div');
    pieChartBody.className = 'chart-body';
    pieChartBody.style.height = '250px';

    const pieChartContainer = document.createElement('div');
    pieChartContainer.id = 'usage-pie-chart';
    pieChartContainer.style.width = '100%';
    pieChartContainer.style.height = '100%';

    pieChartBody.appendChild(pieChartContainer);
    pieChartCard.appendChild(pieChartBody);
    pieChartSection.appendChild(pieChartCard);
    wrapper.appendChild(pieChartSection);

    // Tableau des données
    const card = document.createElement('div');
    card.className = 'chart-card';

    const header = document.createElement('div');
    header.className = 'chart-header';

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

    // Rendu initial du graphique camembert (après ajout au DOM)
    this.renderUsagePieChart(pieChartContainer, this.data.usageReport);

    this.renderUsageReportTable(tableContainer, this.data.usageReport);
  }

  /**
   * Met à jour les données de l'onglet usage (temps économisé et tableau)
   */
  private refreshUsageTabData(container: HTMLElement): void {
    // Filtrer les données selon le repositoryPath sélectionné
    const filteredData = this.selectedRepositoryPath === 'all'
      ? this.data.usageReport
      : this.data.usageReport.filter(entry => entry.repositoryPath === this.selectedRepositoryPath);

    // Mettre à jour le temps économisé (même format que vue d'ensemble)
    const totalMinutesFiltered = filteredData.reduce((sum, entry) => sum + (entry.timeSavingsInMinutes || 0), 0);
    const formattedTimeSaved = this.dataProcessor.formatDuration(totalMinutesFiltered * 60); // Convertir minutes en secondes
    
    const timeSavedElement = document.getElementById('usage-time-saved');
    if (timeSavedElement) {
      timeSavedElement.textContent = formattedTimeSaved;
    }

    // Mettre à jour le temps de runtime total
    const filteredRuntimeMs = filteredData.reduce((sum, entry) => sum + (entry.recipeRunInMilliseconds || 0), 0);
    const filteredRuntimeMinutes = Math.round(filteredRuntimeMs / 60000);
    const linesElement = document.getElementById('usage-lines-count');
    if (linesElement) {
      linesElement.textContent = `${filteredRuntimeMinutes} min`;
    }

    // Mettre à jour le nombre de fichiers modifiés
    const totalFilesChangedFiltered = filteredData.reduce((sum, entry) => sum + (entry.totalFilesChanges || 0), 0);
    const filesChangedElement = document.getElementById('usage-files-changed');
    if (filesChangedElement) {
      filesChangedElement.textContent = totalFilesChangedFiltered.toString();
    }

    // Mettre à jour le titre du tableau
    const headerTitle = container.querySelector('.chart-header h3');
    if (headerTitle) {
      const repoText = this.selectedRepositoryPath === 'all' ? '' : ` - ${this.selectedRepositoryPath}`;
      headerTitle.textContent = `Usage report (usage-report.csv) - ${filteredData.length} lignes${repoText}`;
    }

    // Raffraîchir le graphique camembert
    const pieChartContainer = document.getElementById('usage-pie-chart');
    if (pieChartContainer) {
      this.renderUsagePieChart(pieChartContainer, filteredData);
    }

    // Raffraîchir le tableau
    const tableContainer = container.querySelector('.usage-table-container');
    if (tableContainer) {
      this.refreshUsageTable(tableContainer as HTMLElement, filteredData);
    }
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

    const filterContainer = document.createElement('div');
    filterContainer.className = 'recipe-filter-container';
    filterContainer.style.marginBottom = '1rem';
    filterContainer.style.display = 'flex';
    filterContainer.style.gap = '0.5rem';
    filterContainer.style.alignItems = 'center';
    filterContainer.style.flexWrap = 'wrap';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.className = 'recipe-filter-input';
    filterInput.placeholder = 'Filtrer par recipeId...';
    filterInput.style.padding = '0.5rem';
    filterInput.style.borderRadius = '4px';
    filterInput.style.border = '1px solid #60a5fa';
    filterInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    filterInput.style.color = 'var(--text-primary)';

    const addButton = document.createElement('button');
    addButton.textContent = 'Ajouter';
    addButton.className = 'recipe-filter-add-btn';
    addButton.style.padding = '0.5rem 1rem';
    addButton.style.borderRadius = '4px';
    addButton.style.border = 'none';
    addButton.style.backgroundColor = '#60a5fa';
    addButton.style.color = 'white';
    addButton.style.cursor = 'pointer';
    addButton.style.fontWeight = '600';

    const filterTagsContainer = document.createElement('div');
    filterTagsContainer.className = 'recipe-filter-tags';
    filterTagsContainer.style.display = 'flex';
    filterTagsContainer.style.gap = '0.5rem';
    filterTagsContainer.style.flexWrap = 'wrap';
    filterTagsContainer.style.marginTop = '0.5rem';

    const updateFilterTags = (): void => {
      filterTagsContainer.innerHTML = '';
      this.recipeIdFilters.forEach((filterValue, index) => {
        const tag = document.createElement('span');
        tag.className = 'recipe-filter-tag';
        tag.style.display = 'inline-flex';
        tag.style.alignItems = 'center';
        tag.style.gap = '0.5rem';
        tag.style.padding = '0.25rem 0.5rem';
        tag.style.backgroundColor = 'rgba(96, 165, 250, 0.2)';
        tag.style.border = '1px solid #60a5fa';
        tag.style.borderRadius = '4px';
        tag.style.color = 'var(--text-primary)';
        tag.style.fontSize = '0.875rem';

        const tagText = document.createElement('span');
        tagText.textContent = filterValue;
        tag.appendChild(tagText);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'recipe-filter-remove';
        removeBtn.style.background = 'none';
        removeBtn.style.border = 'none';
        removeBtn.style.color = '#60a5fa';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.fontSize = '1.25rem';
        removeBtn.style.lineHeight = '1';
        removeBtn.style.padding = '0';
        removeBtn.addEventListener('click', () => {
          this.recipeIdFilters.splice(index, 1);
          updateFilterTags();
          this.refreshUsageTable(container, usageData);
        });
        tag.appendChild(removeBtn);

        filterTagsContainer.appendChild(tag);
      });
    };

    addButton.addEventListener('click', () => {
      const value = filterInput.value.trim();
      if (value && !this.recipeIdFilters.includes(value)) {
        this.recipeIdFilters.push(value);
        filterInput.value = '';
        updateFilterTags();
        this.refreshUsageTable(container, usageData);
      }
    });

    filterInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        addButton.click();
      }
    });

    filterContainer.appendChild(filterInput);
    filterContainer.appendChild(addButton);
    filterContainer.appendChild(filterTagsContainer);

    container.appendChild(filterContainer);

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
    const filteredData = this.recipeIdFilters.length > 0
      ? usageData.filter(row => this.recipeIdFilters.includes(row.recipeId))
      : usageData;
    
    filteredData.forEach((row, index) => {
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

    meta.textContent = `Colonnes: ${columns.length} | Lignes: ${filteredData.length}${this.recipeIdFilters.length > 0 ? ` (filtrées de ${usageData.length})` : ''}`;

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(meta);
    container.appendChild(table);
  }

  /**
   * Rafraîchit le tableau d'usage avec les filtres actifs
   */
  private refreshUsageTable(container: HTMLElement, usageData: UsageReportEntry[]): void {
    const existingTable = container.querySelector('table.usage-table');
    const existingMeta = container.querySelector('.usage-meta');
    
    if (existingTable) existingTable.remove();
    if (existingMeta) existingMeta.remove();

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

    const filteredData = this.recipeIdFilters.length > 0
      ? usageData.filter(row => this.recipeIdFilters.includes(row.recipeId))
      : usageData;

    const table = document.createElement('table');
    table.className = 'usage-table';

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
    filteredData.forEach((row, index) => {
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

    const meta = document.createElement('div');
    meta.className = 'usage-meta';
    meta.textContent = `Colonnes: ${columns.length} | Lignes: ${filteredData.length}${this.recipeIdFilters.length > 0 ? ` (filtrées de ${usageData.length})` : ''}`;

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
    
    const container = document.getElementById('file-changes-chart');
    if (!container) return;
    
    container.innerHTML = '';

    if (this.data.sourceResults.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'chart-empty';
      emptyDiv.textContent = 'Aucun fichier modifié trouvé';
      container.appendChild(emptyDiv);
      return;
    }

    // Créer le conteneur principal
    const filesContainer = document.createElement('div');
    filesContainer.className = 'files-container';

    // Titre et statistiques
    const headerDiv = document.createElement('div');
    headerDiv.className = 'files-header';

    const title = document.createElement('h3');
    title.className = 'files-title';
    title.textContent = `Fichiers Modifiés (${this.data.sourceResults.length})`;
    headerDiv.appendChild(title);

    // Champ de filtre
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.className = 'file-filter';
    filterInput.placeholder = 'Filtrer les fichiers...';
    filterInput.id = 'file-filter-input';

    filterContainer.appendChild(filterInput);
    headerDiv.appendChild(filterContainer);
    filesContainer.appendChild(headerDiv);

    // Conteneur du tableau
    const tableContainer = document.createElement('div');
    tableContainer.className = 'files-table-container';

    // Créer le tableau
    const table = document.createElement('table');
    table.className = 'files-table';

    // En-tête du tableau
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = [
      { key: 'file', label: 'Fichier', sortable: true },
      { key: 'recipe', label: 'Recette', sortable: true },
      { key: 'timeSaved', label: 'Temps Économisé', sortable: true },
      { key: 'cycle', label: 'Cycle', sortable: true }
    ];

    headers.forEach(header => {
      const th = document.createElement('th');
      if (header.sortable) {
        th.className = 'sortable';
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => this.sortFilesTable(header.key));
      }
      th.textContent = header.label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Corps du tableau
    const tbody = document.createElement('tbody');
    tbody.id = 'files-table-body';

    // Remplir le tableau
    this.renderFilesTableRows(tbody, this.data.sourceResults);

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    filesContainer.appendChild(tableContainer);
    container.appendChild(filesContainer);

    // Gestionnaire de filtre
    filterInput.addEventListener('input', (event) => {
      const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
      const filteredData = this.data.sourceResults.filter(item => {
        const filePath = item.sourcePathAfter || item.sourcePathBefore || '';
        const recipe = item.recipeChanges || '';
        return filePath.toLowerCase().includes(filterValue) ||
               recipe.toLowerCase().includes(filterValue);
      });
      
      tbody.innerHTML = '';
      this.renderFilesTableRows(tbody, filteredData);
    });
  }

  /**
   * Rendu des lignes du tableau des fichiers
   */
  private renderFilesTableRows(tbody: HTMLTableSectionElement, data: SourceFileResults[]): void {
    data.forEach(d => {
      const tr = document.createElement('tr');
      tr.className = 'file-row';

      // Colonne fichier
      const fileTd = document.createElement('td');
      fileTd.className = 'file-path';
      const path = d.sourcePathAfter || d.sourcePathBefore || 'N/A';
      const fileName = path.split('/').pop() || path;
      const directory = path.substring(0, path.lastIndexOf('/'));
      fileTd.innerHTML = `
        <div class="file-info">
          <div class="file-name">${fileName}</div>
          ${directory ? `<div class="file-directory">${directory}</div>` : ''}
        </div>
      `;
      tr.appendChild(fileTd);

      // Colonne recette
      const recipeTd = document.createElement('td');
      recipeTd.className = 'recipe-name';
      const recipeParts = d.recipeChanges.split('.');
      recipeTd.textContent = recipeParts[recipeParts.length - 1] || d.recipeChanges;
      tr.appendChild(recipeTd);

      // Colonne temps économisé
      const timeTd = document.createElement('td');
      timeTd.className = 'time-saved';
      timeTd.textContent = this.dataProcessor.formatDuration(d.estimatedTimeSaving);
      tr.appendChild(timeTd);

      // Colonne cycle
      const cycleTd = document.createElement('td');
      cycleTd.className = 'cycle-number';
      cycleTd.textContent = d.cycle?.toString() || 'N/A';
      tr.appendChild(cycleTd);

      tbody.appendChild(tr);
    });
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

    const tbody = document.getElementById('files-table-body') as HTMLTableSectionElement;
    tbody.innerHTML = '';
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
    if (existing && element.innerHTML.trim() !== '') {
      // Le conteneur a du contenu, on redimensionne le graphique existant
      existing.resize();
      return existing;
    }

    // Le conteneur est vide ou l'instance n'existe pas, on crée un nouveau graphique
    if (existing) {
      existing.dispose();
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
