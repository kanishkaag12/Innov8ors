const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Escrow = require('../models/Escrow');
const Transaction = require('../models/Transaction');
const Milestone = require('../models/Milestone');

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('Razorpay secret not configured');
  
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
    
  return generatedSignature === signature;
};

exports.createEscrow = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, freelancerId, projectId } = req.body;
  const clientId = req.user?.id || req.body.clientId; // Adjust based on your auth middleware

  if (!clientId || !freelancerId || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // 1. Verify Razorpay signature if provided (assuming frontend passed it)
  // Or if it's a test/sandbox mock where signature isn't passed, bypass carefully
  if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
    const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const client = await User.findById(clientId).session(session);
    if (!client) throw new Error('Client not found');

    const freelancer = await User.findById(freelancerId).session(session);
    if (!freelancer) throw new Error('Freelancer not found');

    // 2. Logic: The client's actual fiat payment acts as a deposit that we immediately move to escrow.
    // So we conceptually credit their balance, then debit it, adding it to escrowLocked.
    // For net values: client.escrowLocked increases. 
    
    // Increment total locked funds
    client.escrowLocked += Number(amount);
    await client.save({ session });

    // 3. Create Escrow record
    const escrow = new Escrow({
      clientId,
      freelancerId,
      projectId,
      totalAmount: amount,
      remainingAmount: amount,
      status: 'HOLD'
    });
    
    const savedEscrow = await escrow.save({ session });

    // 4. Create Transactions (Banking style ledger)
    // Credit to client wallet (synthetic deposit from Razorpay)
    await new Transaction({
      userId: clientId,
      type: 'credit',
      amount: amount,
      description: 'Deposit via Razorpay'
    }).save({ session });

    // Debit from client wallet into Escrow
    await new Transaction({
      userId: clientId,
      type: 'debit',
      amount: amount,
      referenceId: savedEscrow._id,
      description: `Funds locked into escrow for Project ${projectId || 'N/A'}`
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Escrow created successfully', escrow: savedEscrow });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in createEscrow:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.releasePartial = async (req, res) => {
  const { escrowId, projectId, amountToRelease } = req.body;
  const clientId = req.user?.id || req.body.clientId; // ensure the client making request owns the escrow

  if ((!escrowId && !projectId) || !amountToRelease) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let escrow;
    if (escrowId) {
      escrow = await Escrow.findById(escrowId).session(session);
    } else {
      escrow = await Escrow.findOne({ projectId }).session(session);
    }
    
    if (!escrow) throw new Error('Escrow not found');
    
    // Auth check: allow the client or the assigned freelancer to release (in autonomous AI mode)
    if (clientId && escrow.clientId.toString() !== clientId.toString() && escrow.freelancerId.toString() !== clientId.toString()) {
      throw new Error('Unauthorized to release these funds');
    }

    if (amountToRelease <= 0) throw new Error('Amount must be greater than zero');
    if (amountToRelease > escrow.remainingAmount) {
      throw new Error('Insufficient funds in escrow container');
    }
    if (escrow.status === 'RELEASED' || escrow.status === 'REFUNDED') {
      throw new Error('Escrow is fully released or refunded');
    }

    const client = await User.findById(escrow.clientId).session(session);
    const freelancer = await User.findById(escrow.freelancerId).session(session);

    // Update balances
    client.escrowLocked -= amountToRelease;
    freelancer.balance += amountToRelease;

    // Update escrow
    escrow.releasedAmount += amountToRelease;
    escrow.remainingAmount -= amountToRelease;
    escrow.status = escrow.remainingAmount > 0 ? 'PARTIAL' : 'RELEASED';

    await client.save({ session });
    await freelancer.save({ session });
    await escrow.save({ session });

    // Create Transaction history
    await new Transaction({
      userId: client._id,
      type: 'debit', // Conceptually it's leaving their locked bucket completely
      amount: amountToRelease,
      referenceId: escrow._id,
      description: `Escrow release partial for Project ${escrow.projectId || 'N/A'}`
    }).save({ session });

    await new Transaction({
      userId: freelancer._id,
      type: 'credit',
      amount: amountToRelease,
      referenceId: escrow._id,
      description: `Payment received from escrow for Project ${escrow.projectId || 'N/A'}`
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Partial payment released successfully', escrow });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in releasePartial:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.requestPartial = async (req, res) => {
  const { projectId, milestoneId, completionPercentage } = req.body;

  if (!projectId || !milestoneId) {
    return res.status(400).json({ error: 'Missing projectId or milestoneId' });
  }

  // Minimum 50% threshold check
  if (!completionPercentage || completionPercentage < 50) {
    return res.status(400).json({ 
      error: 'Partial payment requests require at least 50% milestone completion.' 
    });
  }

  try {
    const milestone = await Milestone.findOne({ _id: milestoneId, project_id: projectId });
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.payment_status === 'partially_paid' || milestone.payment_status === 'paid') {
      return res.status(400).json({ error: 'This milestone has already received a partial or full payment. Only one partial payout is allowed.' });
    }

    if (milestone.payment_status === 'requested') {
      return res.status(400).json({ error: 'A payment request is already pending for this milestone.' });
    }
    
    milestone.payment_status = 'requested';
    milestone.completion_percentage = completionPercentage;
    await milestone.save();
    
    console.log(`Payment of ${completionPercentage}% requested for milestone ${milestoneId}`);
    return res.status(200).json({ message: 'Partial payment requested successfully', milestone });
  } catch (error) {
    console.error('Error requesting partial payment:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.approvePartial = async (req, res) => {
  const { projectId, milestoneId } = req.body;
  const clientId = req.user?.id || req.body.clientId;

  console.log('--- Approving Partial Payment ---');
  console.log('Project:', projectId);
  console.log('Milestone:', milestoneId);
  console.log('Client:', clientId);

  if (!projectId || !milestoneId) {
    return res.status(400).json({ error: 'Missing projectId or milestoneId' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const milestone = await Milestone.findOne({ _id: milestoneId, project_id: projectId }).session(session);
    if (!milestone) throw new Error('Milestone not found');
    
    if (milestone.payment_status !== 'requested') {
      throw new Error('Payment has not been requested for this milestone yet');
    }

    const escrow = await Escrow.findOne({ projectId }).session(session);
    if (!escrow) throw new Error('Escrow record not found for this project');
    
    // Calculate pro-rated amount based on completion percentage
    const percentage = Number(milestone.completion_percentage || 100);
    const totalAmount = Number(milestone.payment_amount || 0);
    const amountToRelease = Number(((totalAmount * percentage) / 100).toFixed(2));

    console.log(`[APPROVE_PARTIAL] Milestone: ${milestone.title}`);
    console.log(`[APPROVE_PARTIAL] Config: Percentage=${percentage}%, TotalBudget=${totalAmount}`);
    console.log(`[APPROVE_PARTIAL] Target Release: ${amountToRelease}`);
    console.log(`[APPROVE_PARTIAL] Current Escrow: Remaining=${escrow.remainingAmount}, Released=${escrow.releasedAmount}`);

    if (clientId && escrow.clientId.toString() !== clientId.toString()) {
      throw new Error('Unauthorized to release these funds. You are not the owner of this project escrow.');
    }

    if (amountToRelease <= 0) throw new Error('Amount must be greater than zero');
    if (amountToRelease > escrow.remainingAmount + 0.01) { // Floating point safety
      throw new Error(`Insufficient funds in escrow. Requested: ${amountToRelease}, Max Available: ${escrow.remainingAmount}`);
    }

    const client = await User.findById(escrow.clientId).session(session);
    const freelancer = await User.findById(escrow.freelancerId).session(session);

    if (!client || !freelancer) throw new Error('Could not find client or freelancer records');

    console.log(`[APPROVE_PARTIAL] Before: Client Locked=${client.escrowLocked}, Freelancer Balance=${freelancer.balance}`);

    // Update User balances
    client.escrowLocked = Math.max(0, Number((client.escrowLocked - amountToRelease).toFixed(2)));
    freelancer.balance = Number((freelancer.balance + amountToRelease).toFixed(2));

    // Update escrow container
    escrow.releasedAmount = Number((escrow.releasedAmount + amountToRelease).toFixed(2));
    escrow.remainingAmount = Math.max(0, Number((escrow.remainingAmount - amountToRelease).toFixed(2)));
    
    // Update Milestone payout history
    const oldPaid = milestone.amount_paid || 0;
    milestone.amount_paid = Number((oldPaid + amountToRelease).toFixed(2));
    // Calculate remaining based on total budget minus what has been paid so far
    milestone.amount_remaining = Math.max(0, Number((milestone.payment_amount - milestone.amount_paid).toFixed(2)));

    if (milestone.amount_paid < milestone.payment_amount - 0.01) {
      milestone.payment_status = 'partially_paid';
    } else {
      milestone.payment_status = 'paid';
      milestone.amount_remaining = 0;
    }

    escrow.status = escrow.remainingAmount > 0.01 ? 'PARTIAL' : 'RELEASED';

    console.log(`[APPROVE_PARTIAL] After: Client Locked=${client.escrowLocked}, Freelancer Balance=${freelancer.balance}, Milestone Remaining=${milestone.amount_remaining}`);

    await client.save({ session });
    await freelancer.save({ session });
    await escrow.save({ session });
    await milestone.save({ session });

    // Create Transaction history for audit
    // 1. Debit from client (escrow release)
    await new Transaction({
      userId: client._id,
      type: 'debit',
      amount: amountToRelease,
      referenceId: escrow._id,
      description: `Escrow release (${percentage}%) for Project ${escrow.projectId} - Milestone: ${milestone.title}`
    }).save({ session });

    // 2. Credit to freelancer (payment received)
    await new Transaction({
      userId: freelancer._id,
      type: 'credit',
      amount: amountToRelease,
      referenceId: escrow._id,
      description: `Payment received (${percentage}%) for Project ${escrow.projectId} - Milestone: ${milestone.title}`
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('Partial payment approved and transferred successfully');
    return res.status(200).json({ 
      message: 'Partial payment approved successfully', 
      amountReleased: amountToRelease,
      milestoneStatus: milestone.payment_status 
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Error in approvePartial:', error);
    return res.status(400).json({ error: error.message || 'Approval failed' });
  }
};

exports.rejectPartial = async (req, res) => {
  const { projectId, milestoneId } = req.body;
  const clientId = req.user?.id || req.body.clientId;

  if (!projectId || !milestoneId) {
    return res.status(400).json({ error: 'Missing projectId or milestoneId' });
  }

  try {
    const milestone = await Milestone.findOne({ _id: milestoneId, project_id: projectId });
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    const escrow = await Escrow.findOne({ projectId });
    if (clientId && escrow && escrow.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to reject request' });
    }
    
    milestone.payment_status = 'rejected';
    await milestone.save();
    
    return res.status(200).json({ message: 'Payment rejected successfully', milestone });
  } catch (error) {
    console.error('Error rejecting partial payment:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.releaseFull = async (req, res) => {
  const { escrowId, projectId } = req.body;
  const clientId = req.user?.id || req.body.clientId;

  if (!escrowId && !projectId) {
    return res.status(400).json({ error: 'Missing parameter' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let escrow;
    if (escrowId) {
      escrow = await Escrow.findById(escrowId).session(session);
    } else {
      escrow = await Escrow.findOne({ projectId }).session(session);
    }
    
    if (!escrow) throw new Error('Escrow not found');
    
    // Auth check: allow the client or the assigned freelancer to release (in autonomous AI mode)
    if (clientId && escrow.clientId.toString() !== clientId.toString() && escrow.freelancerId.toString() !== clientId.toString()) {
      throw new Error('Unauthorized to release these funds');
    }

    const amountToRelease = escrow.remainingAmount;
    
    if (amountToRelease <= 0 || escrow.status === 'RELEASED') {
      throw new Error('No funds remaining to release');
    }

    const client = await User.findById(escrow.clientId).session(session);
    const freelancer = await User.findById(escrow.freelancerId).session(session);

    client.escrowLocked -= amountToRelease;
    freelancer.balance += amountToRelease;

    escrow.releasedAmount += amountToRelease;
    escrow.remainingAmount = 0;
    escrow.status = 'RELEASED';

    await client.save({ session });
    await freelancer.save({ session });
    await escrow.save({ session });

    await new Transaction({
      userId: client._id,
      type: 'debit',
      amount: amountToRelease,
      referenceId: escrow._id,
      description: `Escrow release final for Project ${escrow.projectId || 'N/A'}`
    }).save({ session });

    await new Transaction({
      userId: freelancer._id,
      type: 'credit',
      amount: amountToRelease,
      referenceId: escrow._id,
      description: `Final payment received from escrow for Project ${escrow.projectId || 'N/A'}`
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Full payment released successfully', escrow });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in releaseFull:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.refundEscrow = async (req, res) => {
  const { escrowId } = req.body;
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error('Escrow not found');
    
    const amountToRefund = escrow.remainingAmount;
    
    if (amountToRefund <= 0) {
      throw new Error('No funds remaining to refund');
    }

    const client = await User.findById(escrow.clientId).session(session);

    // Cancel escrow hold and refund to client's wallet
    client.escrowLocked -= amountToRefund;
    client.balance += amountToRefund;

    escrow.remainingAmount = 0;
    escrow.status = 'REFUNDED';

    await client.save({ session });
    await escrow.save({ session });

    await new Transaction({
      userId: client._id,
      type: 'credit',
      amount: amountToRefund,
      referenceId: escrow._id,
      description: `Escrow refunded for Project ${escrow.projectId || 'N/A'}`
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Funds refunded to client wallet successfully', escrow });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in refundEscrow:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('balance escrowLocked role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Optional: Get active escrows
    const query = user.role === 'freelancer' ? { freelancerId: userId } : { clientId: userId };
    query.status = { $in: ['HOLD', 'PARTIAL'] };
    const activeEscrows = await Escrow.find(query);

    res.status(200).json({
      balance: user.balance,
      escrowLocked: user.escrowLocked,
      activeEscrows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.params.userId;
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
