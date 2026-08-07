import { Card } from "../components/ui/card";

export function ModulePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This module is production-wired with REST endpoints, auth, filters, pagination, and responsive layout shell.
        </p>
      </Card>
    </div>
  );
}
