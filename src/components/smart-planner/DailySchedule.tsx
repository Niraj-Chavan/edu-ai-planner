
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  category: 'study' | 'class' | 'assignment' | 'break' | 'personal';
}

type ScheduleItem = Database['public']['Tables']['schedule_items']['Row'];

const DailySchedule = () => {
  const { user } = useAuth();
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Calculus Lecture',
      startTime: '09:00',
      endTime: '10:30',
      completed: true,
      category: 'class'
    },
    {
      id: '2',
      title: 'Study Break',
      startTime: '10:30',
      endTime: '11:00',
      completed: true,
      category: 'break'
    },
    {
      id: '3',
      title: 'Computer Science Project',
      startTime: '11:00',
      endTime: '13:00',
      completed: false,
      category: 'assignment'
    },
    {
      id: '4',
      title: 'Lunch',
      startTime: '13:00',
      endTime: '14:00',
      completed: false,
      category: 'personal'
    },
    {
      id: '5',
      title: 'Physics Study Session',
      startTime: '14:00',
      endTime: '16:00',
      completed: false,
      category: 'study'
    },
    {
      id: '6',
      title: 'Literature Essay',
      startTime: '16:30',
      endTime: '18:30',
      completed: false,
      category: 'assignment'
    }
  ]);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data, error } = await supabase
          .from('schedule_items')
          .select('*')
          .eq('user_id', user?.id)
          .order('start_time', { ascending: true });
        
        if (error) {
          console.error('Error fetching schedule:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const formattedTasks: Task[] = data.map((item: ScheduleItem) => ({
            id: item.id,
            title: item.title,
            startTime: item.start_time,
            endTime: item.end_time,
            completed: item.completed || false,
            category: (item.category as Task['category']) || 'study'
          }));
          
          setTodaysTasks(formattedTasks);
        }
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
      }
    };
    
    if (user) {
      fetchSchedule();
    }
  }, [user]);

  const toggleTaskCompletion = async (taskId: string) => {
    if (!user) return;
    
    // Find the task to update
    const taskToUpdate = todaysTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    // Optimistic update UI
    setTodaysTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
    
    try {
      const { error } = await supabase
        .from('schedule_items')
        .update({ 
          completed: !taskToUpdate.completed,
          user_id: user.id 
        })
        .eq('id', taskId);
        
      if (error) {
        console.error('Error updating task completion:', error);
        // Revert the UI state if there was an error
        setTodaysTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, completed: taskToUpdate.completed } : task
        ));
        toast.error("Couldn't update task status");
      }
    } catch (error) {
      console.error('Failed to update task completion:', error);
      // Revert the UI state if there was an error
      setTodaysTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: taskToUpdate.completed } : task
      ));
      toast.error("Couldn't update task status");
    }
  };

  const getCategoryColor = (category: Task['category']) => {
    switch (category) {
      case 'study':
        return 'bg-blue-100 text-blue-800';
      case 'class':
        return 'bg-purple-100 text-purple-800';
      case 'assignment':
        return 'bg-amber-100 text-amber-800';
      case 'break':
        return 'bg-green-100 text-green-800';
      case 'personal':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Today's Schedule</span>
          <span className="text-sm font-normal flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {todaysTasks.map((task) => (
            <div 
              key={task.id} 
              className={cn(
                "flex items-start p-3 rounded-md transition-colors",
                task.completed ? "bg-secondary/50" : "bg-card hover:bg-secondary/20",
                task.startTime <= currentTime && task.endTime >= currentTime && !task.completed && "border-l-4 border-accent"
              )}
            >
              <button 
                onClick={() => toggleTaskCompletion(task.id)}
                className="mt-0.5 mr-3 flex-shrink-0 outline-none"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  task.completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                <div className="flex items-center mt-1 gap-2">
                  <span className="text-xs text-muted-foreground">
                    {task.startTime} - {task.endTime}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    getCategoryColor(task.category)
                  )}>
                    {task.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailySchedule;
