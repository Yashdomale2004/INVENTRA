import { ShieldCheck } from "lucide-react";
import { Card } from "../components/ui/card";

export function PrivacyPolicyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Privacy Policy</h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Your data is protected in Inventra. This policy explains how we handle account, inventory, and tracking information.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Privacy & Security</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your information stays safe</h2>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Account Information</h3>
            <p>We store user account details securely using Supabase Auth and encrypted storage. Your login credentials are protected and never shared without your consent.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Inventory & Order Data</h3>
            <p>Inventory levels, order records, and enquiry history are private and accessible only to authorized users of your organization.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Tracking Information</h3>
            <p>Shipment tracking details are used solely to provide live delivery updates and parcel status within the app.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Data Sharing</h3>
            <p>Inventra does not share user data with third parties without explicit permission. Shared access is only granted through your authenticated account.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Secure Authentication</h3>
            <p>We rely on secure authentication mechanisms and the latest Supabase protections to keep your user data safe.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
