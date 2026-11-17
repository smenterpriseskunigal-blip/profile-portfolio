import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import type { CollectionEntityKey } from '../../lib/firestoreStore.ts';
import type { BaseEntity } from '../../types/portfolio.ts';

interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'lines' | 'csv' | 'number' | 'checkbox';
  required?: boolean;
}

interface CollectionCrudPanelProps<T extends BaseEntity> {
  entityKey: CollectionEntityKey;
  title: string;
  items: T[];
  fields: FieldSpec[];
  getTitle: (item: T) => string;
  getSubtitle: (item: T) => string;
  createBlank: (order: number) => T;
  onSave: (item: T, isNew: boolean) => Promise<void>;
  onSoftDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onHardDelete: (id: string) => Promise<void>;
  onReorder: (ordered: T[]) => Promise<void>;
}

export function CollectionCrudPanel<T extends BaseEntity>({
  title,
  items,
  fields,
  getTitle,
  getSubtitle,
  createBlank,
  onSave,
  onSoftDelete,
  onRestore,
  onHardDelete,
  onReorder,
}: CollectionCrudPanelProps<T>) {
  const [editing, setEditing] = useState<{ item: T; isNew: boolean } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const activeItems = items
    .filter((i) => (showTrash ? Boolean(i.deletedAt) : !i.deletedAt))
    .sort((a, b) => a.order - b.order);

  const handleFieldChange = (key: string, type: FieldSpec['type'], rawVal: unknown) => {
    if (!editing) return;
    const next = { ...editing.item } as Record<string, unknown>;
    if (type === 'lines') {
      next[key] = String(rawVal)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (type === 'csv') {
      next[key] = String(rawVal)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (type === 'number') {
      next[key] = Number(rawVal) || 0;
    } else if (type === 'checkbox') {
      next[key] = Boolean(rawVal);
    } else {
      next[key] = String(rawVal);
    }
    setEditing({ ...editing, item: next as T });
  };

  const getFieldValue = (item: T, key: string, type: FieldSpec['type']): string | number | boolean => {
    const val = (item as unknown as Record<string, unknown>)[key];
    if (type === 'lines' && Array.isArray(val)) return val.join('\n');
    if (type === 'csv' && Array.isArray(val)) return val.join(', ');
    if (type === 'number') return Number(val ?? 0);
    if (type === 'checkbox') return Boolean(val);
    return String(val ?? '');
  };

  const handleMove = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= activeItems.length || fromIdx === toIdx) return;
    const copy = [...activeItems];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    await onReorder(copy);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await onSave(editing.item, editing.isNew);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--bp-ink)]">{title}</h3>
          <p className="font-mono text-xs text-[var(--bp-ink-muted)] tabular-nums">
            {items.filter((i) => !i.deletedAt).length} active · {items.filter((i) => Boolean(i.deletedAt)).length} in trash
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTrash((t) => !t)}
            className="border border-[var(--bp-line)] px-3 py-2 font-mono text-xs text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)]"
          >
            {showTrash ? 'View Active' : 'View Trash'}
          </button>
          <button
            type="button"
            onClick={() => setEditing({ item: createBlank(activeItems.length), isNew: true })}
            className="inline-flex items-center gap-1.5 bg-[var(--bp-accent)] px-3.5 py-2 font-mono text-xs font-semibold text-[var(--bp-accent-fg)]"
          >
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>
      </div>

      {/* Editor Modal / Panel */}
      {editing && (
        <form
          onSubmit={submitForm}
          className="border border-[var(--bp-accent)] bg-[var(--bp-surface-solid)] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--bp-line)] pb-3">
            <h4 className="font-mono text-xs font-semibold uppercase text-[var(--bp-accent)]">
              {editing.isNew ? `Create ${title}` : `Edit ${title}`}
            </h4>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="font-mono text-xs text-[var(--bp-ink-muted)] hover:underline"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => {
              const val = getFieldValue(editing.item, f.key, f.type);
              if (f.type === 'checkbox') {
                return (
                  <label key={f.key} className="flex items-center gap-2 font-mono text-xs text-[var(--bp-ink)] pt-4">
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => handleFieldChange(f.key, f.type, e.target.checked)}
                      className="h-4 w-4 accent-[var(--bp-accent)]"
                    />
                    {f.label}
                  </label>
                );
              }
              if (f.type === 'textarea' || f.type === 'lines') {
                return (
                  <label key={f.key} className="block sm:col-span-2">
                    <span className="font-mono text-xs text-[var(--bp-ink-muted)]">
                      {f.label} {f.type === 'lines' ? '(one item per line)' : ''}
                    </span>
                    <textarea
                      rows={4}
                      required={f.required}
                      value={String(val)}
                      onChange={(e) => handleFieldChange(f.key, f.type, e.target.value)}
                      className="mt-1 w-full border border-[var(--bp-line)] bg-transparent p-2.5 text-sm text-[var(--bp-ink)]"
                    />
                  </label>
                );
              }
              return (
                <label key={f.key} className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">{f.label}</span>
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    required={f.required}
                    value={String(val)}
                    onChange={(e) => handleFieldChange(f.key, f.type, e.target.value)}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-[var(--bp-line)] px-4 py-2 font-mono text-xs text-[var(--bp-ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-[var(--bp-accent)] px-5 py-2 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* List / DnD Table */}
      <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] divide-y divide-[var(--bp-line)]">
        {activeItems.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-[var(--bp-ink-muted)]">
            {showTrash ? 'Trash is empty.' : `No records in ${title}. Click "Add New" to create one.`}
          </div>
        ) : (
          activeItems.map((item, idx) => {
            const isFeatured = Boolean((item as unknown as { featured?: boolean }).featured);
            return (
              <div
                key={item.id}
                draggable={!showTrash}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async () => {
                  if (dragIndex !== null && dragIndex !== idx) {
                    await handleMove(dragIndex, idx);
                  }
                  setDragIndex(null);
                }}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-[var(--bp-line)]/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {!showTrash && (
                    <GripVertical className="h-4 w-4 text-[var(--bp-ink-muted)] cursor-grab shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--bp-ink)] truncate">
                      {getTitle(item)}
                    </p>
                    <p className="font-mono text-xs text-[var(--bp-ink-muted)] truncate">
                      {getSubtitle(item)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!showTrash ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, idx - 1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="border border-[var(--bp-line)] p-1.5 text-[var(--bp-ink-muted)] disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, idx + 1)}
                        disabled={idx === activeItems.length - 1}
                        aria-label="Move down"
                        className="border border-[var(--bp-line)] p-1.5 text-[var(--bp-ink-muted)] disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {'featured' in item && (
                        <button
                          type="button"
                          onClick={() => onSave({ ...item, featured: !isFeatured } as T, false)}
                          title="Toggle featured"
                          className={`border p-1.5 ${
                            isFeatured
                              ? 'border-[var(--bp-accent)] text-[var(--bp-accent)]'
                              : 'border-[var(--bp-line)] text-[var(--bp-ink-muted)]'
                          }`}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSave({ ...item, visible: !item.visible }, false)}
                        title={item.visible ? 'Hide on public site' : 'Show on public site'}
                        className="border border-[var(--bp-line)] p-1.5 text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)]"
                      >
                        {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditing({ item: structuredClone(item), isNew: false })}
                        className="border border-[var(--bp-line)] px-2.5 py-1 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onSoftDelete(item.id)}
                        title="Move to trash"
                        className="border border-[var(--bp-line)] p-1.5 text-rose-400 hover:border-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRestore(item.id)}
                        className="inline-flex items-center gap-1 border border-emerald-500/60 px-2.5 py-1 font-mono text-xs text-emerald-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                      {confirmDeleteId === item.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await onHardDelete(item.id);
                            setConfirmDeleteId(null);
                          }}
                          className="bg-rose-600 px-2.5 py-1 font-mono text-xs text-white"
                        >
                          Confirm Purge
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="border border-rose-500/60 px-2.5 py-1 font-mono text-xs text-rose-400"
                        >
                          Purge
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
