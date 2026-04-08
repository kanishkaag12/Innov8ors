const Proposal = require('../models/Proposal');
const Contract = require('../models/Contract');
const Conversation = require('../models/Conversation');
const Project = require('../models/Project');

exports.createProposal = async (req, res) => {
  try {
    console.log('📝 createProposal called for user:', req.user?._id, 'userRole:', req.user?.role);
    console.log('📝 Request body:', req.body);
    
    if (!req.user || req.user.role !== 'freelancer') {
      console.log('❌ User is not freelancer:', req.user?.role);
      return res.status(403).json({ message: 'Only freelancers may submit proposals.' });
    }

    const {
      projectId,
      projectTitle,
      projectDescription,
      projectBudget,
      requiredSkills,
      employerEmail,
      employerName,
      proposalText,
      bidAmount,
      expectedRate,
      estimatedDeliveryDays,
      responseTimeMinutes
    } = req.body;
    console.log('📝 Creating proposal for project:', projectId, 'title:', projectTitle);

    if (!projectId || !projectTitle) {
      console.log('❌ Missing projectId or projectTitle');
      return res.status(400).json({ message: 'Project ID and title are required to submit a proposal.' });
    }

    const proposal = await Proposal.findOneAndUpdate(
      {
        projectId: String(projectId),
        freelancerId: req.user._id
      },
      {
        $set: {
          projectId: String(projectId),
          projectTitle,
          projectDescription: projectDescription || '',
          projectBudget: Number(projectBudget) || undefined,
          requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
          employerId: req.user.role === 'employer' ? req.user._id : undefined,
          employerEmail: employerEmail || undefined,
          employerName: employerName || undefined,
          freelancerId: req.user._id,
          freelancerEmail: req.user.email,
          freelancerName: req.user.name,
          proposalText: proposalText || '',
          bidAmount: Number(bidAmount) || undefined,
          expectedRate: Number(expectedRate) || undefined,
          estimatedDeliveryDays: Number(estimatedDeliveryDays) || undefined,
          responseTimeMinutes: Number(responseTimeMinutes) || undefined,
          status: 'pending'
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    console.log('✅ Proposal created with ID:', proposal._id);

    return res.status(201).json({ message: 'Proposal submitted successfully.', proposal });
  } catch (error) {
    console.error('❌ Create proposal error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyProposals = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filter = req.user.role === 'freelancer'
      ? { freelancerId: req.user._id }
      : { $or: [{ employerId: req.user._id }, { employerEmail: req.user.email }] };

    const proposals = await Proposal.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ proposals });
  } catch (error) {
    console.error('Get proposals error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.acceptProposal = async (req, res) => {
  try {
    console.log('📝 acceptProposal called with params:', req.params, 'body:', req.body, 'user:', req.user?._id);
    
    if (!req.user || req.user.role !== 'employer') {
      console.log('❌ User is not employer:', req.user?.role);
      return res.status(403).json({ message: 'Only employers may accept proposals.' });
    }

    const { id } = req.params;
    const { budget } = req.body;

    const proposal = await Proposal.findById(id);
    console.log('🔍 Proposal found:', proposal?._id, 'status:', proposal?.status);
    
    if (!proposal) {
      console.log('❌ Proposal not found for ID:', id);
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    if (proposal.status !== 'pending') {
      console.log('❌ Proposal status is not pending:', proposal.status);
      return res.status(400).json({ message: 'Only pending proposals may be accepted.' });
    }

    proposal.status = 'accepted';
    proposal.employerId = proposal.employerId || req.user._id;
    proposal.employerEmail = proposal.employerEmail || req.user.email;
    proposal.employerName = proposal.employerName || req.user.name;

    const contract = await Contract.create({
      proposalId: proposal._id,
      projectId: proposal.projectId,
      employerId: req.user._id,
      freelancerId: proposal.freelancerId,
      budget: Number(budget) || 0,
      status: 'active',
      startedAt: new Date()
    });
    console.log('✅ Contract created:', contract._id);

    const conversation = await Conversation.create({
      proposalId: proposal._id,
      contractId: contract._id,
      projectId: proposal.projectId,
      participants: [req.user._id, proposal.freelancerId],
      lastMessageAt: new Date()
    });
    console.log('✅ Conversation created:', conversation._id, 'with participants:', conversation.participants);

    proposal.contractId = contract._id;
    proposal.conversationId = conversation._id;
    await proposal.save();
    console.log('✅ Proposal saved with contractId and conversationId');

    await Project.findByIdAndUpdate(proposal.projectId, {
      $set: { freelancer_id: proposal.freelancerId }
    }).catch(() => null);

    return res.status(200).json({
      message: 'Proposal accepted and contract created.',
      proposal,
      contract,
      conversation
    });
  } catch (error) {
    console.error('❌ Accept proposal error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.rejectProposal = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers may reject proposals.' });
    }

    const { id } = req.params;
    const proposal = await Proposal.findById(id);

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending proposals may be rejected.' });
    }

    proposal.status = 'rejected';
    proposal.employerId = proposal.employerId || req.user._id;
    proposal.employerEmail = proposal.employerEmail || req.user.email;
    proposal.employerName = proposal.employerName || req.user.name;
    await proposal.save();

    return res.status(200).json({ message: 'Proposal rejected.', proposal });
  } catch (error) {
    console.error('Reject proposal error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
