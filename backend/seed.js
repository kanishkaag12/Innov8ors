require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateEmbedding } = require('./services/embeddingService');
const User = require('./models/User');
const Job = require('./models/Job');

async function seed() {
  console.log('Seeding database...');

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  // Create freelancers
  const freelancers = [
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'password123',
      role: 'freelancer',
      freelancerProfile: {
        headline: 'Full Stack Developer',
        bio: 'Experienced in React, Node.js, MongoDB, and modern web apps.',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Next.js'],
        interests: ['Web Development', 'Full Stack'],
        preferredCategories: ['Web Development', 'AI Development'],
        primaryCategory: 'Web Development',
        experienceLevel: 'mid',
        preferredBudgetMin: 50,
        preferredBudgetMax: 100,
        preferredProjectType: 'hourly'
      }
    },
    {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'password123',
      role: 'freelancer',
      freelancerProfile: {
        headline: 'Python Data Scientist',
        bio: 'Specialized in machine learning, data analysis, and AI.',
        skills: ['Python', 'TensorFlow', 'Pandas', 'SQL', 'FastAPI'],
        interests: ['Data Science', 'Machine Learning'],
        preferredCategories: ['Data Science', 'AI Development'],
        primaryCategory: 'Data Science',
        experienceLevel: 'senior',
        preferredBudgetMin: 80,
        preferredBudgetMax: 150,
        preferredProjectType: 'fixed'
      }
    }
  ];

  // Create employers
  const employers = [
    {
      name: 'FinTech Startup',
      email: 'employer1@example.com',
      password: 'password123',
      role: 'employer',
      companyName: 'Finflow Labs',
      employerProfile: {
        fullName: 'Sarah Chen',
        companyName: 'Finflow Labs',
        industry: 'Fintech',
        hiringInterests: ['React', 'Dashboard', 'Next.js'],
        about: 'Building modern fintech dashboards for startups.',
        location: 'San Francisco'
      }
    },
    {
      name: 'AI Company',
      email: 'employer2@example.com',
      password: 'password123',
      role: 'employer',
      companyName: 'ProposalPilot',
      employerProfile: {
        fullName: 'Mike Rodriguez',
        companyName: 'ProposalPilot',
        industry: 'AI Tools',
        hiringInterests: ['Node.js', 'OpenAI', 'Prompt Engineering'],
        about: 'AI assistants for freelancers and agencies.',
        location: 'Remote'
      }
    }
  ];

  const allUsers = [...freelancers, ...employers];

  for (const u of allUsers) {
    if (u.role === 'freelancer') {
      const text = `${u.freelancerProfile.headline} ${u.freelancerProfile.bio} ${u.freelancerProfile.skills.join(', ')} ${u.freelancerProfile.interests.join(', ')} ${u.freelancerProfile.preferredCategories.join(', ')} ${u.freelancerProfile.primaryCategory} ${u.freelancerProfile.experienceLevel}`;
      const embedding = await generateEmbedding(text);
      u.freelancerProfile.profileEmbedding = embedding;
    }

    // Hash password
    u.password = await bcrypt.hash(u.password, 10);

    const user = new User(u);
    await user.save();
    console.log(`✓ Created ${u.role}: ${u.email}`);
  }

  // Create jobs
  const jobs = [
    {
      title: 'Build a React Dashboard',
      description: 'Need a dashboard for data visualization using React and Chart.js.',
      requiredSkills: ['JavaScript', 'React', 'Chart.js'],
      category: 'Web Development',
      budgetMin: 500,
      budgetMax: 1000,
      projectType: 'fixed'
    },
    {
      title: 'Data Analysis Project',
      description: 'Analyze sales data and create reports using Python.',
      requiredSkills: ['Python', 'Pandas', 'SQL'],
      category: 'Data Science',
      budgetMin: 200,
      budgetMax: 500,
      projectType: 'fixed'
    },
    {
      title: 'Node.js API Development',
      description: 'Build REST API for e-commerce platform.',
      requiredSkills: ['Node.js', 'Express', 'MongoDB'],
      category: 'Web Development',
      budgetMin: 30,
      budgetMax: 50,
      projectType: 'hourly'
    }
  ];

  for (const j of jobs) {
    const text = `${j.title} ${j.description} ${j.requiredSkills.join(', ')} ${j.category}`;
    const embedding = await generateEmbedding(text);
    j.jobEmbedding = embedding;

    const job = new Job(j);
    await job.save();
    console.log(`✓ Created job: ${j.title}`);
  }

  console.log('\n✅ Seeding complete!');
  mongoose.disconnect();
}

seed().catch(console.error);