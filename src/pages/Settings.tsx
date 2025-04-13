
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";
import { User, Settings as SettingsIcon, Bell, Shield, Moon, Sun } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    displayName: '',
    educationLevel: '',
    major: ''
  });
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    studyReminders: true,
    deadlineAlerts: true,
    aiSuggestions: true
  });
  
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile({
            displayName: data.display_name || '',
            educationLevel: data.education_level || '',
            major: data.major || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    
    fetchProfile();
  }, [user]);
  
  const updateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.displayName,
          education_level: profile.educationLevel,
          major: profile.major,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating profile:', error);
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast.success(`Switched to ${newTheme} theme`);
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your personal information and academic details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input 
                        id="displayName" 
                        value={profile.displayName} 
                        onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ''} disabled />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Academic Information</h3>
                    <p className="text-sm text-muted-foreground">
                      This helps personalize your study recommendations
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="educationLevel">Education Level</Label>
                      <select 
                        id="educationLevel" 
                        value={profile.educationLevel} 
                        onChange={(e) => setProfile({...profile, educationLevel: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select...</option>
                        <option value="high_school">High School</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="graduate">Graduate</option>
                        <option value="phd">PhD</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major">Field of Study / Major</Label>
                      <Input 
                        id="major" 
                        value={profile.major} 
                        onChange={(e) => setProfile({...profile, major: e.target.value})}
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </div>
                </div>
                
                <Button onClick={updateProfile} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Customize how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications" 
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => {
                        setNotifications({...notifications, emailNotifications: checked});
                        toast.success(`Email notifications ${checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="studyReminders">Study Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notifications before scheduled study sessions
                      </p>
                    </div>
                    <Switch 
                      id="studyReminders" 
                      checked={notifications.studyReminders}
                      onCheckedChange={(checked) => {
                        setNotifications({...notifications, studyReminders: checked});
                        toast.success(`Study reminders ${checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="deadlineAlerts">Deadline Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts for upcoming assignment deadlines
                      </p>
                    </div>
                    <Switch 
                      id="deadlineAlerts" 
                      checked={notifications.deadlineAlerts}
                      onCheckedChange={(checked) => {
                        setNotifications({...notifications, deadlineAlerts: checked});
                        toast.success(`Deadline alerts ${checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="aiSuggestions">AI Suggestions</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow AI to suggest schedule optimizations
                      </p>
                    </div>
                    <Switch 
                      id="aiSuggestions" 
                      checked={notifications.aiSuggestions}
                      onCheckedChange={(checked) => {
                        setNotifications({...notifications, aiSuggestions: checked});
                        toast.success(`AI suggestions ${checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </div>
                </div>
                
                <Button onClick={() => toast.success("Notification preferences saved")}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize the look and feel of your application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Theme</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose between light and dark mode
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={toggleTheme}
                      className="h-8 w-10"
                    >
                      {theme === 'light' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Color Accent</Label>
                    <div className="flex gap-2">
                      {['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-amber-500'].map((color) => (
                        <button
                          key={color}
                          className={`h-8 w-8 rounded-full ${color}`}
                          onClick={() => toast.success("Accent color updated")}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button onClick={() => toast.success("Appearance settings saved")}>
                  Save Appearance
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Manage your privacy and data settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dataCollection">Data Collection</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow anonymous usage data collection to improve the service
                      </p>
                    </div>
                    <Switch 
                      id="dataCollection" 
                      checked={true}
                      onCheckedChange={() => toast.success("Data collection preference updated")}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Data Export</Label>
                    <p className="text-sm text-muted-foreground">
                      Download a copy of your personal data
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => toast.success("Data export initiated. Check your email.")}
                    >
                      Export Data
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <div className="flex flex-col space-y-2">
                      <Button 
                        variant="outline" 
                        onClick={() => toast.success("Password reset email sent")}
                      >
                        Change Password
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => toast.error("This feature is disabled in the demo")}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
