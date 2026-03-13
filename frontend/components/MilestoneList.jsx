export default function MilestoneList({ milestones = [], onConfirmMilestones, showConfirm = false }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Milestones</h2>
        {showConfirm && milestones.length > 0 ? (
          <button className="btn-primary" onClick={onConfirmMilestones}>
            Confirm Milestones
          </button>
        ) : null}
      </div>

      {milestones.length === 0 ? (
        <div className="card text-sm text-slate-500">No milestones available yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {milestones.map((milestone, index) => (
            <article key={milestone._id || `${milestone.title}-${index}`} className="card space-y-2">
              <h3 className="text-lg font-semibold">{milestone.title}</h3>
              <p className="text-sm text-slate-600">{milestone.description}</p>
              <p className="text-sm">
                <span className="font-medium">Deliverable:</span> {milestone.deliverable}
              </p>
              <p className="text-sm">
                <span className="font-medium">Payment:</span> ${milestone.payment_amount}
              </p>
              {milestone.status ? (
                <p className="text-sm">
                  <span className="font-medium">Status:</span> {milestone.status}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
