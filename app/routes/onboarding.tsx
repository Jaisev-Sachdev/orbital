import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // This handles the "Final Submit" to the backend
  const handleFinish = () => {
    // Logic to save to PostgreSQL goes here later!
    navigate("/dashboard"); 
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Step {step} of 3</h1>

      {step === 1 && (
        <div>
          <h2>Tell us about yourself</h2>
          <input type="text" placeholder="Major (e.g., Computer Science)" />
          <select>
            <option>Year 1</option>
            <option>Year 2</option>
            <option>Year 3</option>
            <option>Year 4 </option>
          </select>
          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>What modules have you finished?</h2>
          {/* Module search/chips go here */}
          <button onClick={() => setStep(3)}>Next</button>
          <button onClick={() => setStep(1)}>Back</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>What are your academic goals?</h2>
          <textarea placeholder="e.g., I want to focus on AI..." />
          <button onClick={handleFinish}>Finish Setup</button>
            <button onClick={() => setStep(2)}>Back</button>
        </div>
      )}
    </main>
  );
}