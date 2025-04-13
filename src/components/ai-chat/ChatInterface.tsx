
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, Plus, Mic, StopCircle } from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    
    // Improved AI understanding with more flexible keyword recognition
    // Task Management
    if (containsAny(input, ['add', 'create', 'set', 'new', 'make', 'schedule', 'put']) &&
        containsAny(input, ['assignment', 'project', 'task', 'homework', 'essay', 'report', 'presentation'])) {
      
      const taskDetails = extractTaskDetails(userInput);
      const taskResult = await createTask(taskDetails);
      
      if (taskResult.success) {
        toast.success("Task added to your schedule");
        return `I've added "${taskDetails.title}" to your task list with a due date of ${formatDate(new Date(taskDetails.dueDate))}. It has been set as ${taskDetails.priority} priority. Would you like me to help you schedule time to work on this?`;
      } else {
        return "I couldn't add your task. Please try again with more details like the title, due date and priority.";
      }
    }
    
    // Schedule Planning
    if (containsAny(input, ['schedule', 'plan', 'time', 'block', 'allocate', 'book', 'reserve']) && 
        containsAny(input, ['study', 'class', 'lecture', 'meeting', 'session', 'work'])) {
      
      const scheduleDetails = extractScheduleDetails(userInput);
      const scheduleResult = await createScheduleItem(scheduleDetails);
      
      if (scheduleResult.success) {
        toast.success("Added to your schedule");
        return `I've scheduled "${scheduleDetails.title}" from ${scheduleDetails.startTime} to ${scheduleDetails.endTime}. Would you like a reminder before it starts?`;
      } else {
        return "I couldn't add this to your schedule. Please try again with more details like the activity, start time and end time.";
      }
    }
    
    // Exam Guidance
    if (containsAny(input, ['exam', 'test', 'quiz', 'final', 'midterm', 'assessment'])) {
      return "I see you're concerned about an upcoming exam. I recommend creating a study plan. Would you like me to create a study schedule leading up to your exam? Please let me know the date of your exam and what subject it's for.";
    }
    
    // Wellness Check
    if (containsAny(input, ['tired', 'stress', 'exhausted', 'overwhelmed', 'anxious', 'worried', 'confused'])) {
      return "I notice you might be feeling overwhelmed. Remember to take breaks! Research shows that short 10-minute breaks every hour can improve productivity by 30%. Should I schedule some break reminders for you?";
    }
    
    // Deadline Management
    if (containsAny(input, ['deadline', 'due', 'when', 'late', 'time left', 'running out of time'])) {
      return "I can help you manage your deadlines. Would you like me to show you your upcoming deadlines, or help you prioritize your tasks based on due dates?";
    }
    
    // Calendar View
    if (containsAny(input, ['calendar', 'view', 'see', 'show', 'check', 'look at'])) {
      return "If you'd like to see your full schedule, you can navigate to the Planner page. Would you like me to help you organize specific days in your calendar?";
    }
    
    // General Help
    return "I'm here to help organize your academic schedule. You can ask me to add tasks, schedule study time, or plan your week. For example, try saying 'Add a Math assignment due Friday' or 'Schedule a study session today from 3pm to 5pm'.";
  };

  const containsAny = (text: string, keywords: string[]): boolean => {
    return keywords.some(keyword => text.includes(keyword));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const extractTaskDetails = (input: string) => {
    let title = "New Task";
    let dueDate = new Date();
    let priority = "medium";
    let course = "General";
    
    const words = input.split(' ');
    
    // Better course detection
    const possibleCourses = words.filter(word => 
      /^[A-Z]{2,7}\d{3}$/i.test(word) || /^[A-Z]{2,4}$/i.test(word)
    );
    if (possibleCourses.length > 0) {
      course = possibleCourses[0].toUpperCase();
    } else {
      const subjects = ['math', 'science', 'history', 'english', 'physics', 'chemistry', 
                        'biology', 'literature', 'computer', 'psychology', 'philosophy', 
                        'economics', 'business', 'art', 'music', 'geography'];
      for (const subject of subjects) {
        if (input.toLowerCase().includes(subject)) {
          course = subject.charAt(0).toUpperCase() + subject.slice(1);
          break;
        }
      }
    }
    
    // Improved title extraction
    if (input.includes('add') && input.includes('due')) {
      const addIndex = input.indexOf('add') + 3;
      const dueIndex = input.indexOf('due');
      if (dueIndex > addIndex) {
        title = input.substring(addIndex, dueIndex).trim();
      }
    } else if (input.includes('called') || input.includes('titled') || input.includes('named')) {
      const keywordIndices = [
        input.indexOf('called') !== -1 ? input.indexOf('called') + 6 : -1,
        input.indexOf('titled') !== -1 ? input.indexOf('titled') + 6 : -1,
        input.indexOf('named') !== -1 ? input.indexOf('named') + 5 : -1
      ].filter(idx => idx !== -1);
      
      if (keywordIndices.length > 0) {
        const keywordIndex = Math.min(...keywordIndices);
        title = input.substring(keywordIndex).trim();
        const endTerms = [' due ', ' priority ', ' for course ', ' by ', ' on ', ' at '];
        for (const term of endTerms) {
          if (title.includes(term)) {
            title = title.substring(0, title.indexOf(term));
          }
        }
      }
    }
    
    if (title === "New Task" || title.length < 3) {
      // Extract a more meaningful title from the input
      const commonWords = ['add', 'create', 'new', 'task', 'assignment', 'project', 'homework', 
                         'for', 'me', 'my', 'due', 'please', 'can', 'you', 'would', 'could'];
      const meaningful = words.filter(word => 
        !commonWords.includes(word.toLowerCase())
      );
      if (meaningful.length > 0) {
        title = meaningful.slice(0, 3).join(' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
    
    // Enhanced due date parsing
    const dueText = input.includes('due') ? 
      input.substring(input.indexOf('due') + 3).trim() : 
      input.includes('by') ? 
        input.substring(input.indexOf('by') + 2).trim() : input;
    dueDate = parseDueDate(dueText);
    
    // Better priority detection
    if (input.includes('high priority') || input.includes('important') || 
        input.includes('urgent') || input.includes('critical')) {
      priority = "high";
    } else if (input.includes('low priority') || input.includes('not urgent') || 
               input.includes('not important') || input.includes('can wait')) {
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
    } else if (text.includes('this weekend') || text.includes('weekend')) {
      // Get next Saturday
      const day = date.getDay(); // 0 is Sunday, 6 is Saturday
      const daysUntilSaturday = day === 6 ? 0 : 6 - day;
      date.setDate(date.getDate() + daysUntilSaturday);
      return date;
    } else if (text.includes('two weeks') || text.includes('2 weeks')) {
      date.setDate(date.getDate() + 14);
      return date;
    } else if (text.includes('month') || text.includes('30 days')) {
      date.setMonth(date.getMonth() + 1);
      return date;
    }
    
    // Day of week detection
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
    
    // Date format MM/DD
    const monthMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
    if (monthMatch) {
      const month = parseInt(monthMatch[1]) - 1;
      const day = parseInt(monthMatch[2]);
      date.setMonth(month);
      date.setDate(day);
      return date;
    }
    
    // Month names
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 
                    'september', 'october', 'november', 'december'];
    for (let i = 0; i < months.length; i++) {
      if (text.toLowerCase().includes(months[i])) {
        const monthIndex = i;
        const dayMatch = text.match(/(\d{1,2})(st|nd|rd|th)?/);
        if (dayMatch) {
          const day = parseInt(dayMatch[0]);
          date.setMonth(monthIndex);
          date.setDate(day);
          return date;
        }
      }
    }
    
    // Default fallback
    date.setDate(date.getDate() + 3);
    return date;
  };

  const extractScheduleDetails = (input: string) => {
    let title = "Study Session";
    let startTime = "09:00";
    let endTime = "10:00";
    let category = "study";
    
    // Improved category detection
    if (containsAny(input, ['class', 'lecture', 'course'])) {
      title = "Class";
      category = "class";
    } else if (containsAny(input, ['study', 'review', 'practice', 'revision'])) {
      title = "Study Session";
      category = "study";
    } else if (containsAny(input, ['meeting', 'appointment', 'consultation'])) {
      title = "Meeting";
      category = "personal";
    } else if (containsAny(input, ['break', 'rest', 'relax', 'pause'])) {
      title = "Break";
      category = "break";
    } else if (containsAny(input, ['assignment', 'homework', 'project', 'essay', 'report'])) {
      title = "Assignment Work";
      category = "assignment";
    }
    
    // Enhanced subject detection
    const subjects = ['math', 'science', 'history', 'english', 'physics', 'chemistry', 
                      'biology', 'literature', 'computer', 'calculus', 'algebra', 
                      'psychology', 'philosophy', 'economics', 'business', 'art', 'music'];
    for (const subject of subjects) {
      if (input.toLowerCase().includes(subject)) {
        title = `${subject.charAt(0).toUpperCase() + subject.slice(1)} ${category === 'class' ? 'Class' : 'Study'}`;
        break;
      }
    }
    
    // Improved time detection
    const timePatterns = [
      /from\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+to\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
      /between\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+and\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
      /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+to\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
      /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*-\s*(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
    ];
    
    let timeMatch = null;
    for (const pattern of timePatterns) {
      const match = input.match(pattern);
      if (match) {
        timeMatch = match;
        break;
      }
    }
    
    if (timeMatch) {
      startTime = formatTimeString(timeMatch[1]);
      endTime = formatTimeString(timeMatch[2]);
    } else {
      const singleTimePatterns = [
        /at\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
        /starting\s+at\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
        /beginning\s+at\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
      ];
      
      let singleMatch = null;
      for (const pattern of singleTimePatterns) {
        const match = input.match(pattern);
        if (match) {
          singleMatch = match;
          break;
        }
      }
      
      if (singleMatch) {
        startTime = formatTimeString(singleMatch[1]);
        
        // Extract duration if mentioned
        const durationMatch = input.match(/for\s+(\d+)\s*(hour|hr|hours|hrs?)/i);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const startHour = parseInt(startTime.split(':')[0]);
          const startMinute = parseInt(startTime.split(':')[1]);
          endTime = `${(startHour + hours).toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        } else {
          // Default 1 hour
          const startHour = parseInt(startTime.split(':')[0]);
          const startMinute = parseInt(startTime.split(':')[1]);
          endTime = `${(startHour + 1).toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        }
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

  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    // Handle results
    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    // Handle end event
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    // Handle errors
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast.error("Speech recognition error: " + event.error);
    };

    // Start listening
    recognitionRef.current.start();
    setIsListening(true);
    toast.success("Listening...");
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
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
          <Button 
            variant={isListening ? "destructive" : "outline"} 
            size="icon" 
            onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
