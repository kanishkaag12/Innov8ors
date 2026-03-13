export default function FreelancerProfile({ profile }) {
  const pfiValue = Number(profile?.pfi_score || 0);

  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-semibold">Freelancer Profile</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-500">Name</p>
          <p className="font-medium">{profile?.name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Email</p>
          <p className="font-medium">{profile?.email || 'N/A'}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Professional Fidelity Index (PFI)</p>
          <p className="text-sm font-semibold">{pfiValue}%</p>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-200">
          <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${pfiValue}%` }} />
        </div>
      </div>
    </section>
  );
}
