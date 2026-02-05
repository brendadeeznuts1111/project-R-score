import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import matrixConfig from '../../../config/matrix.toml' with { type: 'toml' };

export interface MatrixColumn {
  id: string;
  label: string;
  width: number;
  type: string;
  sortable?: boolean;
  filterable?: boolean;
}

export interface UseVirtualizedMatrixOptions {
  columnCount?: number;
  rowCount: number;
  scrollElementId?: string;
}

export interface VirtualizedMatrixResult {
  columns: MatrixColumn[];
  visibleRows: number[];
  totalHeight: number;
  visibleRange: { start: number; end: number };
  scrollToIndex: (index: number) => void;
  getColumnStyle: (column: MatrixColumn, index: number) => React.CSSProperties;
}

export function useVirtualizedMatrix(
  data: any[],
  options: UseVirtualizedMatrixOptions
): VirtualizedMatrixResult {
  const {
    columnCount = matrixConfig.virtualization['default-column-count'],
    rowCount = data.length,
    scrollElementId = 'matrix-scroll-container',
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const rowHeight = matrixConfig.virtualization['row-height'];
  const overscan = matrixConfig.virtualization.overscan;
  const totalHeight = rowCount * rowHeight;

  const columns = useMemo(() => {
    const allColumns: MatrixColumn[] = [];
    
    Object.entries(matrixConfig.columns || {}).forEach(([key, col]) => {
      const columnDef = col as Record<string, unknown>;
      allColumns.push({
        id: columnDef.id as string ?? key,
        label: columnDef.label as string ?? key,
        width: (columnDef.width as number) ?? 100,
        type: (columnDef.type as string) ?? 'string',
        sortable: columnDef.sortable as boolean ?? false,
        filterable: columnDef.filterable as boolean ?? false,
      });
    });

    if (columnCount === -1 || columnCount >= allColumns.length) {
      return allColumns;
    }

    return allColumns.slice(0, columnCount);
  }, [columnCount]);

  useEffect(() => {
    const updateDimensions = () => {
      const el = containerRef.current;
      if (el) {
        setContainerHeight(el.clientHeight);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleEnd = Math.min(
    rowCount,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleRows = useMemo(
    () =>
      Array.from({ length: visibleEnd - visibleStart }, (_, i) => visibleStart + i),
    [visibleStart, visibleEnd]
  );

  const visibleRange = useMemo(
    () => ({ start: visibleStart, end: visibleEnd }),
    [visibleStart, visibleEnd]
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = containerRef.current;
      if (!el) return;

      const scrollPosition = index * rowHeight;
      el.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    },
    [rowHeight]
  );

  const getColumnStyle = useCallback(
    (column: MatrixColumn, index: number): React.CSSProperties => {
      const isStickyFirst = matrixConfig.virtualization['sticky-first-column'] && index === 0;

      return {
        width: column.width,
        minWidth: column.width,
        maxWidth: column.width,
        flex: `0 0 ${column.width}px`,
        position: isStickyFirst ? 'sticky' : 'relative',
        left: isStickyFirst ? 0 : undefined,
        zIndex: isStickyFirst ? 10 : 1,
        backgroundColor: isStickyFirst ? 'inherit' : undefined,
      };
    },
    []
  );

  return {
    columns,
    visibleRows,
    totalHeight,
    visibleRange,
    scrollToIndex,
    getColumnStyle,
  };
}

export function useMatrixKeyboardNavigation(
  rowCount: number,
  rowHeight: number,
  containerRef: React.RefObject<HTMLElement>,
  onSelect?: (index: number) => void
) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const el = containerRef.current;
      if (!el) return;

      const currentScrollTop = el.scrollTop;
      const currentIndex = Math.floor(currentScrollTop / rowHeight);
      const lastIndex = rowCount - 1;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < lastIndex) {
            el.scrollTo({ top: (currentIndex + 1) * rowHeight, behavior: 'smooth' });
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            el.scrollTo({ top: (currentIndex - 1) * rowHeight, behavior: 'smooth' });
          }
          break;
        case 'PageDown':
          event.preventDefault();
          el.scrollTo({ top: currentScrollTop + el.clientHeight, behavior: 'smooth' });
          break;
        case 'PageUp':
          event.preventDefault();
          el.scrollTo({ top: currentScrollTop - el.clientHeight, behavior: 'smooth' });
          break;
        case 'Home':
          event.preventDefault();
          el.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          event.preventDefault();
          el.scrollTo({ top: rowCount * rowHeight, behavior: 'smooth' });
          break;
        case 'Enter':
        case ' ':
          if (onSelect && currentIndex >= 0) {
            event.preventDefault();
            onSelect(currentIndex);
          }
          break;
      }
    },
    [rowCount, rowHeight, containerRef, onSelect]
  );

  return { handleKeyDown };
}
