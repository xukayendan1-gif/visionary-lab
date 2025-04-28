"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { getEnvironmentVariables, getApiStatus } from "@/utils/env-utils";
import { Loader2, Check, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define types for settings
type Resolution = "1024x1024" | "1024x1792" | "1792x1024";
type Variants = "1" | "2" | "3" | "4";
type Mode = "dev" | "sora";

interface ImageSettings {
  resolution: Resolution;
  variants: Variants;
  mode: Mode;
  analyzeImage: boolean;
  saveHistory: boolean;
  maxHistoryItems: number;
}

interface EnvVariables {
  NODE_ENV: string;
  API_URL: string;
  APP_VERSION: string;
  DEBUG_MODE: boolean;
}

interface ApiStatus {
  services: {
    image_generation: boolean;
    llm: boolean;
    storage: boolean;
  };
  providers: {
    using_azure_openai: boolean;
    using_direct_openai: boolean;
  };
  summary: {
    all_services_ready: boolean;
    image_generation_client: string;
    llm_client: string;
    storage: string;
  };
}

export default function SettingsPage() {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<ImageSettings>({
    resolution: "1024x1024" as Resolution,
    variants: "1" as Variants,
    mode: "dev" as Mode,
    analyzeImage: false,
    saveHistory: true,
    maxHistoryItems: 10
  });

  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [apiStatusLoading, setApiStatusLoading] = useState(true);

  useEffect(() => {
    // Load saved settings from localStorage once on the client side
    const savedSettings = localStorage.getItem('imageSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    
    const fetchApiStatus = async () => {
      try {
        const data = await getApiStatus();
        setApiStatus(data);
      } catch (error) {
        console.error("Failed to fetch API status:", error);
      } finally {
        setApiStatusLoading(false);
      }
    };

    fetchApiStatus();
  }, []);

  const saveSettings = () => {
    localStorage.setItem('imageSettings', JSON.stringify(settings));
    alert("Settings saved successfully!");
  };

  const resetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaultSettings: ImageSettings = {
        resolution: "1024x1024" as Resolution,
        variants: "1" as Variants,
        mode: "dev" as Mode,
        analyzeImage: false,
        saveHistory: true,
        maxHistoryItems: 10
      };
      setSettings(defaultSettings);
      localStorage.setItem('imageSettings', JSON.stringify(defaultSettings));
    }
  };

  return (
    <>
      <PageHeader title="Settings" />
      
      <div className="flex flex-col h-full p-8">
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="api">API Status</TabsTrigger>
            <TabsTrigger value="image">Image Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Status</CardTitle>
                <CardDescription>Current status of API components</CardDescription>
              </CardHeader>
              <CardContent>
                {apiStatusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : apiStatus ? (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md font-medium flex items-center">
                          {apiStatus.summary.all_services_ready ? (
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                          )}
                          System Status
                        </CardTitle>
                        <CardDescription>
                          Overall status of essential services
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <div className={`h-3 w-3 rounded-full ${apiStatus.services.image_generation ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span>Image Generation: {apiStatus.summary.image_generation_client}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`h-3 w-3 rounded-full ${apiStatus.services.llm ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span>Language Model: {apiStatus.summary.llm_client}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`h-3 w-3 rounded-full ${apiStatus.services.storage ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span>Storage: {apiStatus.summary.storage}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`h-3 w-3 rounded-full bg-blue-500`} />
                            <span>Provider: {apiStatus.providers.using_azure_openai ? 'Azure OpenAI' : 'OpenAI'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Note Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md font-medium flex items-center">
                          <Info className="h-5 w-5 text-blue-500 mr-2" />
                          Configuration Note
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          The system is checking if clients are properly initialized and that the required environment variables are set.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                    <p>Failed to connect to the API.</p>
                    <p className="text-sm mt-1">Check if the API server is running at http://127.0.0.1:8000</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="image">
            <Card>
              <CardHeader>
                <CardTitle>Image Generation Settings</CardTitle>
                <CardDescription>
                  Configure your default settings for image generation with GPT-Image-1
                  <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-200">
                    Work in Progress - Not Fully Implemented
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="resolution">Image Size</Label>
                      <Select 
                        value={settings.resolution} 
                        onValueChange={(value) => setSettings({...settings, resolution: value as Resolution})}
                      >
                        <SelectTrigger id="resolution">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                          <SelectItem value="1024x1792">1024x1792 (Portrait)</SelectItem>
                          <SelectItem value="1792x1024">1792x1024 (Landscape)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="variants">Number of Variants</Label>
                      <Select 
                        value={settings.variants} 
                        onValueChange={(value) => setSettings({...settings, variants: value as Variants})}
                      >
                        <SelectTrigger id="variants">
                          <SelectValue placeholder="Select variants" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 image</SelectItem>
                          <SelectItem value="2">2 images</SelectItem>
                          <SelectItem value="3">3 images</SelectItem>
                          <SelectItem value="4">4 images</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="quality">Image Quality</Label>
                      <Select 
                        defaultValue="high"
                      >
                        <SelectTrigger id="quality">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">Additional Options</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="analyze">Analyze Generated Images</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically analyze generated images with AI
                        </p>
                      </div>
                      <Switch
                        id="analyze"
                        checked={settings.analyzeImage}
                        onCheckedChange={(checked) => 
                          setSettings({...settings, analyzeImage: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="save-history">Save Generation History</Label>
                        <p className="text-sm text-muted-foreground">
                          Save successful image generations to history
                        </p>
                      </div>
                      <Switch
                        id="save-history"
                        checked={settings.saveHistory}
                        onCheckedChange={(checked) => 
                          setSettings({...settings, saveHistory: checked})
                        }
                      />
                    </div>
                    
                    {settings.saveHistory && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="max-history">Maximum History Items</Label>
                        <Input
                          id="max-history"
                          type="number"
                          value={settings.maxHistoryItems}
                          onChange={(e) => 
                            setSettings({
                              ...settings, 
                              maxHistoryItems: parseInt(e.target.value) || 10
                            })
                          }
                          className="w-20"
                          min="1"
                          max="100"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetSettings}>Reset to Default</Button>
                    <Button onClick={saveSettings}>Save Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
} 