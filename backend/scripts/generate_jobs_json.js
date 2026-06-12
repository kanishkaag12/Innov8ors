const fs = require('fs');
const path = require('path');

const categories = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'AI/ML',
  'DevOps & Cloud',
  'Data Science',
  'Content Writing',
  'Digital Marketing',
  'Video Editing',
  'Blockchain'
];

const industries = ['SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Educational', 'Agency', 'Startup', 'Real Estate', 'Logistics', 'Cybersecurity'];
const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'India', 'Singapore', 'France', 'Netherlands', 'United Arab Emirates'];

const skillsMap = {
  'Web Development': ['React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Tailwind CSS', 'TypeScript', 'Redux', 'GraphQL', 'REST API', 'JavaScript', 'HTML5', 'CSS3', 'Prisma', 'Ruby on Rails', 'Django', 'Vue.js'],
  'Mobile Development': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Objective-C', 'Java', 'iOS SDK', 'Android SDK', 'Firebase', 'App Store Deployment', 'Google Play Console', 'Mobile UI', 'SQLite'],
  'UI/UX Design': ['Figma', 'Adobe XD', 'Sketch', 'Wireframing', 'Prototyping', 'User Research', 'Information Architecture', 'Design Systems', 'Visual Design', 'Mobile Design', 'Responsive Design', 'User Testing'],
  'AI/ML': ['Python', 'TensorFlow', 'PyTorch', 'Scikit-Learn', 'OpenAI API', 'LLMs', 'Prompt Engineering', 'LangChain', 'NLP', 'Computer Vision', 'Hugging Face', 'FastAPI', 'Neural Networks', 'Machine Learning'],
  'DevOps & Cloud': ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Terraform', 'Linux', 'Nginx', 'Ansible', 'Jenkins', 'Cloudflare', 'Monitoring (Prometheus/Grafana)', 'GCP', 'Azure', 'Bash Scripting'],
  'Data Science': ['Python', 'R', 'Pandas', 'NumPy', 'SQL', 'Data Visualization', 'Tableau', 'Power BI', 'Jupyter Notebook', 'Data Cleansing', 'Statistical Analysis', 'Big Data', 'Apache Spark'],
  'Content Writing': ['SEO Writing', 'Copywriting', 'Technical Writing', 'Blog Writing', 'SaaS Content', 'Content Strategy', 'Ghostwriting', 'Proofreading', 'Creative Writing', 'Whitepapers', 'Email Copywriting'],
  'Digital Marketing': ['SEO', 'Google Ads', 'Facebook Ads', 'Social Media Marketing', 'Email Marketing', 'Content Marketing', 'Google Analytics', 'Lead Generation', 'Copywriting', 'Growth Hacking', 'PPC', 'HubSpot'],
  'Video Editing': ['Adobe Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', 'Motion Graphics', 'Color Grading', 'Sound Design', 'Video Production', 'YouTube Editing', 'TikTok/Reels Editing', 'Storyboarding'],
  'Blockchain': ['Solidity', 'Ethereum', 'Smart Contracts', 'Web3.js', 'Ethers.js', 'Rust', 'Solana', 'DeFi', 'NFTs', 'Hardhat', 'Truffle', 'IPFS', 'Cryptography', 'Tokenomics']
};

const jobTemplates = {
  'Web Development': [
    {
      title: "Full-Stack Developer for E-commerce Platform Integration",
      description: "We are an established e-commerce brand looking to integrate our custom storefront with a new headless CMS and a third-party inventory API. The ideal developer will have strong experience with React, Next.js, Node.js, and integrating RESTful/GraphQL APIs. You must write clean, documented code and perform thorough testing before deployment.",
      experienceLevel: "Expert",
      budgetMin: 3000,
      budgetMax: 5000,
      duration: "2 months"
    },
    {
      title: "Frontend React Developer for SaaS Dashboard UI",
      description: "We need an intermediate frontend developer to build several new dashboard views for our B2B SaaS platform. Design mockups are fully complete in Figma. You will be responsible for converting these designs into clean, responsive React components using Tailwind CSS. Must be comfortable with state management (Redux Toolkit or Context API) and connecting to existing backend endpoints.",
      experienceLevel: "Intermediate",
      budgetMin: 800,
      budgetMax: 1500,
      duration: "3 weeks"
    },
    {
      title: "Simple Landing Page Setup with WordPress/Elementor",
      description: "Looking for a beginner developer to set up a clean, 3-page landing page for a local tutoring business. We will provide all content and images. You need to configure the domain, host, set up a basic theme using Elementor Pro, and integrate a contact form connected to Mailchimp. Quick project with potential for monthly maintenance.",
      experienceLevel: "Beginner",
      budgetMin: 150,
      budgetMax: 300,
      duration: "1 week"
    },
    {
      title: "Node.js REST API Development and Database Optimization",
      description: "Our mobile app backend needs optimization and several new endpoints. We are using Node.js, Express, and PostgreSQL. We need an expert backend engineer to audit our database queries, add indexes, rewrite slow queries, and implement new auth/payment endpoints with robust error handling. Familiarity with Prisma ORM is highly preferred.",
      experienceLevel: "Expert",
      budgetMin: 2000,
      budgetMax: 4000,
      duration: "1 month"
    },
    {
      title: "Vue.js Developer to refactor Legacy Frontend Portal",
      description: "Looking for a mid-level Vue.js developer to refactor a portion of our user portal from Vue 2 to Vue 3 (Composition API). You will clean up legacy states, migrate styling to CSS modules, and optimize overall page load speed. Good communication and version control hygiene are essential.",
      experienceLevel: "Intermediate",
      budgetMin: 1200,
      budgetMax: 2500,
      duration: "1 month"
    }
  ],
  'Mobile Development': [
    {
      title: "React Native Developer for Healthcare Booking App",
      description: "We are building a telemedicine startup and need a cross-platform React Native developer to complete our patient-facing app. Key features include doctor search, appointment scheduling, push notifications, and video calling integration via Twilio. UI designs are ready in Figma. Expert level required due to strict HIPAA compliance guidelines.",
      experienceLevel: "Expert",
      budgetMin: 5000,
      budgetMax: 8000,
      duration: "3 months"
    },
    {
      title: "Flutter Developer to build E-learning Mobile App",
      description: "Looking for an intermediate Flutter developer to build a mobile learning app. The app contains modular courses, video streaming, quizzes, and a user profile dashboard. We have the backend API ready. You will implement the mobile client, handle offline caching, and package the app for both iOS and Android stores.",
      experienceLevel: "Intermediate",
      budgetMin: 2500,
      budgetMax: 4500,
      duration: "2 months"
    },
    {
      title: "Swift Developer for iOS Widget and Extension",
      description: "We want to build a lock screen widget and a sharing extension for our existing iOS productivity app. The main codebase is written in Swift and SwiftUI. This is a targeted project requiring deep knowledge of iOS extensions, App Groups for shared data, and widget lifecycles.",
      experienceLevel: "Expert",
      budgetMin: 1500,
      budgetMax: 3000,
      duration: "1 month"
    },
    {
      title: "Bug Fixing and Updates on Android Kotlin App",
      description: "Looking for a beginner/intermediate developer to resolve a list of 12 bugs in our existing native Android app. Issues range from layout overlaps on small screens, database sync issues with SQLite, to crashes on Android 13 permissions. Code is fully native Kotlin.",
      experienceLevel: "Beginner",
      budgetMin: 300,
      budgetMax: 600,
      duration: "2 weeks"
    }
  ],
  'UI/UX Design': [
    {
      title: "Complete Mobile & Web App Redesign - Fintech Platform",
      description: "We are looking for an expert UI/UX designer to completely redesign our mobile wallet application and web dashboard. You will conduct user research, create wireframes, refine our visual identity, and deliver a comprehensive Figma design system with fully interactive prototypes. Experience with complex dashboard design is required.",
      experienceLevel: "Expert",
      budgetMin: 4000,
      budgetMax: 7000,
      duration: "2 months"
    },
    {
      title: "Figma Landing Page and Branding Assets Design",
      description: "Need an intermediate designer to design a modern, high-converting landing page for a new AI SaaS product. Additionally, we need assistance with logo refinement, social media banners, and email newsletter templates. Deliverable must be a highly structured Figma file with components and styles.",
      experienceLevel: "Intermediate",
      budgetMin: 600,
      budgetMax: 1200,
      duration: "2 weeks"
    },
    {
      title: "User Flow and Wireframe Design for EdTech App",
      description: "Looking for a UX designer to map out the complete user journey and wireframes for a new language learning app. Focus is strictly on usability, onboarding optimization, and intuitive navigation. Visual UI design is out of scope for this phase. Output must include detailed flow diagrams and black-and-white wireframes.",
      experienceLevel: "Intermediate",
      budgetMin: 1000,
      budgetMax: 2000,
      duration: "3 weeks"
    },
    {
      title: "Simple Website Header and Banner Design",
      description: "Quick job for a beginner designer to create a beautiful, modern hero header section for our real estate blog. We need 3 layout variations in Figma using provided brand assets and colors.",
      experienceLevel: "Beginner",
      budgetMin: 100,
      budgetMax: 200,
      duration: "1 week"
    }
  ],
  'AI/ML': [
    {
      title: "AI Chatbot Integration with Custom Knowledge Base (RAG)",
      description: "We want to build a customer support assistant for our e-commerce brand that answers queries using our detailed help docs. We require an expert ML engineer to implement a RAG (Retrieval-Augmented Generation) pipeline using OpenAI APIs, LangChain, and a vector database (Pinecone or PGVector). Must run fast and contain safety guardrails against hallucinations.",
      experienceLevel: "Expert",
      budgetMin: 3500,
      budgetMax: 6000,
      duration: "1 month"
    },
    {
      title: "Fine-tune LLM for Legal Document Summarization",
      description: "Looking for a senior AI specialist to fine-tune an open-source model (like Llama 3 or Mistral) on our proprietary dataset of legal contracts. Goal is to generate accurate, high-quality bullet summaries of contract terms. Experience with PyTorch, Hugging Face, and LoRA/QLoRA parameter-efficient tuning is required.",
      experienceLevel: "Expert",
      budgetMin: 6000,
      budgetMax: 10000,
      duration: "2 months"
    },
    {
      title: "FastAPI Wrapper and Prompt Pipeline for OpenAI API",
      description: "We need an intermediate backend developer to build a Python FastAPI service that handles prompts, structures user inputs, calls the OpenAI GPT-4o API, and parses the JSON response. You will implement basic validation, rate limiting, and api key validation. Excellent Python skills are a must.",
      experienceLevel: "Intermediate",
      budgetMin: 800,
      budgetMax: 1600,
      duration: "2 weeks"
    },
    {
      title: "Scikit-Learn Regression Model for House Price Prediction",
      description: "Looking for a beginner data scientist/ML developer to build a machine learning model using Scikit-Learn to forecast real estate prices based on historical CSV data. Clean the dataset, train a random forest model, generate evaluation reports (RMSE, R2), and write a simple script to run inferences.",
      experienceLevel: "Beginner",
      budgetMin: 400,
      budgetMax: 800,
      duration: "2 weeks"
    }
  ],
  'DevOps & Cloud': [
    {
      title: "AWS Cloud Infrastructure Setup using Terraform",
      description: "We need an expert DevOps engineer to design and implement a secure, scalable AWS infrastructure for our Next.js and Node.js application. Deliverables must be fully written as Terraform code (IaC), including VPC setup, ECS Fargate clusters, RDS PostgreSQL, Auto Scaling, and AWS Secrets Manager integration.",
      experienceLevel: "Expert",
      budgetMin: 3000,
      budgetMax: 5500,
      duration: "1 month"
    },
    {
      title: "CI/CD Pipeline Setup via GitHub Actions for Web App",
      description: "Looking for an intermediate DevOps specialist to configure a CI/CD pipeline for our repository. Every pull request should run linting, unit tests, and security scanning. Successful merges to main should automatically deploy build artifacts to AWS Amplify or Vercel and notify Slack.",
      experienceLevel: "Intermediate",
      budgetMin: 500,
      budgetMax: 1000,
      duration: "2 weeks"
    },
    {
      title: "Dockerize Multi-Service Node and Python App",
      description: "Our current system runs raw Node.js and a Python script on a VPS. We want to containerize the entire application. We need a developer to write optimized Dockerfiles, configure a docker-compose.yml file with database persistence, and document local run commands. Perfect starter project for a junior DevOps enthusiast.",
      experienceLevel: "Beginner",
      budgetMin: 250,
      budgetMax: 500,
      duration: "1 week"
    }
  ],
  'Data Science': [
    {
      title: "E-commerce Customer Segmentation & Cohort Analysis",
      description: "We have large datasets of customer transactions. We want an expert data scientist to perform RFM analysis, build clustering models (K-Means), and perform cohort analysis to identify high-value customer groups and churn risks. Deliverables should include clean Jupyter notebooks and a detailed presentation slide deck.",
      experienceLevel: "Expert",
      budgetMin: 2000,
      budgetMax: 4000,
      duration: "1 month"
    },
    {
      title: "SQL Query Optimization and Tableau Dashboard Creation",
      description: "Looking for an intermediate data analyst to clean up our raw databases, write highly optimized SQL views, and build an interactive sales dashboard in Tableau. The dashboard must track monthly recurring revenue (MRR), customer acquisition cost (CAC), and lifetime value (LTV).",
      experienceLevel: "Intermediate",
      budgetMin: 1000,
      budgetMax: 1800,
      duration: "3 weeks"
    },
    {
      title: "CSV Data Cleaning and Analysis Script in Python",
      description: "We have a messy spreadsheet containing lead information with missing cells, duplicates, and inconsistent formatting. We need a Python developer to write a Pandas script to clean the data, normalize fields, export clean files, and generate a text report of general statistics.",
      experienceLevel: "Beginner",
      budgetMin: 150,
      budgetMax: 350,
      duration: "1 week"
    }
  ],
  'Content Writing': [
    {
      title: "High-Quality Technical Blog Posts for DevOps Platform",
      description: "We are looking for an expert technical writer to write a series of 5 deep-dive blog articles (1500-2000 words each) about Docker, Kubernetes, and Kubernetes alternatives. You must be able to write actual configuration code examples and explain complex engineering concepts clearly. SEO optimization is required.",
      experienceLevel: "Expert",
      budgetMin: 1000,
      budgetMax: 2000,
      duration: "1 month"
    },
    {
      title: "SEO Copywriting for B2B SaaS Website",
      description: "Looking for an intermediate SEO writer to write landing page copy, product feature descriptions, and meta tags for our CRM SaaS. We will provide keywords and page structure. You will write engaging, persuasive copy that drives conversions and ranks well on Google.",
      experienceLevel: "Intermediate",
      budgetMin: 500,
      budgetMax: 900,
      duration: "2 weeks"
    },
    {
      title: "Simple Proofreading and Editing of Startup Pitch Deck",
      description: "Need a beginner-friendly writer to proofread a 15-slide investment pitch deck. You will check for spelling errors, grammar mistakes, and refine the tone to make it sound professional and crisp. Fast turnaround is required.",
      experienceLevel: "Beginner",
      budgetMin: 100,
      budgetMax: 200,
      duration: "3 days"
    }
  ],
  'Digital Marketing': [
    {
      title: "Lead Generation and Google Ads Campaign Setup",
      description: "We are a real estate agency looking to acquire high-intent buyer leads. We need an expert marketing manager to set up Google Ads campaigns, conduct extensive keyword research, write ad copy, configure conversion tracking, and optimize bids. You must have proven case studies of low cost-per-lead.",
      experienceLevel: "Expert",
      budgetMin: 1500,
      budgetMax: 3000,
      duration: "1 month"
    },
    {
      title: "Social Media Manager for Fashion E-commerce Brand",
      description: "Looking for an intermediate social media marketer to manage our Instagram, Pinterest, and TikTok channels. Responsibilities include creating a content calendar, posting reels, engaging with followers, and configuring basic influencer outreach templates. Strong visual taste is required.",
      experienceLevel: "Intermediate",
      budgetMin: 800,
      budgetMax: 1500,
      duration: "1 month"
    },
    {
      title: "Email Newsletter Template and List Warmup",
      description: "Need a beginner marketer to help format newsletter campaigns in Mailchimp and write 4 simple email sequences to warm up a small email list of 500 subscribers. Templates and copy must be clean and modern.",
      experienceLevel: "Beginner",
      budgetMin: 200,
      budgetMax: 400,
      duration: "2 weeks"
    }
  ],
  'Video Editing': [
    {
      title: "Promo Video Production and Motion Graphics",
      description: "We are launching a mobile app and need an expert video editor to create a 60-second high-energy promotional video. We will provide screenshots and screen recordings. You will design slick 3D/2D mobile device frame mockups, add fluid text transitions, source premium background music, and deliver multiple aspect ratios (16:9, 9:16).",
      experienceLevel: "Expert",
      budgetMin: 1500,
      budgetMax: 2800,
      duration: "3 weeks"
    },
    {
      title: "YouTube Video Editor for Tech Review Channel",
      description: "Looking for a reliable, intermediate video editor to edit 2 high-quality YouTube tech videos per week. Raw footage is about 30-40 minutes; final videos should be 10-12 minutes. You will trim dead air, insert B-roll, add subtle text highlights, handle audio levels, and perform basic color correction.",
      experienceLevel: "Intermediate",
      budgetMin: 600,
      budgetMax: 1200,
      duration: "1 month"
    },
    {
      title: "TikTok and Reels Video Editing (Batch of 15)",
      description: "Looking for a beginner editor to edit 15 short-form videos for Instagram Reels and TikTok. We will provide raw clips. You need to cut them dynamically, add auto-captions with colorful text overlays, insert sound effects, and trim according to trending hooks. Fun and creative project.",
      experienceLevel: "Beginner",
      budgetMin: 200,
      budgetMax: 400,
      duration: "2 weeks"
    }
  ],
  'Blockchain': [
    {
      title: "Smart Contract Developer for DeFi Staking Protocol",
      description: "We are building a decentralized finance protocol and need an expert Solidity developer to write custom staking, locking, and yield generation smart contracts. You must ensure protection against common exploits (reentrancy, flash loan attacks) and provide scripts for deployment. Hardhat/Foundry experience is a must. Code must be gas-optimized and thoroughly unit-tested.",
      experienceLevel: "Expert",
      budgetMin: 6000,
      budgetMax: 10000,
      duration: "2 months"
    },
    {
      title: "Web3.js/Ethers.js Integration for NFT Minting Dapp",
      description: "Looking for an intermediate blockchain developer to connect our completed frontend UI (Next.js) with our deployed ERC-721 smart contract. You will implement wallet connection (Metamask, WalletConnect), read smart contract state (price, total minted), call the mint function, and handle transaction errors smoothly.",
      experienceLevel: "Intermediate",
      budgetMin: 1500,
      budgetMax: 3000,
      duration: "3 weeks"
    },
    {
      title: "Solana Token Setup and SPL Metadata Configuration",
      description: "Need a developer to create a custom utility token on Solana (SPL standard), set up metadata, and write a simple script to handle batch token transfers to early testers. Clean and straightforward task suitable for a beginner/intermediate Solana developer.",
      experienceLevel: "Beginner",
      budgetMin: 400,
      budgetMax: 800,
      duration: "1 week"
    }
  ]
};

// Generate 100 unique jobs
const jobs = [];
let jobCounter = 1;

const companyNames = [
  "Acme Corp", "Fintechly", "MedCare Solutions", "EduLearn", "ShopifyPlus Partner",
  "Apex Digital Agency", "SaaSify Inc", "PropTech Innovations", "LogiRoute Global", "GuardCyber",
  "Nova AI", "CoinTech", "VeloWeb", "NexoMobile", "PixelDesign Studio", "DevOpsGrid",
  "DataPulse", "WordCraft", "LeadGenius", "RenderCut Studios", "SmartContract Lab"
];

for (let i = 0; i < 100; i++) {
  const category = categories[i % categories.length];
  const templates = jobTemplates[category];
  const templateIndex = Math.floor(i / categories.length) % templates.length;
  const template = templates[templateIndex];

  // Modify titles and descriptions slightly to make them unique
  const suffix = ` (Ref: #${1000 + i})`;
  const finalTitle = template.title + suffix;
  
  const clientName = companyNames[i % companyNames.length] + ` Client`;
  const clientIndustry = industries[i % industries.length];
  const country = countries[i % countries.length];
  
  const proposalCountOptions = ["Less than 5", "5 to 10", "10 to 15", "15 to 20", "20 to 50"];
  const proposalCount = proposalCountOptions[i % proposalCountOptions.length];
  const postedDaysAgo = String((i % 7) + 1);

  // Pick unique subset of skills relevant to category
  const allCategorySkills = skillsMap[category];
  const shuffledSkills = [...allCategorySkills].sort(() => 0.5 - Math.random());
  const requiredSkills = shuffledSkills.slice(0, 3 + (i % 3));

  // Determine budget structure
  const budgetMin = template.budgetMin;
  const budgetMax = template.budgetMax;
  const budgetText = `$${budgetMin} - $${budgetMax}`;

  jobs.push({
    title: finalTitle,
    description: template.description + ` Work is 100% remote. Looking for a dependable professional to start within ${postedDaysAgo} days of contract award.`,
    category: category,
    budget: budgetText,
    duration: template.duration,
    experienceLevel: template.experienceLevel,
    requiredSkills: requiredSkills,
    clientName: clientName,
    clientIndustry: clientIndustry,
    country: country,
    proposalCount: proposalCount,
    postedDaysAgo: postedDaysAgo
  });
}

// Write to data directory
const outputDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'realistic_jobs.json'),
  JSON.stringify(jobs, null, 2),
  'utf-8'
);

console.log(`Successfully generated 100 realistic jobs in data/realistic_jobs.json!`);
