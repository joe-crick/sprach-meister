import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { UserSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAudio } from "@/lib/audio";
import { GermanWordAudioButton } from "@/components/audio-button";
import { Globe, MessageCircle, Clock, Bell, Smartphone } from "lucide-react";

export default function Settings() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    isSupported: audioSupported, 
    speechRate, 
    setSpeechRate, 
    speechVolume, 
    setSpeechVolume 
  } = useAudio();

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Initialize phone number when settings load
  useEffect(() => {
    if (settings?.phoneNumber) {
      setPhoneNumber(settings.phoneNumber);
    }
  }, [settings?.phoneNumber]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const response = await apiRequest("PUT", "/api/settings", { 
        ...updates, 
        userId: "default_user" 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setHasUnsavedChanges(false);
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const exportProgressMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/vocabulary", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch data for export");
      return response.json();
    },
    onSuccess: (data) => {
      // Convert data to CSV format
      const csvContent = [
        ["German", "Article", "English", "Category", "Example Sentence", "Example Translation", "Memory Tip"].join(","),
        ...data.map((word: any) => [
          word.german,
          word.article,
          word.english,
          word.category,
          word.exampleSentence || "",
          word.exampleTranslation || "",
          word.memoryTip || ""
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `german-vocabulary-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Your vocabulary data has been downloaded as a CSV file.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would be a dedicated reset endpoint
      const response = await apiRequest("POST", "/api/progress/reset", { userId: "default_user" });
      return response.json();
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Failed to reset progress. This feature will be available soon.",
        variant: "destructive",
      });
    }
  });

  const handleSettingChange = (field: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    const updates = { [field]: value };
    updateSettingsMutation.mutate(updates);
  };

  const handleResetProgress = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all your learning progress? This action cannot be undone."
    );
    if (confirmed) {
      resetProgressMutation.mutate();
    }
  };

  const handleSavePhoneNumber = () => {
    if (!settings) return;
    
    updateSettingsMutation.mutate({ phoneNumber: phoneNumber });
  };

  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/settings/test-notification", { 
        phoneNumber: phoneNumber || settings?.phoneNumber 
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test SMS Sent!",
        description: `SMS sent successfully to your phone. ${data.quotaRemaining ? `Remaining free SMS: ${data.quotaRemaining}` : ""}`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to send test SMS";
      toast({
        title: "SMS Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleTestNotification = () => {
    const phoneToTest = phoneNumber || settings?.phoneNumber;
    if (!phoneToTest) {
      toast({
        title: "No Phone Number",
        description: "Please enter and save a phone number first.",
        variant: "destructive",
      });
      return;
    }
    
    testNotificationMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings Not Found</h2>
            <p className="text-gray-600">Unable to load your settings. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
          <p className="text-gray-600">Customize your learning experience</p>
        </div>

        <div className="space-y-6">
          {/* Language & Region Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Application Language
                </Label>
                <Select
                  value={settings.language || "english"}
                  onValueChange={(value) => handleSettingChange("language", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="german">Deutsch (German)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  Choose your preferred language for the SprachMeister interface
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SMS Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                SMS Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-900">
                    Enable SMS Reminders
                  </Label>
                  <p className="text-sm text-gray-600">
                    Get daily practice reminders via SMS text message
                  </p>
                </div>
                <Switch
                  checked={settings.enableSmsReminders || false}
                  onCheckedChange={(checked) => handleSettingChange("enableSmsReminders", checked)}
                />
              </div>

              {settings.enableSmsReminders && (
                <>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 mb-2 block">
                      Phone Number for SMS
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1234567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSavePhoneNumber}
                        disabled={updateSettingsMutation.isPending || phoneNumber === (settings?.phoneNumber || "")}
                        size="sm"
                        className="px-4"
                      >
                        {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button 
                        onClick={handleTestNotification}
                        disabled={testNotificationMutation.isPending || (!phoneNumber && !settings?.phoneNumber)}
                        size="sm"
                        variant="outline"
                        className="px-4"
                      >
                        {testNotificationMutation.isPending ? "Testing..." : "Test"}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Include country code (e.g., +49 for Germany, +1 for US/Canada). Use the Test button to verify SMS delivery.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="reminderTime" className="text-sm font-medium text-gray-700 mb-2 block">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Daily Reminder Time
                    </Label>
                    <Input
                      id="reminderTime"
                      type="time"
                      value={settings.reminderTime || "18:00"}
                      onChange={(e) => handleSettingChange("reminderTime", e.target.value)}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Choose when you'd like to receive your daily practice reminder
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">SMS Reminders Information</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Daily SMS messages sent to remind you to practice German</li>
                      <li>• Messages include motivational content and learning tips</li>
                      <li>• Free SMS testing may have country restrictions</li>
                      <li>• For reliable delivery, consider using Twilio or similar services</li>
                      <li>• You can disable reminders anytime in these settings</li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-900 mb-2">⚠️ SMS Testing Notice</h4>
                    <p className="text-sm text-amber-800">
                      Free SMS services may not work in all countries due to abuse prevention. 
                      If SMS testing fails, the app will still track your learning progress and you can use browser notifications as an alternative.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Learning Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  New words per session
                </Label>
                <Select
                  value={String(settings.newWordsPerSession)}
                  onValueChange={(value) => handleSettingChange("newWordsPerSession", parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 words</SelectItem>
                    <SelectItem value="10">10 words</SelectItem>
                    <SelectItem value="15">15 words</SelectItem>
                    <SelectItem value="20">20 words</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Review session size
                </Label>
                <Select
                  value={String(settings.reviewSessionSize)}
                  onValueChange={(value) => handleSettingChange("reviewSessionSize", parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 words</SelectItem>
                    <SelectItem value="25">25 words</SelectItem>
                    <SelectItem value="35">35 words</SelectItem>
                    <SelectItem value="50">50 words</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-900">
                    Auto-pronounce words during learning
                  </Label>
                  <p className="text-sm text-gray-600">
                    Automatically play pronunciation when learning new words
                  </p>
                </div>
                <Switch
                  checked={settings.autoPronounce}
                  onCheckedChange={(checked) => handleSettingChange("autoPronounce", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-900">
                    Show memory tips and mnemonics
                  </Label>
                  <p className="text-sm text-gray-600">
                    Display helpful memory aids during learning
                  </p>
                </div>
                <Switch
                  checked={settings.showTips}
                  onCheckedChange={(checked) => handleSettingChange("showTips", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Settings */}
          {audioSupported && (
            <Card>
              <CardHeader>
                <CardTitle>Audio Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Speech Speed
                  </Label>
                  <div className="px-3">
                    <Slider
                      value={[speechRate]}
                      onValueChange={(values) => setSpeechRate(values[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slow</span>
                      <span>Normal</span>
                      <span>Fast</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Speech Volume
                  </Label>
                  <div className="px-3">
                    <Slider
                      value={[speechVolume]}
                      onValueChange={(values) => setSpeechVolume(values[0])}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Quiet</span>
                      <span>Medium</span>
                      <span>Loud</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Test Audio
                  </Label>
                  <div className="flex items-center gap-3">
                    <GermanWordAudioButton 
                      german="Hund" 
                      article="der"
                      showLabel={true}
                      variant="outline"
                    />
                    <span className="text-sm text-gray-600">Try pronunciation settings</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spaced Repetition Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Spaced Repetition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Algorithm difficulty
                </Label>
                <Select
                  value={settings.spacedRepetitionDifficulty}
                  onValueChange={(value) => handleSettingChange("spacedRepetitionDifficulty", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (longer intervals)</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hard">Hard (shorter intervals)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-900">
                    Enable review notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Get reminded when it's time to review words
                  </p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => handleSettingChange("enableNotifications", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Export Vocabulary</h4>
                  <p className="text-sm text-gray-500">Download your vocabulary as CSV file</p>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/api/export/vocabulary';
                    link.download = `german-vocabulary-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast({
                      title: "Export Started",
                      description: "Your vocabulary CSV download has started.",
                    });
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  Export CSV
                </Button>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Export Database Schema</h4>
                  <p className="text-sm text-gray-500">Download complete database structure as JSON</p>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/api/export/schema';
                    link.download = 'sprachmeister-schema.json';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast({
                      title: "Schema Export Started",
                      description: "Database schema download has started.",
                    });
                  }}
                  variant="outline"
                >
                  Export Schema
                </Button>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Reset Progress</h4>
                  <p className="text-sm text-gray-500">Clear all learning progress and start over</p>
                </div>
                <Button
                  onClick={handleResetProgress}
                  disabled={resetProgressMutation.isPending}
                  variant="destructive"
                >
                  {resetProgressMutation.isPending ? "Resetting..." : "Reset"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
