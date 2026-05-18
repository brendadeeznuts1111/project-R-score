/**
 * Custom Bun Table Component
 * High-performance table with sorting, filtering, pagination, and actions
 */

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: Record<string, any>, index: number) => string | HTMLElement;
  fixed?: boolean;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  perPage: number;
  total: number;
}

export interface TableOptions {
  containerId: string;
  columns: TableColumn[];
  data: Record<string, any>[];
  theme?: 'npm' | 'enterprise' | 'empire' | 'r2' | 'phone' | 'security' | 'dark';
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  selectable?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export interface TableEventMap {
  'row:click': (row: Record<string, any>, index: number) => void;
  'row:action': (action: string, row: Record<string, any>) => void;
  'sort:change': (sort: SortState) => void;
  'filter:change': (query: string) => void;
  'page:change': (page: number) => void;
  'selection:change': (selected: Record<string, any>[]) => void;
}

type EventHandler<K extends keyof TableEventMap> = TableEventMap[K];

export class BunTable {
  private options: Required<TableOptions>;
  private container: HTMLElement;
  private headerRow: HTMLTableRowElement;
  private bodyElement: HTMLTableSectionElement;
  private sortState: SortState = { key: '', direction: 'asc' };
  private filterQuery = '';
  private paginationState: PaginationState = { page: 1, perPage: 10, total: 0 };
  private selectedRows: Set<number> = new Set();
  private allData: Record<string, any>[] = [];
  private filteredData: Record<string, any>[] = [];
  private eventListeners: Map<keyof TableEventMap, Set<Function>> = new Map();
  private sortIcons: Map<string, HTMLElement> = new Map();
  private resizeObserver: ResizeObserver | null = null;

  private static THEMES = {
    npm: {
      primary: '#3b82f6',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(203, 56, 55, 0.08)',
      selected: 'rgba(203, 56, 55, 0.12)',
    },
    enterprise: {
      primary: '#3b82f6',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(59, 130, 246, 0.08)',
      selected: 'rgba(59, 130, 246, 0.12)',
    },
    empire: {
      primary: '#3b82f6',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(99, 102, 241, 0.08)',
      selected: 'rgba(99, 102, 241, 0.12)',
    },
    r2: {
      primary: '#3b82f6',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(244, 129, 31, 0.08)',
      selected: 'rgba(244, 129, 31, 0.12)',
    },
    phone: {
      primary: '#3b82f6',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(59, 130, 246, 0.08)',
      selected: 'rgba(59, 130, 246, 0.12)',
    },
    security: {
      primary: '#10b981',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(16, 185, 129, 0.08)',
      selected: 'rgba(16, 185, 129, 0.12)',
    },
    dark: {
      primary: '#3b82f6',
      secondary: '#3b82f6',
      accent: '#3b82f6',
      background: '#3b82f6',
      surface: '#3b82f6',
      border: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      hover: 'rgba(96, 165, 250, 0.12)',
      selected: 'rgba(96, 165, 250, 0.16)',
    },
  };

  constructor(options: TableOptions) {
    this.options = {
      containerId: options.containerId,
      columns: options.columns,
      data: options.data || [],
      theme: options.theme || 'enterprise',
      sortable: options.sortable ?? true,
      filterable: options.filterable ?? true,
      pagination: options.pagination ?? true,
      selectable: options.selectable ?? false,
      striped: options.striped ?? true,
      hoverable: options.hoverable ?? true,
      compact: options.compact ?? false,
    };

    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`Container element #${options.containerId} not found`);
    }
    this.container = container as HTMLElement;

    this.allData = [...this.options.data];
    this.filteredData = [...this.allData];
    this.paginationState.total = this.filteredData.length;

    this.init();
  }

  private init(): void {
    this.renderContainer();
    this.renderHeader();
    this.renderBody();
    if (this.options.pagination) {
      this.renderPagination();
    }
    this.setupEventListeners();
    this.setupResizeObserver();
  }

  private get theme() {
    return BunTable.THEMES[this.options.theme];
  }

  private renderContainer(): void {
    const theme = this.theme;
    this.container.innerHTML = '';
    this.container.className = 'bun-table-container';
    Object.assign(this.container.style, {
      backgroundColor: theme.background,
      borderRadius: '8px',
      overflow: 'hidden',
      border: `1px solid ${theme.border}`,
    });
  }

  private renderHeader(): void {
    const table = document.createElement('table');
    table.className = 'bun-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    this.headerRow = document.createElement('tr');

    if (this.options.selectable) {
      const th = document.createElement('th');
      th.style.width = '40px';
      th.style.padding = this.getPadding();
      th.innerHTML = `
        <input type="checkbox" 
          id="bun-table-select-all"
          class="bun-table-checkbox"
          style="cursor: pointer;"
        >
      `;
      this.headerRow.appendChild(th);
    }

    for (const column of this.options.columns) {
      const th = document.createElement('th');
      th.style.width = column.width || 'auto';
      th.style.textAlign = column.align || 'left';
      th.style.padding = this.getPadding();
      th.style.color = theme.textSecondary;
      th.style.fontSize = '12px';
      th.style.fontWeight = '600';
      th.style.textTransform = 'uppercase';
      th.style.letterSpacing = '0.05em';
      th.style.borderBottom = `1px solid ${theme.border}`;
      th.style.whiteSpace = 'nowrap';

      const content = document.createElement('div');
      content.style.display = 'flex';
      content.style.alignItems = 'center';
      content.style.gap = '6px';

      const label = document.createElement('span');
      label.textContent = column.label;
      content.appendChild(label);

      if (this.options.sortable && column.sortable !== false) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'bun-sort-icon';
        sortIcon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
          </svg>
        `;
        sortIcon.style.opacity = '0.3';
        sortIcon.style.transition = 'opacity 0.2s';
        sortIcon.dataset.key = column.key;
        this.sortIcons.set(column.key, sortIcon);
        content.appendChild(sortIcon);

        th.style.cursor = 'pointer';
        th.onclick = () => this.handleSort(column.key);
      }

      th.appendChild(content);
      this.headerRow.appendChild(th);
    }

    const actionsTh = document.createElement('th');
    actionsTh.style.width = '120px';
    actionsTh.style.padding = this.getPadding();
    actionsTh.style.borderBottom = `1px solid ${theme.border}`;
    actionsTh.textContent = 'Actions';
    actionsTh.style.color = theme.textSecondary;
    actionsTh.style.fontSize = '12px';
    actionsTh.style.fontWeight = '600';
    actionsTh.style.textTransform = 'uppercase';
    actionsTh.style.textAlign = 'center';
    this.headerRow.appendChild(actionsTh);

    thead.appendChild(this.headerRow);
    table.appendChild(thead);
    this.container.appendChild(table);
  }

  private renderBody(): void {
    let table = this.container.querySelector('table') as HTMLTableElement;
    let tbody = table?.querySelector('tbody') as HTMLTableSectionElement;

    if (tbody) {
      tbody.remove();
    }

    tbody = document.createElement('tbody');
    tbody.className = 'bun-table-body';

    const start = (this.paginationState.page - 1) * this.paginationState.perPage;
    const end = start + this.paginationState.perPage;
    const pageData = this.filteredData.slice(start, end);

    for (let i = 0; i < pageData.length; i++) {
      const rowData = pageData[i];
      const globalIndex = start + i;
      const tr = this.createRow(rowData, globalIndex);
      tbody.appendChild(tr);
    }

    if (pageData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="${this.options.columns.length + (this.options.selectable ? 1 : 0) + 1}" 
          style="padding: 48px; text-align: center; color: ${this.theme.textSecondary};">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5;">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <span style="font-size: 14px;">No packages found</span>
          </div>
        </td>
      `;
      tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);
    this.bodyElement = tbody;
  }

  private createRow(rowData: Record<string, any>, index: number): HTMLTableRowElement {
    const theme = this.theme;
    const tr = document.createElement('tr');
    tr.dataset.index = index.toString();
    tr.style.transition = 'background-color 0.15s';

    if (this.options.selectable && this.selectedRows.has(index)) {
      tr.style.backgroundColor = theme.selected;
    } else if (this.options.striped && index % 2 === 1) {
      tr.style.backgroundColor = theme.surface;
    }

    if (this.options.hoverable) {
      tr.onmouseenter = () => {
        if (!this.selectedRows.has(index)) {
          tr.style.backgroundColor = theme.hover;
        }
      };
      tr.onmouseleave = () => {
        if (!this.selectedRows.has(index)) {
          if (this.options.striped && index % 2 === 1) {
            tr.style.backgroundColor = theme.surface;
          } else {
            tr.style.backgroundColor = 'transparent';
          }
        }
      };
    }

    if (this.options.selectable) {
      const td = document.createElement('td');
      td.style.padding = this.getPadding();
      td.innerHTML = `
        <input type="checkbox" 
          class="bun-table-checkbox"
          data-index="${index}"
          ${this.selectedRows.has(index) ? 'checked' : ''}
          style="cursor: pointer;"
        >
      `;
      tr.appendChild(td);
    }

    for (const column of this.options.columns) {
      const td = document.createElement('td');
      td.style.padding = this.getPadding();
      td.style.color = theme.text;
      td.style.fontSize = '14px';
      td.style.borderBottom = `1px solid ${theme.border}`;
      td.style.verticalAlign = 'middle';

      if (column.align) {
        td.style.textAlign = column.align;
      }

      const value = rowData[column.key];
      if (column.render) {
        const rendered = column.render(value, rowData, index);
        if (typeof rendered === 'string') {
          td.innerHTML = rendered;
        } else {
          td.appendChild(rendered);
        }
      } else {
        td.textContent = value !== undefined ? String(value) : '-';
      }

      tr.appendChild(td);
    }

    const actionsTd = document.createElement('td');
    actionsTd.style.padding = this.getPadding();
    actionsTd.style.borderBottom = `1px solid ${theme.border}`;
    actionsTd.style.textAlign = 'center';
    actionsTd.innerHTML = this.renderActions(rowData);
    tr.appendChild(actionsTd);

    tr.onclick = (e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') {
        this.emit('row:click', rowData, index);
      }
    };

    return tr;
  }

  private renderActions(rowData: Record<string, any>): string {
    const theme = this.theme;
    return `
      <div style="display: flex; gap: 4px; justify-content: center;">
        <button 
          class="bun-table-action-btn"
          data-action="install"
          title="Copy install command"
          style="
            padding: 6px 10px;
            border: 1px solid ${theme.border};
            border-radius: 6px;
            background: ${theme.background};
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onmouseenter="this.style.background='${theme.hover}'"
          onmouseleave="this.style.background='${theme.background}'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${theme.primary}" stroke-width="2">
            <path d="M12 2v14M8 6l4-4 4 4M8 18l4 4 4-4"/>
          </svg>
        </button>
        <button 
          class="bun-table-action-btn"
          data-action="view"
          title="View details"
          style="
            padding: 6px 10px;
            border: 1px solid ${theme.border};
            border-radius: 6px;
            background: ${theme.background};
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onmouseenter="this.style.background='${theme.hover}'"
          onmouseleave="this.style.background='${theme.background}'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${theme.accent}" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button 
          class="bun-table-action-btn"
          data-action="history"
          title="Version history"
          style="
            padding: 6px 10px;
            border: 1px solid ${theme.border};
            border-radius: 6px;
            background: ${theme.background};
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onmouseenter="this.style.background='${theme.hover}'"
          onmouseleave="this.style.background='${theme.background}'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${theme.secondary}" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      </div>
    `;
  }

  private renderPagination(): void {
    let paginationContainer = this.container.querySelector('.bun-pagination') as HTMLDivElement;
    if (paginationContainer) {
      paginationContainer.remove();
    }

    paginationContainer = document.createElement('div');
    paginationContainer.className = 'bun-pagination';
    const theme = this.theme;

    Object.assign(paginationContainer.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: `1px solid ${theme.border}`,
      backgroundColor: theme.surface,
      flexWrap: 'wrap',
      gap: '12px',
    });

    const totalPages = Math.ceil(this.paginationState.total / this.paginationState.perPage);

    const leftSection = document.createElement('div');
    leftSection.style.display = 'flex';
    leftSection.style.alignItems = 'center';
    leftSection.style.gap = '12px';

    const perPageSelect = document.createElement('select');
    perPageSelect.style.padding = '6px 10px';
    perPageSelect.style.border = `1px solid ${theme.border}`;
    perPageSelect.style.borderRadius = '6px';
    perPageSelect.style.fontSize = '13px';
    perPageSelect.style.backgroundColor = theme.background;
    perPageSelect.style.color = theme.text;
    perPageSelect.style.cursor = 'pointer';
    [10, 25, 50, 100].forEach((n) => {
      const opt = document.createElement('option');
      opt.value = n.toString();
      opt.textContent = `${n} per page`;
      if (n === this.paginationState.perPage) opt.selected = true;
      perPageSelect.appendChild(opt);
    });
    perPageSelect.onchange = () => {
      this.setPerPage(parseInt(perPageSelect.value));
    };
    leftSection.appendChild(perPageSelect);

    const info = document.createElement('span');
    const start = (this.paginationState.page - 1) * this.paginationState.perPage + 1;
    const end = Math.min(
      this.paginationState.page * this.paginationState.perPage,
      this.paginationState.total
    );
    info.textContent =
      this.paginationState.total > 0
        ? `${start}-${end} of ${this.paginationState.total}`
        : '0 items';
    info.style.fontSize = '13px';
    info.style.color = theme.textSecondary;
    leftSection.appendChild(info);

    const rightSection = document.createElement('div');
    rightSection.style.display = 'flex';
    rightSection.style.gap = '4px';

    const createPageBtn = (
      page: number,
      label: string | number,
      disabled = false
    ): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.textContent = label.toString();
      btn.style.padding = '6px 12px';
      btn.style.border = 'none';
      btn.style.borderRadius = '6px';
      btn.style.fontSize = '13px';
      btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
      btn.style.transition = 'all 0.15s';

      if (disabled) {
        btn.style.opacity = '0.4';
        btn.style.backgroundColor = 'transparent';
      } else {
        btn.style.backgroundColor = theme.background;
        btn.style.color = theme.text;
        btn.onmouseenter = () => (btn.style.backgroundColor = theme.hover);
        btn.onmouseleave = () => (btn.style.backgroundColor = theme.background);
        if (page === this.paginationState.page) {
          btn.style.backgroundColor = theme.primary;
          btn.style.color = 'white';
          btn.onmouseenter = () => {};
          btn.onmouseleave = () => {};
        }
      }

      btn.onclick = () => {
        if (!disabled && page !== this.paginationState.page) {
          this.setPage(page);
        }
      };

      return btn;
    };

    rightSection.appendChild(createPageBtn(1, '«', this.paginationState.page === 1));
    rightSection.appendChild(
      createPageBtn(this.paginationState.page - 1, '‹', this.paginationState.page === 1)
    );

    const pageWindow = 2;
    let startPage = Math.max(1, this.paginationState.page - pageWindow);
    let endPage = Math.min(totalPages, this.paginationState.page + pageWindow);

    if (startPage > 1) {
      rightSection.appendChild(createPageBtn(1, '1'));
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.padding = '6px 8px';
        ellipsis.style.color = theme.textSecondary;
        rightSection.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      rightSection.appendChild(createPageBtn(i, i));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.padding = '6px 8px';
        ellipsis.style.color = theme.textSecondary;
        rightSection.appendChild(ellipsis);
      }
      rightSection.appendChild(createPageBtn(totalPages, totalPages.toString()));
    }

    rightSection.appendChild(
      createPageBtn(this.paginationState.page + 1, '›', this.paginationState.page === totalPages)
    );
    rightSection.appendChild(
      createPageBtn(totalPages, '»', this.paginationState.page === totalPages)
    );

    paginationContainer.appendChild(leftSection);
    paginationContainer.appendChild(rightSection);
    this.container.appendChild(paginationContainer);
  }

  private renderFilter(): void {
    let filterContainer = this.container.querySelector('.bun-filter') as HTMLDivElement;
    if (filterContainer) {
      filterContainer.remove();
    }

    if (!this.options.filterable) return;

    filterContainer = document.createElement('div');
    filterContainer.className = 'bun-filter';
    const theme = this.theme;

    Object.assign(filterContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderBottom: `1px solid ${theme.border}`,
      backgroundColor: theme.surface,
    });

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search packages...';
    searchInput.value = this.filterQuery;
    Object.assign(searchInput.style, {
      flex: '1',
      padding: '10px 14px',
      border: `1px solid ${theme.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: theme.background,
      color: theme.text,
      outline: 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    });
    searchInput.onfocus = () => {
      searchInput.style.borderColor = theme.primary;
      searchInput.style.boxShadow = `0 0 0 3px ${theme.primary}20`;
    };
    searchInput.onblur = () => {
      searchInput.style.borderColor = theme.border;
      searchInput.style.boxShadow = 'none';
    };

    let debounceTimer: ReturnType<typeof setTimeout>;
    searchInput.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filterQuery = searchInput.value;
        this.applyFilter();
        this.emit('filter:change', this.filterQuery);
      }, 300);
    };

    const searchIcon = document.createElement('div');
    searchIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${theme.textSecondary}" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
    `;
    searchIcon.style.position = 'absolute';
    searchIcon.style.marginLeft = '12px';

    const inputWrapper = document.createElement('div');
    inputWrapper.style.position = 'relative';
    inputWrapper.style.flex = '1';
    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(searchInput);

    filterContainer.appendChild(inputWrapper);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.padding = '8px 16px';
    clearBtn.style.border = `1px solid ${theme.border}`;
    clearBtn.style.borderRadius = '6px';
    clearBtn.style.fontSize = '13px';
    clearBtn.style.backgroundColor = theme.background;
    clearBtn.style.color = theme.text;
    clearBtn.style.cursor = 'pointer';
    clearBtn.onclick = () => {
      searchInput.value = '';
      this.filterQuery = '';
      this.applyFilter();
      this.emit('filter:change', '');
    };
    clearBtn.onmouseenter = () => (clearBtn.style.backgroundColor = theme.hover);
    clearBtn.onmouseleave = () => (clearBtn.style.backgroundColor = theme.background);

    if (!this.filterQuery) {
      clearBtn.style.opacity = '0.5';
      clearBtn.style.pointerEvents = 'none';
    }

    filterContainer.appendChild(clearBtn);
    this.container.insertBefore(filterContainer, this.container.querySelector('table'));
  }

  private getPadding(): string {
    return this.options.compact ? '8px 12px' : '12px 16px';
  }

  private handleSort(key: string): void {
    if (!this.options.sortable) return;

    if (this.sortState.key === key) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.key = key;
      this.sortState.direction = 'asc';
    }

    this.updateSortIcons();
    this.applySort();
    this.emit('sort:change', this.sortState);
  }

  private updateSortIcons(): void {
    for (const [key, icon] of this.sortIcons) {
      if (key === this.sortState.key) {
        icon.style.opacity = '1';
        icon.style.color = this.theme.primary;
        icon.innerHTML =
          this.sortState.direction === 'asc'
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M12 19V5M7 10l-5 5 5 5M17 10l5 5-5-5"/>
             </svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M12 5v14M7 14l-5-5 5-5M17 14l5-5-5-5"/>
             </svg>`;
      } else {
        icon.style.opacity = '0.3';
        icon.style.color = '';
        icon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
          </svg>
        `;
      }
    }
  }

  private applySort(): void {
    if (!this.sortState.key) return;

    this.filteredData.sort((a, b) => {
      const aVal = a[this.sortState.key];
      const bVal = b[this.sortState.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return this.sortState.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    this.renderBody();
    if (this.options.pagination) {
      this.renderPagination();
    }
  }

  private applyFilter(): void {
    if (!this.filterQuery) {
      this.filteredData = [...this.allData];
    } else {
      const query = this.filterQuery.toLowerCase();
      this.filteredData = this.allData.filter((row) => {
        return this.options.columns.some((col) => {
          const val = row[col.key];
          return val && String(val).toLowerCase().includes(query);
        });
      });
    }

    this.paginationState.total = this.filteredData.length;
    this.paginationState.page = 1;

    if (this.sortState.key) {
      this.applySort();
    } else {
      this.renderBody();
    }

    if (this.options.pagination) {
      this.renderPagination();
    }
  }

  private setupEventListeners(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('.bun-table-action-btn') as HTMLButtonElement;
      const checkbox = target.closest('.bun-table-checkbox') as HTMLInputElement;

      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const row = this.container.querySelector('tr');
        if (row && this.bodyElement) {
          const index = parseInt(row.dataset.index || '0');
          const rowData =
            this.filteredData[
              (this.paginationState.page - 1) * this.paginationState.perPage + index
            ];
          if (rowData) {
            this.emit('row:action', action, rowData);
          }
        }
      }

      if (checkbox) {
        if (checkbox.id === 'bun-table-select-all') {
          const checked = checkbox.checked;
          const checkboxes = this.container.querySelectorAll('.bun-table-checkbox[data-index]');
          checkboxes.forEach((cb: any) => {
            cb.checked = checked;
            const idx = parseInt(cb.dataset.index);
            if (checked) {
              this.selectedRows.add(idx);
            } else {
              this.selectedRows.delete(idx);
            }
          });
          this.emit('selection:change', this.getSelectedRows());
        } else {
          const idx = parseInt(checkbox.dataset.index);
          if (checkbox.checked) {
            this.selectedRows.add(idx);
          } else {
            this.selectedRows.delete(idx);
          }

          const allCheckbox = document.getElementById('bun-table-select-all') as HTMLInputElement;
          if (allCheckbox) {
            const totalOnPage = this.filteredData.slice(
              (this.paginationState.page - 1) * this.paginationState.perPage,
              this.paginationState.page * this.paginationState.perPage
            ).length;
            allCheckbox.checked = this.selectedRows.size >= totalOnPage;
            allCheckbox.indeterminate =
              this.selectedRows.size > 0 && this.selectedRows.size < totalOnPage;
          }

          this.emit('selection:change', this.getSelectedRows());
        }
      }
    });
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.adjustColumnWidths();
      });
      this.resizeObserver.observe(this.container);
    }
  }

  private adjustColumnWidths(): void {
    // Placeholder for responsive column adjustments
  }

  public setData(data: Record<string, any>[]): void {
    this.allData = [...data];
    this.filteredData = [...data];
    this.paginationState.total = data.length;
    this.paginationState.page = 1;
    this.filterQuery = '';
    this.sortState = { key: '', direction: 'asc' };
    this.selectedRows.clear();
    this.renderBody();
    if (this.options.pagination) {
      this.renderPagination();
    }
    this.updateSortIcons();
  }

  public addRow(row: Record<string, any>): void {
    this.allData.push(row);
    this.filteredData.push(row);
    this.paginationState.total = this.filteredData.length;
    this.renderBody();
    if (this.options.pagination) {
      this.renderPagination();
    }
  }

  public removeRow(key: string, value: any): void {
    const idx = this.allData.findIndex((row) => row[key] === value);
    if (idx !== -1) {
      this.allData.splice(idx, 1);
      this.filteredData = this.allData.filter((row) => {
        return this.filterQuery
          ? this.options.columns.some((col) =>
              String(row[col.key]).toLowerCase().includes(this.filterQuery.toLowerCase())
            )
          : true;
      });
      this.paginationState.total = this.filteredData.length;
      this.renderBody();
      if (this.options.pagination) {
        this.renderPagination();
      }
    }
  }

  public updateRow(key: string, value: any, updates: Record<string, any>): void {
    const idx = this.allData.findIndex((row) => row[key] === value);
    if (idx !== -1) {
      Object.assign(this.allData[idx], updates);
      const filterIdx = this.filteredData.findIndex((row) => row[key] === value);
      if (filterIdx !== -1) {
        Object.assign(this.filteredData[filterIdx], updates);
      }
      this.renderBody();
    }
  }

  public setPage(page: number): void {
    const totalPages = Math.ceil(this.paginationState.total / this.paginationState.perPage);
    if (page < 1 || page > totalPages) return;
    this.paginationState.page = page;
    this.renderBody();
    this.renderPagination();
    this.emit('page:change', page);
    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public setPerPage(perPage: number): void {
    this.paginationState.perPage = perPage;
    this.paginationState.page = 1;
    this.renderBody();
    this.renderPagination();
  }

  public setSort(key: string, direction: 'asc' | 'desc'): void {
    this.sortState = { key, direction };
    this.updateSortIcons();
    this.applySort();
  }

  public setFilter(query: string): void {
    this.filterQuery = query;
    this.applyFilter();
  }

  public getSelectedRows(): Record<string, any>[] {
    return Array.from(this.selectedRows).map((idx) => this.filteredData[idx]);
  }

  public selectAll(): void {
    const start = (this.paginationState.page - 1) * this.paginationState.perPage;
    const end = Math.min(start + this.paginationState.perPage, this.filteredData.length);
    for (let i = start; i < end; i++) {
      this.selectedRows.add(i);
    }
    this.renderBody();
    this.emit('selection:change', this.getSelectedRows());
  }

  public clearSelection(): void {
    this.selectedRows.clear();
    this.renderBody();
    this.emit('selection:change', []);
  }

  public invertSelection(): void {
    const start = (this.paginationState.page - 1) * this.paginationState.perPage;
    const end = Math.min(start + this.paginationState.perPage, this.filteredData.length);
    const newSelected = new Set<number>();
    for (let i = 0; i < this.filteredData.length; i++) {
      if (i < start || i >= end) {
        if (this.selectedRows.has(i)) newSelected.add(i);
      } else {
        if (!this.selectedRows.has(i)) newSelected.add(i);
      }
    }
    this.selectedRows = newSelected;
    this.renderBody();
    this.emit('selection:change', this.getSelectedRows());
  }

  public getSortState(): SortState {
    return { ...this.sortState };
  }

  public getFilterQuery(): string {
    return this.filterQuery;
  }

  public getPaginationState(): PaginationState {
    return { ...this.paginationState };
  }

  public getData(): Record<string, any>[] {
    return [...this.allData];
  }

  public refresh(): void {
    this.renderBody();
    if (this.options.pagination) {
      this.renderPagination();
    }
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.eventListeners.clear();
    this.container.innerHTML = '';
  }

  public on<K extends keyof TableEventMap>(event: K, handler: EventHandler<K>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  public off<K extends keyof TableEventMap>(event: K, handler: EventHandler<K>): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  private emit<K extends keyof TableEventMap>(
    event: K,
    ...args: Parameters<EventHandler<K>>
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        (handler as Function)(...args);
      } catch (error) {
        console.error(`Error in table event handler for ${event}:`, error);
      }
    });
  }
}

export default BunTable;
