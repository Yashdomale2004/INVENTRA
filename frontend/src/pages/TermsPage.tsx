import { FileText } from "lucide-react";
import { Card } from "../components/ui/card";

export function TermsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Terms & Conditions</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Review the responsibilities, security expectations, and legal terms for using Inventra to manage inventory, orders, and parcel tracking.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-3xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Legal</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Terms for Using Inventra</h2>
          </div>
        </div>

        <div className="mt-6 space-y-6 text-sm leading-7 text-slate-600 dark:text-slate-300">
          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">1. Acceptance of Terms</h3>
            <p>
              By accessing or using Inventra, you acknowledge that you have read, understood, and agreed to these terms and conditions. The platform is provided to authorized personnel for inventory, order, and shipment management.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">2. User Responsibilities</h3>
            <p>
              Users are responsible for lawful access and appropriate use of the application. Do not share credentials, impersonate other users, or use Inventra in a way that violates your organization’s policies.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">3. Inventory & Order Management</h3>
            <p>
              Accurate inventory counts, order updates, and parcel tracking details are essential. You must keep product, stock, and delivery status information current to support reliable business operations.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">4. Account Security</h3>
            <p>
              Maintain strong account security by using unique passwords and safeguarding your login details. Immediately report any suspicious activity or unauthorized access to your administrator or support team.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">5. Data Privacy</h3>
            <p>
              Inventra handles inventory, order, and user data in accordance with our privacy practices. Your information is used solely to provide the services and features of the application.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">6. Limitation of Liability</h3>
            <p>
              Inventra is provided on an "as is" basis. The platform and its operators are not liable for indirect losses, data entry errors, missed updates, or decisions made based on the information presented here.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">7. Contact Information</h3>
            <p>
              For questions about these terms or support issues, contact our customer service team at <span className="font-semibold text-slate-900 dark:text-slate-100">+91 8483030945</span>.
            </p>
          </section>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Last Updated</p>
          <p>August 3, 2026</p>
        </div>
      </Card>
    </div>
  );
}
