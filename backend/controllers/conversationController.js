const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const getUnreadCount = (conversation, userIdStr) => {
  const counts = conversation.unreadCounts;
  if (!counts || typeof counts !== 'object') return 0;
  
  const count = counts[userIdStr];
  return typeof count === 'number' ? count : 0;
};

const setUnreadCount = (conversation, userIdStr, count) => {
  if (!conversation.unreadCounts) {
    conversation.unreadCounts = {};
  }
  conversation.unreadCounts[userIdStr] = count;
};

exports.getUserConversations = async (req, res) => {
  try {
    console.log('📝 getUserConversations called for user:', req.user?._id);
    
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1 })
      .populate('proposalId', 'projectTitle');

    console.log('🔍 Found conversations:', conversations.length, 'for user:', req.user._id);

    const userIdStr = String(req.user._id);
    const enriched = await Promise.all(conversations.map(async (conversation) => {
      const lastMessage = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .lean();

      const unreadCount = getUnreadCount(conversation, userIdStr);

      return {
        id: conversation._id,
        projectId: conversation.projectId,
        projectTitle: conversation.proposalId?.projectTitle || 'Project conversation',
        participants: conversation.participants,
        lastMessage: lastMessage?.text || 'No messages yet',
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: unreadCount,
        hasUnread: unreadCount > 0
      };
    }));

    console.log('✅ Returning enriched conversations:', enriched.length);
    return res.status(200).json({ conversations: enriched });
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdStr = String(userId);

    const conversations = await Conversation.find({ participants: userId });
    
    let totalUnread = 0;
    for (const conv of conversations) {
      totalUnread += getUnreadCount(conv, userIdStr);
    }

    return res.status(200).json({ 
      unreadCount: totalUnread,
      hasUnread: totalUnread > 0 
    });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id).populate('proposalId', 'projectTitle');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some((participant) =>
      String(participant) === String(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name email');

    const userIdStr = String(req.user._id);
    const unreadCount = getUnreadCount(conversation, userIdStr);

    return res.status(200).json({
      conversation: {
        id: conversation._id,
        projectId: conversation.projectId,
        projectTitle: conversation.proposalId?.projectTitle || 'Project conversation',
        participants: conversation.participants,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: unreadCount
      },
      messages: messages.map((message) => ({
        id: message._id,
        text: message.text,
        sender: message.senderId ? { id: message.senderId._id, name: message.senderId.name, email: message.senderId.email } : null,
        isRead: message.isRead || false,
        readAt: message.readAt || null,
        createdAt: message.createdAt
      }))
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userIdStr = String(userId);

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some((participant) =>
      String(participant) === userIdStr
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const unreadMessages = await Message.find({
      conversationId: conversation._id,
      senderId: { $ne: userId },
      isRead: false
    });

    if (unreadMessages.length > 0) {
      const now = new Date();
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { $set: { isRead: true, readAt: now } }
      );

      setUnreadCount(conversation, userIdStr, 0);
      await conversation.save();
    }

    const newUnreadCount = getUnreadCount(conversation, userIdStr);

    return res.status(200).json({
      success: true,
      conversationId: id,
      unreadCount: newUnreadCount,
      markedAsRead: unreadMessages.length
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some((participant) =>
      String(participant) === String(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    }

    const senderId = req.user._id;
    const senderIdStr = String(senderId);

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: senderId,
      text: String(text).trim(),
      isRead: false,
      readAt: null
    });

    conversation.participants.forEach(participant => {
      const participantIdStr = String(participant);
      if (participantIdStr !== senderIdStr) {
        const currentCount = getUnreadCount(conversation, participantIdStr);
        setUnreadCount(conversation, participantIdStr, currentCount + 1);
      }
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email');

    return res.status(201).json({
      message: {
        id: populatedMessage._id,
        text: populatedMessage.text,
        sender: populatedMessage.senderId ? { 
          id: populatedMessage.senderId._id, 
          name: populatedMessage.senderId.name, 
          email: populatedMessage.senderId.email 
        } : null,
        isRead: populatedMessage.isRead || false,
        readAt: populatedMessage.readAt || null,
        createdAt: populatedMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
