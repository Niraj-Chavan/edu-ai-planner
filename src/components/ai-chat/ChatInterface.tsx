
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('timestamp', { ascending: true });

        if (error) {
          throw error;
        }

        if (data.length === 0) {
          // If no messages found, add initial greeting message
          const welcomeMessage = {
            content: "Hi there! I'm your EduBuddy assistant. How can I help you plan your academic schedule today?",
            sender: 'ai',
          };

          const { data: newMessage, error: insertError } = await supabase
            .from('chat_messages')
            .insert(welcomeMessage)
            .select();

          if (insertError) throw insertError;

          setMessages([{
            id: newMessage[0].id,
            content: newMessage[0].content,
            sender: newMessage[0].sender as 'ai',
            timestamp: new Date(newMessage[0].timestamp)
          }]);
        } else {
          // Map database messages to our format
          const formattedMessages = data.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender as 'user' | 'ai',
            timestamp: new Date(msg.timestamp)
          }));
          
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
        toast({
          title: "Error",
          description: "Failed to load chat history. Please try again.",
          variant: "destructive"
        });
        // Fallback to default message if error
        setMessages([{
          id: 'default',
          content: "Hi there! I'm your EduBuddy assistant. How can I help you plan your academic schedule today?",
          sender: 'ai',
          timestamp: new Date(),
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Prepare user message
    const userMessageContent = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // Insert user message to database
      const { data: userData, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          content: userMessageContent,
          sender: 'user',
        })
        .select();

      if (userError) throw userError;

      const userMessage: Message = {
        id: userData[0].id,
        content: userData[0].content,
        sender: 'user',
        timestamp: new Date(userData[0].timestamp),
      };

      setMessages(prev => [...prev, userMessage]);

      // Generate AI response (in a real app, this might be an API call)
      setTimeout(async () => {
        const aiResponseContent = generateAIResponse(userMessageContent);
        
        // Insert AI response to database
        const { data: aiData, error: aiError } = await supabase
          .from('chat_messages')
          .insert({
            content: aiResponseContent,
            sender: 'ai',
          })
          .select();

        if (aiError) throw aiError;

        const aiMessage: Message = {
          id: aiData[0].id,
          content: aiData[0].content,
          sender: 'ai',
          timestamp: new Date(aiData[0].timestamp),
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);

        // Show toast notification for task creation
        if (userMessageContent.toLowerCase().includes('assignment') || userMessageContent.toLowerCase().includes('project')) {
          toast({
            title: "Task Created",
            description: "I've added this task to your schedule.",
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
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
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
          </div>
        ) : (
          <>
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
          </>
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
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
