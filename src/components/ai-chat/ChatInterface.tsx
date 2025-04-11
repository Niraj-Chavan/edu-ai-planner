
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

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

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (In a real app, this would be an API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(input),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
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
