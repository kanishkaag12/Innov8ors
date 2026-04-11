const mongoose = require('mongoose');
require('dotenv').config();
const Milestone = require('./models/Milestone');
const Project = require('./models/Project');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const milestones = await Milestone.find({}).limit(5);
    console.log('Milestones sample:', JSON.stringify(milestones, null, 2));

    const projects = await Project.find({}).limit(5);
    console.log('Projects sample:', JSON.stringify(projects, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
