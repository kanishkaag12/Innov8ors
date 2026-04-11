const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Escrow = require('./models/Escrow');
const Project = require('./models/Project');
const Milestone = require('./models/Milestone');
const User = require('./models/User');

async function debugEscrow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const projects = await Project.find({}, 'title status milestones freelancer_id employer_id');
    const escrows = await Escrow.find({});
    const milestones = await Milestone.find({});
    const users = await User.find({}, 'name email role balance escrowLocked');

    console.log('\n--- Users ---');
    users.forEach(u => {
      console.log(`Name: ${u.name} | Role: ${u.role} | Balance: ${u.balance} | Locked: ${u.escrowLocked}`);
    });

    console.log('\n--- Projects ---');
    projects.forEach(p => {
      const hasEscrow = escrows.some(e => e.projectId.toString() === p._id.toString());
      console.log(`Title: ${p.title} | ID: ${p._id} | Has Escrow: ${hasEscrow} | Freelancer: ${p.freelancer_id}`);
      
      const pMilestones = milestones.filter(m => m.project_id.toString() === p._id.toString());
      pMilestones.forEach(m => {
        console.log(`- ${m.title}: Status=${m.payment_status}, Budget=₹${m.payment_amount}, Paid=₹${m.amount_paid || 0}, Remaining=₹${m.amount_remaining || 0}, Progress=${m.completion_percentage}%`);
      });
    });

    console.log('\n--- Escrows ---');
    if (escrows.length === 0) console.log('No escrow records found.');
    escrows.forEach(e => {
      console.log(`ProjectID: ${e.projectId} | Status: ${e.status} | Total: ${e.totalAmount} | Remaining: ${e.remainingAmount}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugEscrow();
