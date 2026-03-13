import { useState } from 'react';

const initialSubmission = {
  freelancer_id: '',
  text: '',
  github_link: '',
  file_url: ''
};

export default function SubmissionForm({ milestoneId, onSubmit, loading }) {
  const [form, setForm] = useState(initialSubmission);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(milestoneId, form);
  };

  return (
    <form className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium">Freelancer ID</label>
        <input
          className="input"
          name="freelancer_id"
          value={form.freelancer_id}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Submission Text</label>
        <textarea
          className="input min-h-20"
          name="text"
          value={form.text}
          onChange={handleChange}
          placeholder="Explain what was delivered"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">GitHub Link</label>
          <input
            className="input"
            name="github_link"
            value={form.github_link}
            onChange={handleChange}
            placeholder="https://github.com/..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">File URL</label>
          <input
            className="input"
            name="file_url"
            value={form.file_url}
            onChange={handleChange}
            placeholder="https://files..."
          />
        </div>
      </div>

      <button className="btn-secondary" type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Milestone Work'}
      </button>
    </form>
  );
}
