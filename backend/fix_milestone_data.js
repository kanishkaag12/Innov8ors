const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('./models/Project');
const Milestone = require('./models/Milestone');
const User = require('./models/User');

dotenv.config();

const fixData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for data repair...');

    const milestones = await Milestone.find({});
    console.log(`Found ${milestones.length} milestones. Checking for integrity...`);

    let updatedCount = 0;
    for (const m of milestones) {
      let needsUpdate = false;
      
      // If amount_remaining is 0 but payment_amount is > 0 and it's not fully paid
      if (m.amount_remaining === 0 && m.payment_amount > 0 && m.payment_status !== 'paid') {
        const paid = m.amount_paid || 0;
        m.amount_remaining = Math.max(0, m.payment_amount - paid);
        needsUpdate = true;
      }

      // Ensure amount_paid is at least 0
      if (m.amount_paid === undefined || m.amount_paid === null) {
        m.amount_paid = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await m.save();
        updatedCount++;
      }
    }

    console.log(`Data repair complete. Updated ${updatedCount} milestones.`);
    process.exit(0);
  } catch (err) {
    console.error('Repair failed:', err);
    process.exit(1);
  }
};

fixData();
