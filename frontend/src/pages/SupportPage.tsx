import { Phone } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Contact Support</h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Reach out to our support team for help with Inventra, inventory, parcels, or account issues.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            <Phone className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Support</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Need help? We're here for you.</h2>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          <p>
            Support Number: <span className="font-semibold text-slate-900 dark:text-slate-100">8483030945</span>
          </p>
          <p>Call our support line for fast assistance with inventory management, parcel tracking, and account issues.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="tel:8483030945"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Phone className="h-4 w-4" /> Call Support
            </a>
            <Button type="button" variant="outline" className="w-full justify-center gap-2">
              Send Email
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
