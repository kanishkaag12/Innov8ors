const statusStyle = {
  locked: 'bg-amber-100 text-amber-800',
  released: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-rose-100 text-rose-800'
};

export default function EscrowDashboard({ projectBudget = 0, milestones = [], payments = [] }) {
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((item) =>
    ['verified', 'paid', 'completed'].includes(item.status) ||
    ['completed', 'partial'].includes(item.verification_result)
  ).length;
  const progress = totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="text-xl font-semibold">Escrow Overview</h2>
        <p className="mt-2 text-sm text-slate-600">Total Project Budget</p>
        <p className="text-3xl font-bold">${projectBudget}</p>
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Milestone Progress</h3>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-200">
          <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="card">
        <h3 className="mb-3 text-lg font-semibold">Milestone Payment Breakdown</h3>
        <div className="space-y-3">
          {milestones.length === 0 ? (
            <p className="text-sm text-slate-500">No milestones found.</p>
          ) : (
            milestones.map((milestone, index) => {
              const payment = payments.find((item) => item.milestone_id === milestone._id) ||
                payments.find((item) => item.milestone_id?._id === milestone._id);

              const paymentStatus = payment?.status || 'locked';
              return (
                <div
                  key={milestone._id || `${milestone.title}-${index}`}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{milestone.title}</p>
                    <p className="text-sm text-slate-600">${milestone.payment_amount}</p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium ${
                      statusStyle[paymentStatus] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
