
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, Plus, Mic, StopCircle, Coffee, Droplet, Timer } from 'lucide-react';
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

interface BreakPreference {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  remindToDrinkWater: boolean;
  remindToStretch: boolean;
  remindToRestEyes: boolean;
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
  const [isListening, setIsListening] = useState(false);
  const [breakPreferences, setBreakPreferences] = useState<BreakPreference>({
    workDuration: 90, // default 90 minutes
    breakDuration: 15, // default 15 minutes
    remindToDrinkWater: true,
    remindToStretch: true,
    remindToRestEyes: true
  });
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakTimer, setBreakTimer] = useState<NodeJS.Timeout | null>(null);
  
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

    // Load break preferences from localStorage
    const savedPrefs = localStorage.getItem(`breakPreferences_${user?.id}`);
    if (savedPrefs) {
      try {
        const parsedPrefs = JSON.parse(savedPrefs);
        setBreakPreferences(parsedPrefs);
        startBreakTimer(parsedPrefs.workDuration);
      } catch (e) {
        console.error('Failed to parse saved break preferences:', e);
        startBreakTimer(breakPreferences.workDuration);
      }
    } else {
      // Load default break preferences
      startBreakTimer(breakPreferences.workDuration);
    }

    return () => {
      if (breakTimer) {
        clearTimeout(breakTimer);
      }
    };
  }, [user]);

  const startBreakTimer = (minutes: number) => {
    // Clear any existing timer
    if (breakTimer) {
      clearTimeout(breakTimer);
    }
    
    // Set new timer
    const newTimer = setTimeout(() => {
      toast.success(
        <div className="flex flex-col">
          <div className="font-bold">Time for a break!</div>
          <div className="text-sm">Take {breakPreferences.breakDuration} minutes to rest.</div>
          {breakPreferences.remindToDrinkWater && 
            <div className="flex items-center mt-1 text-sm">
              <Droplet className="h-4 w-4 mr-1" /> Remember to drink water
            </div>
          }
          {breakPreferences.remindToStretch && 
            <div className="flex items-center mt-1 text-sm">
              <Coffee className="h-4 w-4 mr-1" /> Stretch your body
            </div>
          }
        </div>, 
        {
          duration: 10000,
          action: {
            label: "Dismiss",
            onClick: () => {}
          }
        }
      );
      
      // After the break, restart the timer
      setTimeout(() => {
        toast.success("Break time is over. Back to work!");
        startBreakTimer(minutes);
      }, breakPreferences.breakDuration * 60 * 1000);
      
    }, minutes * 60 * 1000);
    
    setBreakTimer(newTimer);
  };

  const saveBreakPreferences = async (prefs: BreakPreference) => {
    if (!user) return;
    
    try {
      // Store break preferences in localStorage since we don't have a user_preferences table yet
      localStorage.setItem(`breakPreferences_${user.id}`, JSON.stringify(prefs));
      
      setBreakPreferences(prefs);
      startBreakTimer(prefs.workDuration);
      toast.success("Break preferences saved");
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error("Failed to save break preferences");
    }
  };

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
    
    // Break preferences setup
    if (containsAny(input, ['break', 'rest', 'pause']) &&
        containsAny(input, ['set', 'configure', 'change', 'prefer', 'settings'])) {
      
      setTimeout(() => setShowBreakModal(true), 500);
      
      return "I can help you configure your break preferences. How long would you like to work before taking breaks? And how long should your breaks be?";
    }

    // Enhanced Task Detection
    if (detectTaskRequest(userInput)) {
      const taskDetails = extractTaskDetails(userInput);
      
      // Create the task in Supabase
      const taskCreated = await createTaskInDatabase(taskDetails);
      
      if (taskCreated.success) {
        // Find the best time to schedule this task based on user's patterns
        const recommendedSlots = await findOptimalTimeSlots(taskDetails);
        
        // Find relevant resources for this task
        const resources = await findRelevantResources(taskDetails);
        
        return `I've added "${taskDetails.title}" to your upcoming deadlines with a due date of ${formatDate(new Date(taskDetails.dueDate))} and ${taskDetails.priority} priority.\n\n${recommendedSlots}\n\nHere are some resources that might help you prepare:\n${resources.map((r, i) => `${i+1}. [${r.title}](${r.url}) - ${r.description}`).join('\n')}\n\nWould you like me to schedule a specific work session for this task?`;
      } else {
        return "I tried to add your task but encountered an issue. Please try providing more details like the title, due date, and subject.";
      }
    }
    
    // Work schedule optimization
    if (containsAny(input, ['when', 'best time', 'optimal', 'suggest', 'recommend']) &&
        containsAny(input, ['work', 'study', 'focus', 'productive'])) {
      
      // Get current hour
      const currentHour = new Date().getHours();
      let suggestion = "";
      
      // Productivity recommendations based on time of day
      if (currentHour >= 8 && currentHour < 11) {
        suggestion = "Based on your past activity and research on productivity patterns, morning hours (8-11 AM) are your most productive time. I recommend tackling your most challenging tasks now while your mind is fresh.";
      } else if (currentHour >= 15 && currentHour < 18) {
        suggestion = "Research shows that there's a secondary productivity peak in the late afternoon (3-6 PM). This would be a good time for moderately difficult tasks that require focus.";
      } else if (currentHour >= 20) {
        suggestion = "Evening hours are typically better for creative tasks and review rather than learning new complex material. Consider using this time for light reading, organizing notes, or planning for tomorrow.";
      } else {
        suggestion = "Based on general productivity research, most people experience productivity peaks in the morning (8-11 AM) and late afternoon (3-6 PM). The post-lunch period (1-3 PM) often sees a natural dip in alertness.";
      }
      
      return `${suggestion}\n\nWould you like me to help schedule specific work blocks in your calendar based on these optimal times?`;
    }
    
    // Schedule Planning with improved suggestions
    if (containsAny(input, ['schedule', 'plan', 'time', 'block', 'allocate', 'book', 'reserve']) && 
        containsAny(input, ['study', 'class', 'lecture', 'meeting', 'session', 'work'])) {
      
      const scheduleDetails = extractScheduleDetails(userInput);
      const scheduleResult = await createScheduleItem(scheduleDetails);
      
      if (scheduleResult.success) {
        toast.success("Added to your schedule");
        
        // Generate focused sessions with breaks
        const focusedSessions = generateFocusedSessions(scheduleDetails);
        
        return `I've scheduled "${scheduleDetails.title}" from ${scheduleDetails.startTime} to ${scheduleDetails.endTime}.\n\n${focusedSessions}\n\nWould you like me to set reminders for these sessions?`;
      } else {
        return "I couldn't add this to your schedule. Please try again with more details like the activity, start time and end time.";
      }
    }
    
    // Resource recommendations with improved context awareness
    if (containsAny(input, ['find', 'suggest', 'recommend', 'resource', 'material', 'study', 'learn'])) {
      const subject = extractSubject(input);
      
      if (subject) {
        return `I see you're interested in learning about ${subject}. Based on your learning history and goals, here are some recommended resources:\n\n1. ${generateResourceRecommendation(subject, 'video')}\n2. ${generateResourceRecommendation(subject, 'article')}\n3. ${generateResourceRecommendation(subject, 'book')}\n\nWould you like me to add study sessions for this topic to your schedule?`;
      }
    }

    // Default responses for common queries
    if (containsAny(input, ['deadline', 'due', 'when', 'late', 'time left', 'running out of time'])) {
      return "I can help you manage your deadlines. Would you like me to show you your upcoming deadlines, or help you prioritize your tasks based on due dates and estimated completion time?";
    }

    if (containsAny(input, ['calendar', 'view', 'see', 'show', 'check', 'look at'])) {
      return "If you'd like to see your full schedule, you can navigate to the Planner page. Would you like me to help you organize specific days in your calendar based on your productivity patterns and task priorities?";
    }
    
    // General Help
    return "I'm here to help organize your academic schedule and optimize your productivity. You can ask me to add tasks, schedule study sessions with optimal break intervals, or suggest when to work on specific subjects based on your productivity patterns. For example, try saying 'I have a presentation on Data Analysis due Friday' or 'Schedule a focused study session for tomorrow'.";
  };

  // New function to detect if the user is requesting to add a task
  const detectTaskRequest = (input: string): boolean => {
    const addTaskPatterns = [
      // Assignment/task mentions
      /have\s+an?\s+(assignment|project|task|presentation|essay|report|homework)/i,
      /need\s+to\s+(do|finish|complete|submit|prepare)\s+an?\s+(assignment|project|task|presentation|essay|report|homework)/i,
      /add\s+an?\s+(assignment|project|task|presentation|essay|report|homework)/i,
      /due\s+(on|by)\s+/i,
      /deadline\s+(on|for|is)/i,
      /coming\s+up\s+(on|next)/i,
      // Date mentions that often indicate tasks
      /(tomorrow|next week|this weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
    ];
    
    return addTaskPatterns.some(pattern => pattern.test(input));
  };

  // New function to create a task in the database
  const createTaskInDatabase = async (taskDetails: any) => {
    if (!user) return { success: false };
    
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: taskDetails.title,
          course: taskDetails.course,
          due_date: taskDetails.dueDate,
          priority: taskDetails.priority,
          user_id: user.id,
          completed: false
        });
      
      if (error) {
        console.error('Error adding task:', error);
        return { success: false, error };
      }
      
      toast.success("Task added to your deadlines!");
      return { success: true };
    } catch (error) {
      console.error('Failed to add task:', error);
      return { success: false, error };
    }
  };

  // New function to find the best time slots for a task
  const findOptimalTimeSlots = async (taskDetails: any) => {
    if (!user) return "I recommend scheduling this task when you're most productive.";
    
    const now = new Date();
    const dueDate = new Date(taskDetails.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate estimated time needed based on task type and priority
    let estimatedHours = 2; // Default
    
    if (taskDetails.title.toLowerCase().includes('presentation')) {
      estimatedHours = 3; // Presentations typically need more time
    } else if (taskDetails.title.toLowerCase().includes('essay')) {
      estimatedHours = 4; // Essays are usually longer
    } else if (taskDetails.title.toLowerCase().includes('quiz') || 
               taskDetails.title.toLowerCase().includes('test')) {
      estimatedHours = 2.5; // Study time for tests
    }
    
    // Adjust based on priority
    if (taskDetails.priority === 'high') {
      estimatedHours += 1;
    } else if (taskDetails.priority === 'low') {
      estimatedHours -= 0.5;
    }
    
    // Generate recommendations
    let recommendation = `I estimate this task will require about ${estimatedHours} hours to complete.`;
    
    // If due very soon, recommend urgent scheduling
    if (daysUntilDue <= 1) {
      recommendation += " Since this is due very soon, I recommend working on it today.";
      
      const currentHour = now.getHours();
      if (currentHour < 12) {
        recommendation += " Try to allocate time this afternoon between 2-5 PM.";
      } else if (currentHour < 17) {
        recommendation += " You should start on this as soon as possible, and possibly continue in the evening.";
      } else {
        recommendation += " Consider scheduling a focused evening session tonight from 7-9 PM.";
      }
    } else if (daysUntilDue <= 3) {
      // For tasks due within 3 days
      recommendation += " I suggest breaking this up into 2 sessions:";
      recommendation += "\n• Tomorrow: 1.5 hour session in the morning (9-10:30 AM)";
      recommendation += "\n• Day after: 1.5 hour session in the afternoon (2-3:30 PM)";
    } else {
      // For tasks with more time
      recommendation += " You have some time before this is due. I suggest:";
      recommendation += "\n• First session: Tomorrow from 4-5 PM for initial planning";
      recommendation += "\n• Main work: 2 hour block on " + formatDayOfWeek(now.getDay() + 2) + " morning";
      recommendation += "\n• Final review: 1 hour on " + formatDayOfWeek(now.getDay() + 4) + " afternoon";
    }
    
    return recommendation;
  };

  // Helper to format day of week
  const formatDayOfWeek = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum % 7];
  };

  // New function to find relevant resources for a task
  const findRelevantResources = async (taskDetails: any) => {
    // Extract keywords from task details
    const keywords = extractKeywords(taskDetails.title + " " + taskDetails.course);
    
    // In a real app, this would query an external API or database
    // For now, we'll generate mock resources based on the task details
    
    // Generate resources specific to the task type and subject
    return [
      {
        title: `${keywords[0]} explained - Complete guide`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keywords.join('+'))}`,
        description: `Comprehensive YouTube tutorials on ${keywords[0]}`
      },
      {
        title: `Best practices for ${taskDetails.title.split(' ').slice(0, 3).join(' ')}`,
        url: `https://scholar.google.com/scholar?q=${encodeURIComponent(keywords.join('+'))}`,
        description: 'Academic resources and research papers'
      },
      {
        title: `${taskDetails.course} learning resources`,
        url: `https://www.coursera.org/search?query=${encodeURIComponent(taskDetails.course)}`,
        description: 'Online courses and specialized materials'
      }
    ];
  };

  // Helper function to extract keywords from text
  const extractKeywords = (text: string): string[] => {
    // Remove common words and extract key terms
    const commonWords = ['a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'my', 'our', 'your'];
    
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !commonWords.includes(word) &&
        !/^\d+$/.test(word)
      )
      .slice(0, 5); // Take top 5 keywords
  };

  const getSuggestedTimeForTask = (taskDetails: any): string => {
    // Get current date info
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours();
    
    // Determine best days/times based on task type and priority
    let suggestion = "";
    
    if (taskDetails.priority === 'high') {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekday
        suggestion = "For high priority tasks like this, research shows that mornings (8-11 AM) are optimal for focused work. I suggest scheduling 2-3 focused sessions with breaks in between, starting tomorrow morning.";
      } else { // Weekend
        suggestion = "Since today is a weekend, I recommend starting this high priority task soon. Research shows that 10 AM - 12 PM is a productive weekend time slot when you're still fresh.";
      }
    } else if (taskDetails.priority === 'medium') {
      suggestion = "For medium priority tasks, mid-afternoon sessions (2-5 PM) when you've had time to build momentum are effective. Consider scheduling 45-minute focus blocks with 15-minute breaks.";
    } else { // low priority
      suggestion = "Low priority tasks are perfect for your energy dips, typically after lunch (1-2 PM) or later in the evening. This helps you maintain productivity throughout the day.";
    }
    
    return suggestion;
  };

  const generateFocusedSessions = (scheduleDetails: any): string => {
    // Calculate total duration in minutes
    const startParts = scheduleDetails.startTime.split(':').map(Number);
    const endParts = scheduleDetails.endTime.split(':').map(Number);
    
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const totalDuration = endMinutes - startMinutes;
    
    // If shorter than break interval, no breaks needed
    if (totalDuration <= breakPreferences.workDuration) {
      return `This session is shorter than your preferred work duration (${breakPreferences.workDuration} minutes), so no breaks are scheduled.`;
    }
    
    // Calculate number of breaks needed
    const numberOfBreaks = Math.floor(totalDuration / breakPreferences.workDuration);
    
    if (numberOfBreaks === 0) {
      return "";
    }
    
    // Generate break schedule
    let breakSchedule = "I've optimized your session with these recommended breaks:\n\n";
    let currentMinutes = startMinutes;
    
    for (let i = 0; i < numberOfBreaks; i++) {
      currentMinutes += breakPreferences.workDuration;
      
      const breakHour = Math.floor(currentMinutes / 60);
      const breakMinute = currentMinutes % 60;
      const formattedHour = breakHour % 12 || 12;
      const amPm = breakHour < 12 ? 'AM' : 'PM';
      
      breakSchedule += `• Break at ${formattedHour}:${breakMinute.toString().padStart(2, '0')} ${amPm}: `;
      
      if (breakPreferences.remindToDrinkWater) {
        breakSchedule += "Drink water, ";
      }
      
      if (breakPreferences.remindToStretch) {
        breakSchedule += "stretch, ";
      }
      
      if (breakPreferences.remindToRestEyes) {
        breakSchedule += "rest your eyes, ";
      }
      
      breakSchedule = breakSchedule.slice(0, -2) + "\n"; // Remove trailing comma
      
      // Add break duration to current time
      currentMinutes += breakPreferences.breakDuration;
    }
    
    return breakSchedule;
  };
  
  const extractSubject = (input: string): string | null => {
    const commonSubjects = [
      'math', 'algebra', 'calculus', 'statistics', 'geometry', 'trigonometry',
      'physics', 'chemistry', 'biology', 'anatomy', 'ecology', 'geology',
      'history', 'geography', 'economics', 'sociology', 'psychology', 'philosophy',
      'english', 'literature', 'writing', 'grammar', 'poetry', 'shakespeare',
      'computer science', 'programming', 'coding', 'data structures', 'algorithms',
      'music', 'art', 'photography', 'design', 'architecture',
      'foreign language', 'spanish', 'french', 'german', 'chinese', 'japanese',
      'data analysis', 'analytics', 'business intelligence', 'machine learning', 'AI'
    ];
    
    for (const subject of commonSubjects) {
      if (input.toLowerCase().includes(subject)) {
        return subject.charAt(0).toUpperCase() + subject.slice(1);
      }
    }
    
    return null;
  };
  
  const generateResourceRecommendation = (subject: string, type: 'video' | 'article' | 'book'): string => {
    // In a real app, this would connect to a recommendation engine or database
    const resources = {
      math: {
        video: 'Khan Academy\'s "Calculus Essentials" - An excellent visual explanation of key concepts with practice problems',
        article: 'MIT OpenCourseWare\'s "Mathematics for Computer Science" - Comprehensive coverage with practical examples',
        book: '"How to Solve It" by George Pólya - A classic guide to mathematical problem-solving strategies'
      },
      physics: {
        video: 'Professor Walter Lewin\'s MIT Physics lectures - Known for clear demonstrations of complex concepts',
        article: 'PhysicsWorld\'s "Quantum Mechanics Made Simple" - A digestible introduction to quantum concepts',
        book: '"Six Easy Pieces" by Richard Feynman - Fundamental physics concepts explained in accessible language'
      },
      history: {
        video: 'Crash Course World History series - Engaging overview of major historical events and their connections',
        article: 'Smithsonian Magazine\'s "Turning Points in History" collection - In-depth analysis of pivotal moments',
        book: '"Sapiens" by Yuval Noah Harari - A thought-provoking perspective on human history'
      },
      programming: {
        video: 'CS50 Harvard Computer Science course - Comprehensive introduction to computer science fundamentals',
        article: 'dev.to\'s "Data Structures Explained" series - Visual explanations of essential programming concepts',
        book: '"Clean Code" by Robert C. Martin - Industry-standard practices for writing maintainable code'
      },
      'data analysis': {
        video: 'DataCamp\'s "Introduction to Data Analysis" - Step-by-step tutorials with practical examples',
        article: 'Towards Data Science\'s "Data Analysis Workflow" - Comprehensive methodology for analysis',
        book: '"Python for Data Analysis" by Wes McKinney - Essential techniques using Python and pandas'
      },
      default: {
        video: `Top-rated ${subject} course on educational platforms`,
        article: `Comprehensive ${subject} guide from academic journals`,
        book: `Best-selling ${subject} textbook with practical examples`
      }
    };
    
    // Get resources for the specific subject or use default
    const subjectKey = Object.keys(resources).find(key => 
      subject.toLowerCase().includes(key)
    ) || 'default';
    
    const subjectResources = resources[subjectKey as keyof typeof resources] || resources.default;
    return subjectResources[type];
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
    
    // Enhanced course detection
    const possibleCourses = words.filter(word => 
      /^[A-Z]{2,7}\d{3}$/i.test(word) || /^[A-Z]{2,4}$/i.test(word)
    );
    if (possibleCourses.length > 0) {
      course = possibleCourses[0].toUpperCase();
    } else {
      const subjects = [
        'math', 'science', 'history', 'english', 'physics', 'chemistry', 
        'biology', 'literature', 'computer', 'psychology', 'philosophy', 
        'economics', 'business', 'art', 'music', 'geography',
        'data analysis', 'analytics', 'statistics', 'research'
      ];
      for (const subject of subjects) {
        if (input.toLowerCase().includes(subject)) {
          course = subject.charAt(0).toUpperCase() + subject.slice(1);
          break;
        }
      }
    }
    
    // Improved title extraction with better inference
    if (input.includes('presentation') || input.includes('present')) {
      const presentationMatch = input.match(/presentation\s+(?:on|about)\s+(\w+(?:\s+\w+){0,6})/i);
      if (presentationMatch) {
        title = `${course} Presentation: ${presentationMatch[1]}`;
      } else {
        title = `${course} Presentation`;
      }
    } else if (input.includes('essay') || input.includes('write') || input.includes('writing')) {
      const essayMatch = input.match(/(?:essay|write|writing)\s+(?:on|about)\s+(\w+(?:\s+\w+){0,6})/i);
      if (essayMatch) {
        title = `${course} Essay: ${essayMatch[1]}`;
      } else {
        title = `${course} Essay`;
      }
    } else if (input.includes('project') || input.includes('assignment')) {
      const projectMatch = input.match(/(?:project|assignment)\s+(?:on|about)\s+(\w+(?:\s+\w+){0,6})/i);
      if (projectMatch) {
        title = `${course} Project: ${projectMatch[1]}`;
      } else {
        title = `${course} Project`;
      }
    } else if (input.includes('homework') || input.includes('problem set')) {
      title = `${course} Homework`;
    } else if (input.includes('research') || input.includes('study')) {
      title = `${course} Research`;
    } else {
      // Generic title with subject matter if detected
      const topicMatch = input.match(/(?:on|about)\s+(?:the\s+)?(\w+(?:\s+\w+){0,6})/i);
      if (topicMatch) {
        title = `${course}: ${topicMatch[1]}`;
      } else {
        title = `${course} Assignment`;
      }
    }
    
    // Enhanced due date parsing with better extraction
    const datePatterns = [
      // Explicit date mentions
      /due\s+(?:on|by)?\s+(?:this|next)?\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /due\s+(?:on|by)?\s+(?:the)?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      // Relative date mentions
      /due\s+(?:on|by)?\s+(tomorrow|this weekend|next week)/i,
      // MM/DD format
      /due\s+(?:on|by)?\s+(\d{1,2})\/(\d{1,2})/i,
      // "on Friday" / "next Monday" patterns
      /\b(?:on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    ];
    
    // Check each pattern for a match
    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        dueDate = parseDueDate(match[0]);
        break;
      }
    }
    
    // Better priority detection
    if (containsAny(input, ['high priority', 'important', 'urgent', 'critical', 'asap', 'as soon as possible'])) {
      priority = "high";
    } else if (containsAny(input, ['low priority', 'not urgent', 'not important', 'can wait', 'whenever'])) {
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
                      'psychology', 'philosophy', 'economics', 'business', 'art', 'music',
                      'data analysis', 'analytics', 'statistics', 'research'];
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

  // Mock functions for creating tasks and schedule items
  const createTask = async (taskDetails: any) => {
    // In a real app, this would save to a tasks table
    console.log('Creating task:', taskDetails);
    return { success: true };
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
        console.error('Error adding schedule item:', error);
        return { success: false };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to add schedule item:', error);
      return { success: false };
    }
  };

  // Speech recognition functions
  const startListening = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setInput(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
    recognitionRef.current = recognition;
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          EduBuddy Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-3",
                message.sender === 'user' 
                  ? "bg-accent text-accent-foreground ml-6" 
                  : "bg-secondary text-secondary-foreground mr-6"
              )}
            >
              {message.sender === 'ai' ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="EduBuddy" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="You" />
                  <AvatarFallback className="bg-background border border-accent text-xs">You</AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="whitespace-pre-line break-words text-sm">
                  {message.content}
                </p>
                <div className="mt-1 text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start gap-3 rounded-lg p-3 bg-secondary mr-6">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="EduBuddy" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse-light"></div>
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse-light delay-150"></div>
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse-light delay-300"></div>
              </div>
            </div>
          )}
          
          <div ref={endOfMessagesRef} />
        </div>
        
        <div className="relative mt-auto">
          <Input
            placeholder="Ask me anything about your schedule..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="pr-20"
          />
          <div className="absolute right-1 top-1 flex space-x-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? (
                <StopCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              onClick={handleSendMessage}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;
