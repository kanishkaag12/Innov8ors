const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Escrow = require('./models/Escrow');
const Project = require('./models/Project');
const Milestone = require('./models/Milestone');
const User = require('./models/User');

async function initializeEscrows() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const projects = await Project.find({ freelancer_id: { $exists: true, $ne: null } });
    console.log(`Found ${projects.length} active projects to seed.`);

    for (const project of projects) {
      // 1. Check if escrow already exists
      const existing = await Escrow.findOne({ projectId: project._id });
      if (!existing) {
        console.log(`Initializing escrow for project: ${project.title}`);
        
        const escrow = new Escrow({
          clientId: project.employer_id,
          freelancerId: project.freelancer_id,
          projectId: project._id,
          totalAmount: project.budget,
          remainingAmount: project.budget,
          status: 'HOLD'
        });
        await escrow.save();

        // 2. Update employer's escrowLocked balance
        await User.findByIdAndUpdate(project.employer_id, {
          $inc: { escrowLocked: project.budget }
        });
        
        console.log(`  - Created Escrow record for ${project.budget}`);
      } else {
        console.log(`Escrow already exists for ${project.title}`);
      }

      // 3. Fix 'requested' milestones to have 75% progress
      const milestones = await Milestone.find({ project_id: project._id, payment_status: 'requested' });
      for (const m of milestones) {
        await Milestone.updateOne(
          { _id: m._id },
          { 
            $set: { 
              completion_percentage: 75,
              amount_remaining: m.payment_amount 
            } 
          }
        );
      }
      if (milestones.length > 0) {
        console.log(`  - Updated ${milestones.length} requested milestones to 75% completion.`);
      }
    }

    console.log('\nInitialization complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

initializeEscrows();
