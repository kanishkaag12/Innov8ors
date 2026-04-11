/**
 * Diagnostic script: Check the actual state of User, Escrow, and Milestone documents
 * to identify data inconsistencies from previous buggy transactions.
 * 
 * Run with: node diagnose_escrow.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Escrow = require('./models/Escrow');
const Milestone = require('./models/Milestone');
const Transaction = require('./models/Transaction');
const Project = require('./models/Project');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // 1. Find all escrow records
  const escrows = await Escrow.find({});
  console.log(`=== ESCROW RECORDS (${escrows.length}) ===`);
  for (const e of escrows) {
    const project = await Project.findById(e.projectId);
    console.log(`  Project: ${project?.title || e.projectId}`);
    console.log(`    Status: ${e.status}`);
    console.log(`    Total Amount: ${e.totalAmount}`);
    console.log(`    Released Amount: ${e.releasedAmount}`);
    console.log(`    Remaining Amount: ${e.remainingAmount}`);
    console.log(`    Client ID: ${e.clientId}`);
    console.log(`    Freelancer ID: ${e.freelancerId}`);
    console.log('');
  }

  // 2. Check users involved in escrows
  const userIds = new Set();
  escrows.forEach(e => {
    userIds.add(String(e.clientId));
    userIds.add(String(e.freelancerId));
  });

  console.log(`=== USERS (${userIds.size}) ===`);
  for (const uid of userIds) {
    const u = await User.findById(uid).select('name email role balance escrowLocked');
    if (u) {
      console.log(`  ${u.name} (${u.email}) - Role: ${u.role}`);
      console.log(`    Balance: ${u.balance}`);
      console.log(`    Escrow Locked: ${u.escrowLocked}`);
      console.log('');
    }
  }

  // 3. Check milestones for all escrow projects
  console.log('=== MILESTONES ===');
  for (const e of escrows) {
    const milestones = await Milestone.find({ project_id: e.projectId });
    const project = await Project.findById(e.projectId);
    console.log(`  Project: ${project?.title || e.projectId} (${milestones.length} milestones)`);
    let totalPaymentAmount = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    for (const m of milestones) {
      totalPaymentAmount += m.payment_amount || 0;
      totalPaid += m.amount_paid || 0;
      totalRemaining += m.amount_remaining || 0;
      console.log(`    [${m.payment_status}] ${m.title}`);
      console.log(`      payment_amount: ${m.payment_amount}, amount_paid: ${m.amount_paid}, amount_remaining: ${m.amount_remaining}`);
      console.log(`      completion_percentage: ${m.completion_percentage}`);
    }
    console.log(`    TOTALS: payment_amount=${totalPaymentAmount}, paid=${totalPaid}, remaining=${totalRemaining}`);
    console.log(`    EXPECTED escrow remaining = totalAmount(${e.totalAmount}) - sum(paid)(${totalPaid}) = ${e.totalAmount - totalPaid}`);
    console.log('');
  }

  // 4. Check transactions
  console.log('=== TRANSACTIONS ===');
  const txns = await Transaction.find({}).sort({ createdAt: -1 }).limit(20);
  for (const t of txns) {
    const u = await User.findById(t.userId).select('name email');
    console.log(`  [${t.type}] ${t.amount} - ${u?.name || t.userId} - ${t.description}`);
    console.log(`    Created: ${t.createdAt}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
