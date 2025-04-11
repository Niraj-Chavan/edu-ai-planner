
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  category: 'study' | 'class' | 'assignment' | 'break' | 'personal';
}

const DailySchedule = () => {
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchScheduleItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      const formattedTasks = data.map(item => ({
        id: item.id,
        title: item.title,
        startTime: item.start_time,
        endTime: item.end_time,
        completed: item.completed || false,
        category: item.category as Task['category'] || 'study'
      }));

      setTodaysTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching schedule items:', error);
      toast({
        title: "Error",
        description: "Failed to load your schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleItems();
  }, []);

  const toggleTaskCompletion = async (taskId: string) => {
    const taskToUpdate = todaysTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    const newCompletedState = !taskToUpdate.completed;

    try {
      const { error } = await supabase
        .from('schedule_items')
        .update({ completed: newCompletedState })
        .eq('id', taskId);

      if (error) throw error;

      setTodaysTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, completed: newCompletedState } : task
      ));

      toast({
        title: newCompletedState ? "Task Completed" : "Task Marked Incomplete",
        description: `${taskToUpdate.title} has been updated.`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive"
      });
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
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : todaysTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks scheduled for today</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedule;
