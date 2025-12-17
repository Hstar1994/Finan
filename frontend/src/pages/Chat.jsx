import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import config from '../config/env'
import io from 'socket.io-client'
import NewConversationModal from '../components/NewConversationModal'
import './Chat.css'

const Chat = () => {
  const { token, user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [showNewConversation, setShowNewConversation] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token) return

    const socketUrl = config.apiUrl.replace('/api', '').replace('/v1', '')
    console.log('Initializing Socket.IO connection to:', socketUrl)
    console.log('Using token:', token ? 'Token present' : 'No token')
    
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully:', newSocket.id)
      setError(null)
    })

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err)
      console.error('Error message:', err.message)
      console.error('Error description:', err.description)
      setError('Unable to connect to chat server. Please check your connection.')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason)
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        newSocket.connect()
      }
    })

    newSocket.on('new_message', (data) => {
      console.log('New message received:', data)
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages(prev => [...prev, data.message])
        scrollToBottom()
      }
      // Update conversation list with new message
      setConversations(prev => prev.map(conv => 
        conv.id === data.conversationId 
          ? { ...conv, lastMessage: data.message, lastMessageAt: data.message.createdAt }
          : conv
      ))
    })

    newSocket.on('message_read', (data) => {
      console.log('Message read:', data)
      // Update read status in messages
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, read: true } : msg
      ))
    })

    newSocket.on('typing', (data) => {
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          const userId = data.userId || data.customerId
          if (data.isTyping) {
            newSet.add(userId)
          } else {
            newSet.delete(userId)
          }
          return newSet
        })
      }
    })

    newSocket.on('user_joined', (data) => {
      console.log('User joined:', data)
    })

    newSocket.on('user_left', (data) => {
      console.log('User left:', data)
    })

    newSocket.on('error', (data) => {
      console.error('Socket error:', data)
      setError(data.message || 'An error occurred')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token])

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoadingConversations(true)
        const response = await fetch(`${config.apiUrl}/chat/conversations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) throw new Error('Failed to fetch conversations')

        const data = await response.json()
        setConversations(data.data.conversations || [])
      } catch (err) {
        console.error('Error fetching conversations:', err)
        setError('Failed to load conversations')
      } finally {
        setIsLoadingConversations(false)
      }
    }

    if (token) {
      fetchConversations()
    }
  }, [token])

  // Fetch messages when conversation is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return

      try {
        setIsLoadingMessages(true)
        const response = await fetch(
          `${config.apiUrl}/chat/conversations/${selectedConversation.id}/messages`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) throw new Error('Failed to fetch messages')

        const data = await response.json()
        setMessages(data.data.messages || [])
        scrollToBottom()

        // Join the conversation room via socket
        if (socket) {
          socket.emit('join_conversation', { conversationId: selectedConversation.id })
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError('Failed to load messages')
      } finally {
        setIsLoadingMessages(false)
      }
    }

    fetchMessages()

    return () => {
      // Leave the conversation room when switching conversations
      if (socket && selectedConversation) {
        socket.emit('leave_conversation', { conversationId: selectedConversation.id })
      }
    }
  }, [selectedConversation, socket, token])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedConversation || isSending) return

    const messageText = messageInput.trim()
    setMessageInput('')
    setIsSending(true)

    try {
      // Send via Socket.IO for real-time delivery
      if (socket && socket.connected) {
        socket.emit('send_message', {
          conversationId: selectedConversation.id,
          body: messageText,
          type: 'TEXT'
        })
      } else {
        // Fallback to REST API if socket not connected
        const response = await fetch(
          `${config.apiUrl}/chat/conversations/${selectedConversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: messageText, type: 'TEXT' })
          }
        )

        if (!response.ok) throw new Error('Failed to send message')

        const data = await response.json()
        setMessages(prev => [...prev, data.data.message])
        scrollToBottom()
      }

      // Stop typing indicator
      if (socket) {
        socket.emit('typing_stop', { conversationId: selectedConversation.id })
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      setMessageInput(messageText) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const handleTyping = () => {
    if (!socket || !selectedConversation) return

    // Send typing start
    socket.emit('typing_start', { conversationId: selectedConversation.id })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to send typing stop
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: selectedConversation.id })
    }, 3000)
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getConversationTitle = (conversation) => {
    if (conversation.title) return conversation.title
    if (conversation.Customer) return conversation.Customer.name
    return 'Conversation'
  }

  const handleConversationCreated = (newConversation) => {
    setConversations(prev => [newConversation, ...prev])
    setSelectedConversation(newConversation)
    setShowNewConversation(false)
  }

  return (
    <div className="chat-container">
      {/* New Conversation Modal */}
      {showNewConversation && (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onConversationCreated={handleConversationCreated}
        />
      )}

      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>💬 Conversations</h2>
          <button
            className="new-conversation-btn"
            onClick={() => setShowNewConversation(true)}
            title="New Conversation"
          >
            ➕
          </button>
        </div>
        
        {error && (
          <div className="chat-error">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {isLoadingConversations ? (
          <div className="chat-loading">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="chat-empty">
            <p>No conversations yet</p>
            <small>Start chatting with customers</small>
          </div>
        ) : (
          <div className="conversation-list">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-avatar">
                  {conv.type === 'CUSTOMER_DM' ? '👤' : '👥'}
                </div>
                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="conversation-title">{getConversationTitle(conv)}</span>
                    {conv.lastMessageAt && (
                      <span className="conversation-time">
                        {formatTimestamp(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <div className="conversation-preview">
                      {conv.lastMessage.body?.substring(0, 50)}
                      {conv.lastMessage.body?.length > 50 ? '...' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chat-main">
        {!selectedConversation ? (
          <div className="chat-empty-state">
            <h2>💬 Select a conversation</h2>
            <p>Choose a conversation from the list to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <h3>{getConversationTitle(selectedConversation)}</h3>
                <span className="chat-header-status">
                  {socket?.connected ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
              </div>
            </div>

            <div className="chat-messages">
              {isLoadingMessages ? (
                <div className="chat-loading">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="chat-empty">
                  <p>No messages yet</p>
                  <small>Send a message to start the conversation</small>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`message ${msg.userId === user?.id ? 'message-sent' : 'message-received'}`}
                    >
                      <div className="message-content">
                        {msg.type === 'TEXT' && <p>{msg.body}</p>}
                        {msg.type === 'SYSTEM' && (
                          <p className="message-system">ℹ️ {msg.body}</p>
                        )}
                        <span className="message-time">{formatTimestamp(msg.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  {typingUsers.size > 0 && (
                    <div className="typing-indicator">
                      <span>Someone is typing</span>
                      <span className="typing-dots">...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value)
                  handleTyping()
                }}
                disabled={isSending}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!messageInput.trim() || isSending}
              >
                {isSending ? '⏳' : '📤'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default Chat
