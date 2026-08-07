import { motion } from "framer-motion";

import { Card } from "../ui/card";

export function StatCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      </Card>
    </motion.div>
  );
}
