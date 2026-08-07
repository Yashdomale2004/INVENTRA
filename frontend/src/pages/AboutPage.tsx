import { Info } from "lucide-react";
import { Card } from "../components/ui/card";

export function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">About Inventra</h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Discover how Inventra helps manage stock, orders, enquiries, parcel tracking, and delivery status from a single dashboard.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            <Info className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Inventra</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Inventory & Parcel Tracking Simplified</h2>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          <p>
            Inventra is an Inventory & Parcel Tracking application designed to manage T-shirt stock, customer enquiries, order processing,
            inventory updates, parcel tracking, and delivery status in one place.
          </p>
          <p>
            The app provides real-time stock updates from Stock Up and helps manage the complete order workflow efficiently, from
            stock receipt to shipment delivery.
          </p>
          <p>
            Built for speed, transparency, and operational control, Inventra centralizes stock movements, order progress, and tracking
            activity for every parcel.
          </p>
        </div>
      </Card>
    </div>
  );
}
