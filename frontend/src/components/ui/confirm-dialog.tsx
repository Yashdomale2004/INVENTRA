import { Button } from "./button";
import { Card } from "./card";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <Card
        className="w-full max-w-sm rounded-3xl border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="h-11 rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
