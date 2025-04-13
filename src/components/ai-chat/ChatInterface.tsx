
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi there! I'm your EduBuddy assistant. How can I help you plan your academic schedule today?",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('timestamp', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const formattedMessages: Message[] = data.map((msg: ChatMessage) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender as 'user' | 'ai',
            timestamp: new Date(msg.timestamp || ''),
          }));
          
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    
    fetchMessages();
  }, []);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to state immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Save user message to database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content: input,
          sender: 'user'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving message:', error);
      }
      
      // Replace temporary message with the one from the database if we got a response
      if (data) {
        const savedUserMessage: Message = {
          id: data.id,
          content: data.content,
          sender: data.sender as 'user',
          timestamp: new Date(data.timestamp || ''),
        };
        
        setMessages(prev => 
          prev.map(msg => msg.id === userMessage.id ? savedUserMessage : msg)
        );
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }

    // Simulate AI response
    setTimeout(async () => {
      const aiResponse = generateAIResponse(input);
      
      try {
        // Save AI message to database
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            content: aiResponse,
            sender: 'ai'
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving AI message:', error);
        }
        
        // Add AI message from database response or fallback to local if DB fails
        if (data) {
          const aiMessage: Message = {
            id: data.id,
            content: data.content,
            sender: data.sender as 'ai',
            timestamp: new Date(data.timestamp || ''),
          };
          
          setMessages(prev => [...prev, aiMessage]);
        } else {
          // Fallback to local AI message if database failed
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
          }]);
        }
      } catch (error) {
        console.error('Failed to save AI message:', error);
        // Fallback for any error
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        }]);
      }
      
      setIsTyping(false);

      // Show toast notification for task creation
      if (input.toLowerCase().includes('assignment') || input.toLowerCase().includes('project')) {
        toast({
          title: "Task Created",
          description: "I've added this task to your schedule.",
        });
      }
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    // Simple response generation logic
    const input = userInput.toLowerCase();
    
    if (input.includes('assignment') || input.includes('project')) {
      return "I've added this to your task list. Based on your current schedule, I recommend working on this on Wednesday between 2-4 PM when you have free time. Would you like me to schedule it then?";
    }
    
    if (input.includes('exam') || input.includes('test')) {
      return "I see you have an upcoming exam. I recommend creating a study plan. Would you like me to create a study schedule leading up to it?";
    }
    
    if (input.includes('schedule') || input.includes('plan')) {
      return "I can help you optimize your schedule. Could you tell me more about your classes and other commitments so I can create a personalized plan?";
    }
    
    if (input.includes('tired') || input.includes('stress')) {
      return "I notice you might be feeling overwhelmed. Remember to take breaks! Research shows that short 10-minute breaks every hour can improve productivity by 30%. Should I schedule some break reminders for you?";
    }
    
    return "That's interesting! Would you like me to help you organize this into your academic schedule? I can optimize your time and suggest the best periods for focused work.";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getTimeString = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] border border-border rounded-lg overflow-hidden bg-white">
      <div className="p-4 border-b border-border bg-secondary/50">
        <h2 className="font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          EduBuddy Chat Assistant
        </h2>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-4 max-w-[80%] rounded-lg p-3",
              message.sender === 'user' 
                ? "bg-accent text-white ml-auto" 
                : "bg-secondary mr-auto"
            )}
          >
            <p className="text-sm">{message.content}</p>
            <span className="text-xs opacity-70 mt-1 block text-right">
              {getTimeString(message.timestamp)}
            </span>
          </div>
        ))}
        
        {isTyping && (
          <div className="mb-4 max-w-[80%] rounded-lg p-3 bg-secondary mr-auto">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-light"></div>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-light delay-150"></div>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-light delay-300"></div>
            </div>
          </div>
        )}
        
        <div ref={endOfMessagesRef} />
      </div>
      
      <div className="p-3 border-t border-border bg-secondary/30">
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message EduBuddy..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
