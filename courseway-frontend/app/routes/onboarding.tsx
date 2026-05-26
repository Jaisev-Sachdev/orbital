import { useState } from "react";
import { useNavigate } from "react-router-dom";
// Assuming you have installed these components via shadcn CLI
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
    major: "",
    year: "Year 1",
    modules: [], 
    goals: ""
  });

  // Handle standard text inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle shadcn select (it passes the value directly, not an event object)
  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFinish = async () => {
    // Logic to save formData to PostgreSQL goes here!
    console.log("Saving data:", formData);
    navigate("/dashboard"); 
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Step {step} of 3</CardTitle>
        </CardHeader>
        
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Tell us about yourself</h2>
                
                <div className="space-y-4">
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select your year" />
                      </SelectTrigger>
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">What modules have you finished?</h2>
              {/* Module search/chips go here - Consider using shadcn Command component later */}
              <div className="min-h-[100px] border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground text-sm">
                Module selection UI goes here
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
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div></div> // Spacer to keep "Next" on the right when there's no "Back" button
          )}

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button onClick={handleFinish}>Finish Setup</Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}