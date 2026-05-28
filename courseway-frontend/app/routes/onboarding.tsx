import { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card";
import { Label } from "../components/ui/label";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Store the user's input across all steps
  const [formData, setFormData] = useState({
    faculty: "", // Added faculty
    major: "",
    year: "Year 1",
    modules: [] as string[], // Explicitly define as an array of strings
    goals: ""
  });

  const [moduleSearch, setModuleSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch modules when the user types
  useEffect(() => {
    const searchModules = async () => {
      // Only search if they've typed at least 2 characters
      if (moduleSearch.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const res = await fetch(`http://localhost:3001/modules?search=${moduleSearch}`);
        const data = await res.json();
        setSearchResults(data.modules || []);
      } catch (error) {
        console.error("Failed to fetch modules:", error);
      } finally {
        setIsSearching(false);
      }
    };

    // Wait 300ms after the user stops typing to fetch
    const timer = setTimeout(searchModules, 300);
    return () => clearTimeout(timer);
  }, [moduleSearch]);

  // Functions to handle adding/removing modules from the list
  const addModule = (moduleCode: string) => {
    if (!formData.modules.includes(moduleCode)) {
      setFormData(prev => ({ ...prev, modules: [...prev.modules, moduleCode] }));
    }
    setModuleSearch(""); // Clear the search bar after selecting
    setSearchResults([]); 
  };

  const removeModule = (moduleCode: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter(m => m !== moduleCode)
    }));
  };

  // Handle standard text inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle shadcn select (it passes the value directly, not an event object)
  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  

 const handleFinish = async (e: React.MouseEvent) => {
    e.preventDefault(); // 2. Stop the browser from refreshing!
    
    setIsLoading(true);
    setErrorMessage("");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const yearOfStudyInt = parseInt(formData.year.replace(/\D/g, '')) || 1; 

      const profilePayload = {
        major: formData.major,
        // Now using the actual faculty the user selected in Step 1!
        faculty: formData.faculty || "School of Computing", 
        cohortYear: "AY2024/25", // (You can make a dropdown for this later if you want)
        yearOfStudy: yearOfStudyInt,
      };

      const profileRes = await fetch("http://localhost:3001/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(profilePayload),
      });

      if (!profileRes.ok) {
        const errorData = await profileRes.json();
        throw new Error(errorData.message || "Failed to save profile. Please check your inputs.");
      }

      if (formData.modules.length > 0) {
        const moduleRes = await fetch("http://localhost:3001/profile/modules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ moduleCodes: formData.modules }),
        });
        
        if (!moduleRes.ok) {
           const errorData = await moduleRes.json();
           throw new Error(errorData.message || "Profile saved, but failed to save modules.");
        }
      }

      console.log("Onboarding complete!");
      navigate("/"); 

    } catch (error: any) {
      console.error("Error saving onboarding data:", error.message);
      // Display the error on the screen
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Step {step} of 3</CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* STEP 1: Profile Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Tell us about yourself</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="faculty">Faculty</Label>
                  <Select 
                    value={formData.faculty} 
                    onValueChange={(val) => handleSelectChange(val, "faculty")}
                  >
                    <SelectTrigger><SelectValue placeholder="e.g., School of Computing" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="School of Computing">School of Computing</SelectItem>
                      <SelectItem value="Faculty of Science">Faculty of Science</SelectItem>
                      <SelectItem value="School of Business">School of Business</SelectItem>
                      <SelectItem value="College of Design and Engineering">College of Design and Engineering</SelectItem>
                      <SelectItem value="Faculty of Arts and Social Sciences">Faculty of Arts and Social Sciences</SelectItem>
                      <SelectItem value="Yong Loo Lin School of Medicine">Yong Loo Lin School of Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="major">Major</Label>
                  <Input 
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Current Year</Label>
                  <Select 
                    value={formData.year} 
                    onValueChange={(val) => handleSelectChange(val, "year")}
                  >
                    <SelectTrigger><SelectValue placeholder="Select your year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Year 1">Year 1</SelectItem>
                      <SelectItem value="Year 2">Year 2</SelectItem>
                      <SelectItem value="Year 3">Year 3</SelectItem>
                      <SelectItem value="Year 4">Year 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Module Selection */}
          {step === 2 && (
            <div className="space-y-6 min-h-[300px]">
              <h2 className="text-lg font-semibold">What modules have you finished?</h2>
              
              <div className="space-y-4 relative">
                {/* Search Input */}
                <div className="relative">
                  <Input
                    placeholder="Search for a module (e.g., CS2040)..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Floating Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                    {searchResults.map((mod) => (
                      <div
                        key={mod.moduleCode}
                        className="px-4 py-3 hover:bg-muted cursor-pointer flex flex-col transition-colors border-b last:border-0"
                        onClick={() => addModule(mod.moduleCode)}
                      >
                        <span className="font-bold text-sm">{mod.moduleCode}</span>
                        <span className="text-xs text-muted-foreground truncate">{mod.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Modules Badges */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {formData.modules.length === 0 ? (
                    <p className="text-sm text-muted-foreground w-full text-center py-4">No modules added yet.</p>
                  ) : (
                    formData.modules.map(code => (
                      <div 
                        key={code} 
                        className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                      >
                        {code}
                        <button 
                          onClick={() => removeModule(code)} 
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">What are your academic goals?</h2>
              <div className="space-y-2">
                <Label htmlFor="goals">Your Goals</Label>
                <Textarea 
                  id="goals"
                  name="goals"
                  value={formData.goals}
                  onChange={handleChange}
                  placeholder="e.g., I want to focus on Artificial Intelligence and machine learning..." 
                  className="min-h-[120px]"
                />
              </div>
              
              {/* NEW: Display error messages here */}
              {errorMessage && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isLoading}>
              Back
            </Button>
          ) : (
            <div></div> 
          )}

          {step < 3 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button type="button" onClick={handleFinish} disabled={isLoading}>
              {isLoading ? "Saving..." : "Finish Setup"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}