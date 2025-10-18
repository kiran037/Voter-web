"use client";

type Props = {
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  allSelected: boolean;
  selectedCount: number;
  onToggleAll: (checked: boolean) => void;
  onClear: () => void;
  onOpenDeleteModal: () => void;
};

export default function SelectionToolbar({
  selectionMode,
  setSelectionMode,
  allSelected,
  selectedCount,
  onToggleAll,
  onClear,
  onOpenDeleteModal,
}: Props) {
  return !selectionMode ? (
    <div className="flex items-center justify-end px-3 sm:px-4 py-2 border-b bg-slate-50/60">
      <button
        onClick={() => setSelectionMode(true)}
        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
        type="button"
      >
        Delete multiple
      </button>
    </div>
  ) : (
    <div className="sticky top-0 z-[5] flex items-center justify-between px-3 sm:px-4 py-2 border-b bg-amber-50 border-amber-200">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-amber-300"
            checked={allSelected}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
          <span className="font-medium text-amber-900">Select all</span>
        </label>
        <span className="text-sm font-medium text-amber-900 hidden sm:inline">
          {selectedCount} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg border border-amber-300 text-sm hover:bg-amber-100"
          type="button"
        >
          Clear
        </button>
        <button
          onClick={onOpenDeleteModal}
          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 disabled:opacity-50"
          type="button"
          disabled={selectedCount === 0}
        >
          Delete Selected
        </button>
        <button
          onClick={() => {
            setSelectionMode(false);
            onClear();
          }}
          className="px-3 py-1.5 rounded-lg border border-amber-300 text-sm hover:bg-amber-100"
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
}
