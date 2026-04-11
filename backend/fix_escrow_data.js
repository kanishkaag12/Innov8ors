/**
 * FIX SCRIPT: Correct corrupted escrow data from buggy earlier transactions.
 * 
 * Problem: 3 buggy transactions for "Administrator Portal Development" 
 * drained 17,200 from client escrow and added it to freelancer balance,
 * but never properly updated the milestone. We need to:
 *   1. Reverse the 17,200 over-deduction from client escrow
 *   2. Reverse the 17,200 over-credit to freelancer balance  
 *   3. Reset the Escrow record to match actual paid milestones
 *   4. Fix the "Administrator Portal Development" milestone status back to 'requested' 
 *      (so the client can re-approve it properly)
 * 
 * Run with: node fix_escrow_data.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Escrow = require('./models/Escrow');
const Milestone = require('./models/Milestone');
const Transaction = require('./models/Transaction');

const PROJECT_ID = '69da10140af0d977acae1df8'; // Library Management System

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // 1. Load the escrow for this project
  const escrow = await Escrow.findOne({ projectId: PROJECT_ID });
  if (!escrow) {
    console.error('Escrow not found!');
    process.exit(1);
  }

  const client = await User.findById(escrow.clientId);
  const freelancer = await User.findById(escrow.freelancerId);

  console.log('=== BEFORE FIX ===');
  console.log(`Client (${client.name}): escrowLocked=${client.escrowLocked}`);
  console.log(`Freelancer (${freelancer.name}): balance=${freelancer.balance}`);
  console.log(`Escrow: released=${escrow.releasedAmount}, remaining=${escrow.remainingAmount}`);

  // 2. Load all milestones for this project
  const milestones = await Milestone.find({ project_id: PROJECT_ID });

  // The ONLY legitimate paid amount is from "Project Discovery" = 3600
  const legitimatePaid = milestones.reduce((sum, m) => sum + (m.amount_paid || 0), 0);
  console.log(`\nLegitimate total paid across milestones: ${legitimatePaid}`);

  // 3. The correct values should be:
  const correctEscrowRemaining = escrow.totalAmount - legitimatePaid; // 40000 - 3600 = 36400
  const correctEscrowReleased = legitimatePaid; // 3600
  const correctClientEscrowLocked = correctEscrowRemaining; // 36400
  const correctFreelancerBalance = legitimatePaid; // 3600

  console.log(`\nCorrect values:`);
  console.log(`  Client escrowLocked: ${correctClientEscrowLocked}`);
  console.log(`  Freelancer balance: ${correctFreelancerBalance}`);
  console.log(`  Escrow remaining: ${correctEscrowRemaining}`);
  console.log(`  Escrow released: ${correctEscrowReleased}`);

  // 4. Apply fixes
  client.escrowLocked = correctClientEscrowLocked;
  freelancer.balance = correctFreelancerBalance;
  escrow.remainingAmount = correctEscrowRemaining;
  escrow.releasedAmount = correctEscrowReleased;
  escrow.status = correctEscrowRemaining > 0 ? 'PARTIAL' : 'RELEASED';

  await client.save();
  await freelancer.save();
  await escrow.save();

  // 5. Fix the "Administrator Portal Development" milestone
  // It has payment_status='partially_paid' but amount_paid=0, which is wrong.
  // Since no money was actually properly paid for it, reset it to 'requested' 
  // so the client can re-approve it properly.
  const adminMilestone = milestones.find(m => m.title === 'Administrator Portal Development');
  if (adminMilestone) {
    console.log(`\nFixing milestone: ${adminMilestone.title}`);
    console.log(`  Before: payment_status=${adminMilestone.payment_status}, amount_paid=${adminMilestone.amount_paid}, amount_remaining=${adminMilestone.amount_remaining}`);
    
    adminMilestone.payment_status = 'requested'; // Set back to requested so client can re-approve
    adminMilestone.amount_paid = 0;
    adminMilestone.amount_remaining = adminMilestone.payment_amount; // 8000
    // Keep completion_percentage=70 so the client sees the same request
    
    await adminMilestone.save();
    console.log(`  After: payment_status=${adminMilestone.payment_status}, amount_paid=${adminMilestone.amount_paid}, amount_remaining=${adminMilestone.amount_remaining}`);
  }

  // 6. Delete the 3 corrupt transaction records (the ones that didn't have matching milestone updates)
  // These are the transactions from before the fix that debited client but didn't credit freelancer properly
  const corruptTxns = await Transaction.find({
    description: { $regex: /Administrator Portal Development/ }
  });
  
  console.log(`\nFound ${corruptTxns.length} corrupt transactions for Administrator Portal Development:`);
  for (const t of corruptTxns) {
    console.log(`  [${t.type}] ${t.amount} - ${t.description} (${t.createdAt})`);
  }

  if (corruptTxns.length > 0) {
    await Transaction.deleteMany({
      description: { $regex: /Administrator Portal Development/ }
    });
    console.log(`  Deleted ${corruptTxns.length} corrupt transactions.`);
  }

  // Verify final state
  const clientFinal = await User.findById(escrow.clientId);
  const freelancerFinal = await User.findById(escrow.freelancerId);
  const escrowFinal = await Escrow.findOne({ projectId: PROJECT_ID });

  console.log('\n=== AFTER FIX ===');
  console.log(`Client (${clientFinal.name}): escrowLocked=${clientFinal.escrowLocked}`);
  console.log(`Freelancer (${freelancerFinal.name}): balance=${freelancerFinal.balance}`);
  console.log(`Escrow: released=${escrowFinal.releasedAmount}, remaining=${escrowFinal.remainingAmount}, status=${escrowFinal.status}`);

  const milestonesAfter = await Milestone.find({ project_id: PROJECT_ID });
  console.log('\nMilestone states:');
  for (const m of milestonesAfter) {
    console.log(`  [${m.payment_status}] ${m.title}: paid=${m.amount_paid}, remaining=${m.amount_remaining}, completion=${m.completion_percentage}%`);
  }

  await mongoose.disconnect();
  console.log('\nFix complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
