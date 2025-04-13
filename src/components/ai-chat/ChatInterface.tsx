import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, Plus } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
  const { user } = useAuth();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
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
  }, [user]);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !user) return;

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
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content: input,
          sender: 'user',
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving message:', error);
      }
      
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

    setTimeout(async () => {
      const aiResponse = await processUserInput(input);
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            content: aiResponse,
            sender: 'ai',
            user_id: user.id
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving AI message:', error);
        }
        
        if (data) {
          const aiMessage: Message = {
            id: data.id,
            content: data.content,
            sender: data.sender as 'ai',
            timestamp: new Date(data.timestamp || ''),
          };
          
          setMessages(prev => [...prev, aiMessage]);
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
          }]);
        }
      } catch (error) {
        console.error('Failed to save AI message:', error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        }]);
      }
      
      setIsTyping(false);
    }, 1500);
  };

  const processUserInput = async (userInput: string): Promise<string> => {
    const input = userInput.toLowerCase();
    
    if ((input.includes('assignment') || input.includes('project') || input.includes('task') || input.includes('homework')) && 
        (input.includes('add') || input.includes('create') || input.includes('set') || input.includes('new'))) {
      const taskDetails = extractTaskDetails(userInput);
      
      const taskResult = await createTask(taskDetails);
      
      if (taskResult.success) {
        toast.success("Task added to your schedule");
        return `I've added "${taskDetails.title}" to your task list with a due date of ${taskDetails.dueDate}. It has been set as ${taskDetails.priority} priority. Would you like me to help you schedule time to work on this?`;
      } else {
        return "I couldn't add your task. Please try again with more details like the title, due date and priority.";
      }
    }
    
    if ((input.includes('schedule') || input.includes('plan') || input.includes('time')) && 
        (input.includes('study') || input.includes('class') || input.includes('lecture') || input.includes('meeting'))) {
      const scheduleDetails = extractScheduleDetails(userInput);
      
      const scheduleResult = await createScheduleItem(scheduleDetails);
      
      if (scheduleResult.success) {
        toast.success("Added to your schedule");
        return `I've scheduled "${scheduleDetails.title}" from ${scheduleDetails.startTime} to ${scheduleDetails.endTime}. Would you like a reminder before it starts?`;
      } else {
        return "I couldn't add this to your schedule. Please try again with more details like the activity, start time and end time.";
      }
    }
    
    if (input.includes('exam') || input.includes('test')) {
      return "I see you have an upcoming exam. I recommend creating a study plan. Would you like me to create a study schedule leading up to it?";
    }
    
    if (input.includes('tired') || input.includes('stress')) {
      return "I notice you might be feeling overwhelmed. Remember to take breaks! Research shows that short 10-minute breaks every hour can improve productivity by 30%. Should I schedule some break reminders for you?";
    }
    
    return "I'm here to help organize your academic schedule. You can ask me to add tasks, schedule study time, or plan your week. For example, try saying 'Add a Math assignment due Friday' or 'Schedule a study session today from 3pm to 5pm'.";
  };

  const extractTaskDetails = (input: string) => {
    let title = "New Task";
    let dueDate = new Date();
    let priority = "medium";
    let course = "General";
    
    const words = input.split(' ');
    
    const possibleCourses = words.filter(word => 
      /^[A-Z]{2,7}\d{3}$/i.test(word) || /^[A-Z]{2,4}$/i.test(word)
    );
    if (possibleCourses.length > 0) {
      course = possibleCourses[0].toUpperCase();
    } else {
      const subjects = ['math', 'science', 'history', 'english', 'physics', 'chemistry', 'biology', 'literature', 'computer'];
      for (const subject of subjects) {
        if (input.toLowerCase().includes(subject)) {
          course = subject.charAt(0).toUpperCase() + subject.slice(1);
          break;
        }
      }
    }
    
    if (input.includes('add') && input.includes('due')) {
      const addIndex = input.indexOf('add') + 3;
      const dueIndex = input.indexOf('due');
      if (dueIndex > addIndex) {
        title = input.substring(addIndex, dueIndex).trim();
      }
    } else if (input.includes('called') || input.includes('titled')) {
      const keywordIndex = Math.max(input.indexOf('called'), input.indexOf('titled'));
      if (keywordIndex !== -1) {
        title = input.substring(keywordIndex + 6).trim();
        const endTerms = [' due ', ' priority ', ' for course '];
        for (const term of endTerms) {
          if (title.includes(term)) {
            title = title.substring(0, title.indexOf(term));
          }
        }
      }
    }
    
    if (title === "New Task" || title.length < 3) {
      const meaningful = words.filter(word => 
        !['add', 'create', 'new', 'task', 'assignment', 'project', 'homework', 'for', 'me', 'my', 'due'].includes(word.toLowerCase())
      );
      if (meaningful.length > 0) {
        title = meaningful.slice(0, 3).join(' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
    
    const dueText = input.substring(input.indexOf('due') + 3).trim();
    dueDate = parseDueDate(dueText);
    
    if (input.includes('high priority') || input.includes('important')) {
      priority = "high";
    } else if (input.includes('low priority') || input.includes('not urgent')) {
      priority = "low";
    }
    
    return {
      title,
      dueDate: dueDate.toISOString(),
      priority: priority as 'high' | 'medium' | 'low',
      course
    };
  };

  const parseDueDate = (text: string): Date => {
    const date = new Date();
    
    if (text.includes('today')) {
      return date;
    } else if (text.includes('tomorrow')) {
      date.setDate(date.getDate() + 1);
      return date;
    } else if (text.includes('next week')) {
      date.setDate(date.getDate() + 7);
      return date;
    }
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (text.toLowerCase().includes(days[i])) {
        const today = date.getDay();
        const targetDay = i;
        const daysToAdd = (targetDay + 7 - today) % 7;
        date.setDate(date.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
        return date;
      }
    }
    
    const monthMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
    if (monthMatch) {
      const month = parseInt(monthMatch[1]) - 1;
      const day = parseInt(monthMatch[2]);
      date.setMonth(month);
      date.setDate(day);
      return date;
    }
    
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    for (let i = 0; i < months.length; i++) {
      if (text.toLowerCase().includes(months[i])) {
        const monthIndex = i;
        const dayMatch = text.match(/(\d{1,2})/);
        if (dayMatch) {
          const day = parseInt(dayMatch[0]);
          date.setMonth(monthIndex);
          date.setDate(day);
          return date;
        }
      }
    }
    
    date.setDate(date.getDate() + 3);
    return date;
  };

  const extractScheduleDetails = (input: string) => {
    let title = "Study Session";
    let startTime = "09:00";
    let endTime = "10:00";
    let category = "study";
    
    if (input.includes('class') || input.includes('lecture')) {
      title = "Class";
      category = "class";
    } else if (input.includes('study')) {
      title = "Study Session";
      category = "study";
    } else if (input.includes('meeting')) {
      title = "Meeting";
      category = "personal";
    } else if (input.includes('break')) {
      title = "Break";
      category = "break";
    } else if (input.includes('assignment') || input.includes('homework')) {
      title = "Assignment Work";
      category = "assignment";
    }
    
    const subjects = ['math', 'science', 'history', 'english', 'physics', 'chemistry', 'biology', 'literature', 'computer', 'calculus', 'algebra'];
    for (const subject of subjects) {
      if (input.toLowerCase().includes(subject)) {
        title = `${subject.charAt(0).toUpperCase() + subject.slice(1)} ${category === 'class' ? 'Class' : 'Study'}`;
        break;
      }
    }
    
    const timePattern = /from\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+to\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i;
    const timeMatch = input.match(timePattern);
    
    if (timeMatch) {
      startTime = formatTimeString(timeMatch[1]);
      endTime = formatTimeString(timeMatch[2]);
    } else {
      const singleTimePattern = /at\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i;
      const singleMatch = input.match(singleTimePattern);
      
      if (singleMatch) {
        startTime = formatTimeString(singleMatch[1]);
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        endTime = `${(startHour + 1).toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      title,
      startTime,
      endTime,
      category: category as 'study' | 'class' | 'assignment' | 'break' | 'personal'
    };
  };

  const formatTimeString = (timeStr: string): string => {
    let hours = 0;
    let minutes = 0;
    
    const isPM = timeStr.toLowerCase().includes('pm') && !timeStr.toLowerCase().includes('12:');
    const isAM = timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('12:');
    
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      
      if (isPM && hours < 12) {
        hours += 12;
      } else if (isAM && hours === 12) {
        hours = 0;
      }
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const createTask = async (taskDetails: any) => {
    if (!user) return { success: false };
    
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: taskDetails.title,
          due_date: taskDetails.dueDate,
          priority: taskDetails.priority,
          course: taskDetails.course,
          user_id: user.id,
          completed: false
        });
      
      if (error) {
        console.error('Error creating task:', error);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to create task:', error);
      return { success: false, error };
    }
  };
  
  const createScheduleItem = async (scheduleDetails: any) => {
    if (!user) return { success: false };
    
    try {
      const { error } = await supabase
        .from('schedule_items')
        .insert({
          title: scheduleDetails.title,
          start_time: scheduleDetails.startTime,
          end_time: scheduleDetails.endTime,
          category: scheduleDetails.category,
          user_id: user.id,
          completed: false
        });
      
      if (error) {
        console.error('Error creating schedule item:', error);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to create schedule item:', error);
      return { success: false, error };
    }
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
