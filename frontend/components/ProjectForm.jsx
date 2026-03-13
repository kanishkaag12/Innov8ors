import { useState } from 'react';

const initialForm = {
  employer_id: '',
  freelancer_id: '',
  title: '',
  description: '',
  budget: '',
  deadline: ''
};

export default function ProjectForm({ onSubmit, loading }) {
  const [form, setForm] = useState(initialForm);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      budget: Number(form.budget)
    });
  };

  return (
    <form className="card space-y-4" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold">Create Project</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Employer ID</label>
          <input
            className="input"
            name="employer_id"
            value={form.employer_id}
            onChange={handleChange}
            placeholder="Employer identifier"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Freelancer ID (optional)</label>
          <input
            className="input"
            name="freelancer_id"
            value={form.freelancer_id}
            onChange={handleChange}
            placeholder="Freelancer identifier"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Project Title</label>
        <input
          className="input"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Enter project title"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Project Description</label>
        <textarea
          className="input min-h-28"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe project scope and deliverables"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Budget</label>
          <input
            type="number"
            className="input"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            placeholder="1500"
            min="0"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Deadline</label>
          <input
            type="date"
            className="input"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}
