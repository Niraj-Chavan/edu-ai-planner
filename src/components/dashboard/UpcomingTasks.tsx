
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  course: string;
  completed: boolean;
}

type Task = Database['public']['Tables']['tasks']['Row'];

const UpcomingTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UpcomingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true })
          .limit(5);
        
        if (error) {
          console.error('Error fetching tasks:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const formattedTasks: UpcomingTask[] = data.map((task: Task) => ({
            id: task.id,
            title: task.title,
            dueDate: task.due_date || new Date().toISOString(),
            priority: (task.priority as 'high' | 'medium' | 'low') || 'medium',
            course: task.course || 'N/A',
            completed: task.completed || false
          }));
          
          setTasks(formattedTasks);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
    
    // Setup a subscription to listen for changes
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleTaskCompletion = async (taskId: string) => {
    if (!user) return;
    
    // Find the task to update
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    // Optimistic update UI
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: !taskToUpdate.completed,
          user_id: user.id 
        })
        .eq('id', taskId);
        
      if (error) {
        console.error('Error updating task completion:', error);
        // Revert the UI state if there was an error
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, completed: taskToUpdate.completed } : task
        ));
        toast.error("Couldn't update task status");
      } else {
        toast.success(taskToUpdate.completed ? "Task marked as incomplete" : "Task completed!");
      }
    } catch (error) {
      console.error('Failed to update task completion:', error);
      // Revert the UI state if there was an error
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: taskToUpdate.completed } : task
      ));
      toast.error("Couldn't update task status");
    }
  };

  const getPriorityBadgeClass = (priority: UpcomingTask['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300';
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Overdue', urgent: true };
    } else if (diffDays === 0) {
      return { text: 'Due today', urgent: true };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', urgent: true };
    } else if (diffDays < 7) {
      return { text: `Due in ${diffDays} days`, urgent: false };
    } else {
      return { 
        text: `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
        urgent: false 
      };
    }
  };

  const goToAIChat = () => {
    navigate('/');
    // Slight delay to allow the page to render before focusing
    setTimeout(() => {
      const chatInput = document.querySelector('input[placeholder*="schedule"]') as HTMLInputElement;
      if (chatInput) {
        chatInput.focus();
        chatInput.value = "Add a new task called ";
      }
    }, 300);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Upcoming Deadlines
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={goToAIChat}
          >
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-2 flex justify-center">
              <ClipboardList className="h-12 w-12 opacity-20" />
            </div>
            <p>No upcoming tasks!</p>
            <p className="text-xs mt-1">Chat with the AI assistant to create tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const dueInfo = formatDueDate(task.dueDate);
              
              return (
                <div 
                  key={task.id}
                  className={cn(
                    "p-3 border border-border rounded-md flex items-start gap-3 transition-colors",
                    task.completed ? "bg-secondary/30" : "hover:bg-secondary/10"
                  )}
                >
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle className="h-5 w-5 text-accent" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                  </button>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className={cn(
                        "font-medium text-sm",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </h4>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full ml-2",
                        getPriorityBadgeClass(task.priority)
                      )}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="flex mt-1 text-xs text-muted-foreground">
                      <span className="bg-secondary px-1.5 py-0.5 rounded">
                        {task.course}
                      </span>
                      <span className={cn(
                        "ml-2 flex items-center gap-1",
                        dueInfo.urgent && !task.completed && "text-red-600 dark:text-red-400"
                      )}>
                        {dueInfo.urgent && !task.completed && <AlertCircle className="h-3 w-3" />}
                        {dueInfo.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingTasks;
