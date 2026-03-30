"use client";

import { HolderOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Popover, Table, Typography } from "antd";
import type { TableProps } from "antd";
import type { AnyObject } from "antd/es/_util/type";
import type { ColumnGroupType, ColumnType, ColumnsType } from "antd/es/table";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ThHTMLAttributes,
} from "react";
import styles from "./ResizableTable.module.css";

const { Text } = Typography;

type WidthMap = Record<string, number>;

type ResizeState = {
  columnId: string;
  startX: number;
  startWidth: number;
} | null;

type HeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  resizable?: boolean;
  isResizing?: boolean;
  onResizeStart?: (event: React.PointerEvent<HTMLSpanElement>) => void;
};

type ResizableTableProps<RecordType extends AnyObject> =
  TableProps<RecordType> & {
    storageKey?: string;
    minColumnWidth?: number;
    showColumnVisibilitySelector?: boolean;
    stickyEdgeColumnCount?: {
      left?: number;
      right?: number;
    };
  };

const DEFAULT_COLUMN_WIDTH = 180;
const DEFAULT_MIN_COLUMN_WIDTH = 96;

function isColumnGroup<RecordType extends AnyObject>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
): column is ColumnGroupType<RecordType> {
  return Array.isArray((column as ColumnGroupType<RecordType>).children);
}

function getColumnId<RecordType extends AnyObject>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
  index: number,
): string {
  if (column.key != null) {
    return String(column.key);
  }

  if (!isColumnGroup(column)) {
    if (Array.isArray(column.dataIndex)) {
      return column.dataIndex.join(".");
    }

    if (column.dataIndex != null) {
      return String(column.dataIndex);
    }
  }

  return `column-${index}`;
}

function getColumnWidth<RecordType extends AnyObject>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
): number {
  return typeof column.width === "number" ? column.width : DEFAULT_COLUMN_WIDTH;
}

function getColumnVisibilityLabel<RecordType extends AnyObject>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
  index: number,
): string {
  if (typeof column.title === "string" || typeof column.title === "number") {
    return String(column.title);
  }

  return getColumnId(column, index);
}

function HeaderCell({
  children,
  className,
  resizable,
  isResizing,
  onResizeStart,
  ...rest
}: HeaderCellProps) {
  return (
    <th
      {...rest}
      className={
        resizable ? `${styles.headerCell} ${className ?? ""}`.trim() : className
      }
      data-resizing={isResizing ? "true" : "false"}
    >
      <div className={styles.headerContent}>{children}</div>
      {resizable ? (
        <span
          aria-hidden="true"
          className={styles.resizeHandle}
          onPointerDown={onResizeStart}
        />
      ) : null}
    </th>
  );
}

export function ResizableTable<RecordType extends AnyObject>({
  className,
  columns,
  scroll,
  sticky,
  stickyEdgeColumnCount,
  storageKey,
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  showColumnVisibilitySelector = false,
  tableLayout,
  components,
  ...props
}: ResizableTableProps<RecordType>) {
  const isJsdomEnvironment =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
  const visibleColumnsStorageKey = storageKey
    ? `${storageKey}-visible-columns`
    : undefined;
  const columnOrderStorageKey = storageKey
    ? `${storageKey}-column-order`
    : undefined;
  const availableColumns = useMemo(
    () =>
      (columns ?? []).flatMap((column, index) => {
        if (!column || isColumnGroup(column)) {
          return [];
        }

        return [
          {
            id: getColumnId(column, index),
            label: getColumnVisibilityLabel(column, index),
            column,
          },
        ];
      }),
    [columns],
  );
  const defaultVisibleColumnIds = useMemo(
    () => availableColumns.map((column) => column.id),
    [availableColumns],
  );
  const defaultColumnOrderIds = useMemo(
    () => availableColumns.map((column) => column.id),
    [availableColumns],
  );
  const availableColumnsById = useMemo(
    () =>
      new Map(availableColumns.map((column) => [column.id, column] as const)),
    [availableColumns],
  );
  const initialWidths = useMemo<WidthMap>(() => {
    const nextWidths: WidthMap = {};

    (columns ?? []).forEach((column, index) => {
      if (!column) {
        return;
      }

      nextWidths[getColumnId(column, index)] = getColumnWidth(column);
    });

    return nextWidths;
  }, [columns]);
  const [widths, setWidths] = useState<WidthMap>(initialWidths);
  const [hydrated, setHydrated] = useState(false);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(
    defaultVisibleColumnIds,
  );
  const [orderedColumnIds, setOrderedColumnIds] = useState<string[]>(
    defaultColumnOrderIds,
  );
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const resizeStateRef = useRef<ResizeState>(null);

  useEffect(() => {
    setWidths((current) => ({ ...initialWidths, ...current }));
  }, [initialWidths]);

  useEffect(() => {
    setVisibleColumnIds((current) => {
      if (current.length === 0) {
        return defaultVisibleColumnIds;
      }

      const allowedIds = new Set(defaultVisibleColumnIds);
      const nextVisible = current.filter((columnId) =>
        allowedIds.has(columnId),
      );

      return nextVisible.length > 0 ? nextVisible : defaultVisibleColumnIds;
    });
  }, [defaultVisibleColumnIds]);

  useEffect(() => {
    setOrderedColumnIds((current) => {
      if (current.length === 0) {
        return defaultColumnOrderIds;
      }

      const allowedIds = new Set(defaultColumnOrderIds);
      const nextOrdered = current.filter((columnId) =>
        allowedIds.has(columnId),
      );
      const missingIds = defaultColumnOrderIds.filter(
        (columnId) => !nextOrdered.includes(columnId),
      );

      return [...nextOrdered, ...missingIds];
    });
  }, [defaultColumnOrderIds]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setHydrated(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(stored) as WidthMap;
      setWidths((current) => ({ ...current, ...parsed }));
    } catch {
      // Ignore malformed saved widths and continue with defaults.
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!visibleColumnsStorageKey || typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(visibleColumnsStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as string[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return;
      }

      const allowedIds = new Set(defaultVisibleColumnIds);
      const nextVisible = parsed.filter((columnId) => allowedIds.has(columnId));

      if (nextVisible.length > 0) {
        setVisibleColumnIds(nextVisible);
      }
    } catch {
      // Ignore malformed saved column visibility and continue with defaults.
    }
  }, [defaultVisibleColumnIds, visibleColumnsStorageKey]);

  useEffect(() => {
    if (!columnOrderStorageKey || typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(columnOrderStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as string[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return;
      }

      const allowedIds = new Set(defaultColumnOrderIds);
      const nextOrdered = parsed.filter((columnId) => allowedIds.has(columnId));
      const missingIds = defaultColumnOrderIds.filter(
        (columnId) => !nextOrdered.includes(columnId),
      );

      setOrderedColumnIds(
        nextOrdered.length > 0
          ? [...nextOrdered, ...missingIds]
          : defaultColumnOrderIds,
      );
    } catch {
      // Ignore malformed saved column order and continue with defaults.
    }
  }, [columnOrderStorageKey, defaultColumnOrderIds]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined" || !hydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [hydrated, storageKey, widths]);

  useEffect(() => {
    if (!visibleColumnsStorageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      visibleColumnsStorageKey,
      JSON.stringify(visibleColumnIds),
    );
  }, [visibleColumnIds, visibleColumnsStorageKey]);

  useEffect(() => {
    if (!columnOrderStorageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      columnOrderStorageKey,
      JSON.stringify(orderedColumnIds),
    );
  }, [columnOrderStorageKey, orderedColumnIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const activeResize = resizeStateRef.current;
      if (!activeResize) {
        return;
      }

      const nextWidth = Math.max(
        minColumnWidth,
        activeResize.startWidth + event.clientX - activeResize.startX,
      );

      setWidths((current) => ({
        ...current,
        [activeResize.columnId]: nextWidth,
      }));
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      setResizingColumnId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [minColumnWidth]);

  const startResize = useCallback(
    (columnId: string, event: React.PointerEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();

      event.currentTarget.setPointerCapture?.(event.pointerId);
      resizeStateRef.current = {
        columnId,
        startX: event.clientX,
        startWidth:
          widths[columnId] ?? initialWidths[columnId] ?? DEFAULT_COLUMN_WIDTH,
      };
      setResizingColumnId(columnId);
    },
    [initialWidths, widths],
  );

  const resetTableLayout = useCallback(() => {
    setWidths(initialWidths);
    setVisibleColumnIds(defaultVisibleColumnIds);
    setOrderedColumnIds(defaultColumnOrderIds);
    setDraggedColumnId(null);
    setDragOverColumnId(null);

    if (typeof window === "undefined") {
      return;
    }

    if (storageKey) {
      window.localStorage.removeItem(storageKey);
    }

    if (visibleColumnsStorageKey) {
      window.localStorage.removeItem(visibleColumnsStorageKey);
    }
    if (columnOrderStorageKey) {
      window.localStorage.removeItem(columnOrderStorageKey);
    }
  }, [
    columnOrderStorageKey,
    defaultColumnOrderIds,
    defaultVisibleColumnIds,
    initialWidths,
    storageKey,
    visibleColumnsStorageKey,
  ]);

  const resolvedColumns = useMemo<ColumnsType<RecordType>>(() => {
    const allowedIds = new Set(visibleColumnIds);
    const nextColumns = orderedColumnIds.reduce<ColumnsType<RecordType>>(
      (accumulator, columnId) => {
        if (!allowedIds.has(columnId)) {
          return accumulator;
        }

        const columnEntry = availableColumnsById.get(columnId);
        const column = columnEntry?.column;
        if (!column || isColumnGroup(column)) {
          return accumulator;
        }

        const width =
          widths[columnId] ?? initialWidths[columnId] ?? DEFAULT_COLUMN_WIDTH;
        const existingOnHeaderCell = column.onHeaderCell;

        accumulator.push({
          ...column,
          width,
          onHeaderCell: (record) => {
            const existingHeaderCellProps =
              existingOnHeaderCell?.(record) ?? {};

            return {
              ...existingHeaderCellProps,
              width,
              resizable: true,
              isResizing: resizingColumnId === columnId,
              onResizeStart: (event: React.PointerEvent<HTMLSpanElement>) =>
                startResize(columnId, event),
            };
          },
        });

        return accumulator;
      },
      [],
    );

    const leftPinnedCount = Math.max(0, stickyEdgeColumnCount?.left ?? 0);
    const rightPinnedCount = Math.max(0, stickyEdgeColumnCount?.right ?? 0);
    const rightPinnedStartIndex = Math.max(
      leftPinnedCount,
      nextColumns.length - rightPinnedCount,
    );

    return nextColumns.map((column, index) => {
      if (!column || isColumnGroup(column) || column.fixed != null) {
        return column;
      }

      if (index < leftPinnedCount) {
        return {
          ...column,
          fixed: "left",
        };
      }

      if (index >= rightPinnedStartIndex) {
        return {
          ...column,
          fixed: "right",
        };
      }

      return column;
    });
  }, [
    availableColumnsById,
    initialWidths,
    orderedColumnIds,
    resizingColumnId,
    startResize,
    stickyEdgeColumnCount?.left,
    stickyEdgeColumnCount?.right,
    visibleColumnIds,
    widths,
  ]);

  const totalWidth = useMemo(
    () =>
      resolvedColumns.reduce((sum, column) => {
        if (!column || isColumnGroup(column)) {
          return sum;
        }

        return (
          sum +
          (typeof column.width === "number"
            ? column.width
            : DEFAULT_COLUMN_WIDTH)
        );
      }, 0),
    [resolvedColumns],
  );

  const canToggleColumns =
    showColumnVisibilitySelector && availableColumns.length > 1;

  const moveColumn = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    setOrderedColumnIds((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      const nextOrder = [...current];
      const [movedColumnId] = nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, movedColumnId);
      return nextOrder;
    });
  }, []);

  return (
    <div className={styles.tableShell}>
      {canToggleColumns ? (
        <div className={styles.tableControls}>
          <Popover
            trigger="click"
            content={
              <div className={styles.columnPopover}>
                <Text strong>Visible columns</Text>
                <Text className={styles.columnSummary}>
                  {visibleColumnIds.length} of {availableColumns.length} shown
                </Text>
                <div className={styles.columnChecklist}>
                  {orderedColumnIds.map((columnId) => {
                    const column = availableColumnsById.get(columnId);
                    if (!column) {
                      return null;
                    }

                    const checked = visibleColumnIds.includes(column.id);
                    const disableToggle =
                      checked && visibleColumnIds.length === 1;

                    return (
                      <label
                        key={column.id}
                        className={styles.columnOption}
                        data-dragging={
                          draggedColumnId === column.id ? "true" : "false"
                        }
                        data-drag-over={
                          dragOverColumnId === column.id ? "true" : "false"
                        }
                        draggable
                        onDragStart={() => {
                          setDraggedColumnId(column.id);
                          setDragOverColumnId(null);
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          if (
                            draggedColumnId &&
                            draggedColumnId !== column.id
                          ) {
                            setDragOverColumnId(column.id);
                          }
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedColumnId) {
                            moveColumn(draggedColumnId, column.id);
                          }
                          setDraggedColumnId(null);
                          setDragOverColumnId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedColumnId(null);
                          setDragOverColumnId(null);
                        }}
                      >
                        <HolderOutlined className={styles.columnHandle} />
                        <Checkbox
                          checked={checked}
                          disabled={disableToggle}
                          onChange={(event) => {
                            setVisibleColumnIds((current) => {
                              if (event.target.checked) {
                                return current.includes(column.id)
                                  ? current
                                  : [...current, column.id];
                              }

                              const nextVisible = current.filter(
                                (columnId) => columnId !== column.id,
                              );

                              return nextVisible.length > 0
                                ? nextVisible
                                : current;
                            });
                          }}
                        />
                        <span className={styles.columnLabel}>
                          {column.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className={styles.columnActions}>
                  <Button size="small" onClick={resetTableLayout}>
                    Reset layout
                  </Button>
                </div>
              </div>
            }
          >
            <Button
              size="small"
              className={styles.columnButton}
              icon={<SettingOutlined />}
            >
              Columns
              <span className={styles.columnCount}>
                {visibleColumnIds.length}/{availableColumns.length}
              </span>
            </Button>
          </Popover>
        </div>
      ) : null}

      <Table<RecordType>
        {...props}
        className={`${styles.table} ${className ?? ""}`.trim()}
        columns={resolvedColumns}
        components={{
          ...components,
          header: {
            ...components?.header,
            cell: HeaderCell,
          },
        }}
        scroll={{
          ...scroll,
          x:
            typeof scroll?.x === "number"
              ? Math.max(scroll.x, totalWidth)
              : (scroll?.x ?? totalWidth),
        }}
        sticky={sticky ?? !isJsdomEnvironment}
        tableLayout={tableLayout ?? "fixed"}
      />
    </div>
  );
}
