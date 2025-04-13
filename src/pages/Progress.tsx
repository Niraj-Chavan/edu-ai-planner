
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Clock, CheckCircle, BarChart2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from "@/components/ui/progress";

const Progress = () => {
  const { user } = useAuth();
  const [taskCompletion, setTaskCompletion] = useState(0);
  const [studyHours, setStudyHours] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchProgressData = async () => {
      try {
        // Fetch tasks for completion rate
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
          
        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
        } else if (tasksData && tasksData.length > 0) {
          const completedTasks = tasksData.filter(task => task.completed).length;
          const completionRate = Math.round((completedTasks / tasksData.length) * 100);
          setTaskCompletion(completionRate);
          
          // Generate category data
          const courseCount: Record<string, number> = {};
          tasksData.forEach(task => {
            const course = task.course || 'Uncategorized';
            courseCount[course] = (courseCount[course] || 0) + 1;
          });
          
          const categoryPieData = Object.entries(courseCount).map(([name, value]) => ({
            name,
            value
          }));
          
          setCategoryData(categoryPieData);
        }
        
        // Fetch schedule items for study hours
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('schedule_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('category', 'study');
          
        if (scheduleError) {
          console.error('Error fetching schedule items:', scheduleError);
        } else if (scheduleData && scheduleData.length > 0) {
          let totalMinutes = 0;
          
          scheduleData.forEach(item => {
            const startTime = item.start_time.split(':').map(Number);
            const endTime = item.end_time.split(':').map(Number);
            
            const startMinutes = startTime[0] * 60 + startTime[1];
            const endMinutes = endTime[0] * 60 + endTime[1];
            
            totalMinutes += endMinutes - startMinutes;
          });
          
          setStudyHours(Math.round(totalMinutes / 60 * 10) / 10); // Round to 1 decimal place
        }
        
        // Generate weekly data
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const weeklyProgressData = days.map(day => {
          // For demo, generate some random data
          // In a real app, you would use actual user data grouped by day
          return {
            name: day,
            'Tasks Completed': Math.floor(Math.random() * 5),
            'Study Hours': Math.floor(Math.random() * 6) + 1
          };
        });
        
        setWeeklyData(weeklyProgressData);
        
      } catch (error) {
        console.error('Error fetching progress data:', error);
      }
    };
    
    fetchProgressData();
  }, [user]);
  
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Progress Tracker</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Task Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{taskCompletion}%</div>
              <Progress value={taskCompletion} className="h-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Study Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{studyHours}</div>
              <p className="text-xs text-muted-foreground">Total hours spent studying</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                Active Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{categoryData.length}</div>
              <p className="text-xs text-muted-foreground">Courses with active assignments</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-muted-foreground" />
                Weekly Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Tasks Completed" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Study Hours" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Course Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Progress;
