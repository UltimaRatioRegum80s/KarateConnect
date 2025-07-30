import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollCreatorProps {
  onCreatePoll: (pollData: { question: string; options: string[]; allowMultiple: boolean }) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export default function PollCreator({ onCreatePoll, onCancel, isCreating }: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    const validQuestion = question.trim();
    const validOptions = options.filter(opt => opt.trim().length > 0);
    
    if (validQuestion && validOptions.length >= 2) {
      onCreatePoll({
        question: validQuestion,
        options: validOptions,
        allowMultiple,
      });
    }
  };

  const canSubmit = question.trim().length > 0 && 
                   options.filter(opt => opt.trim().length > 0).length >= 2;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <span>Create Poll</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Question
          </label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full"
            maxLength={200}
          />
        </div>

        {/* Options */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="p-1 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {options.length < 10 && (
            <Button
              variant="ghost"
              onClick={addOption}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add option
            </Button>
          )}
        </div>

        {/* Settings */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowMultiple"
            checked={allowMultiple}
            onCheckedChange={(checked) => setAllowMultiple(!!checked)}
          />
          <label 
            htmlFor="allowMultiple" 
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Allow multiple selections
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isCreating}
            className="flex-1"
          >
            {isCreating ? "Creating..." : "Create Poll"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel
          </Button>
        </div>

        {/* Helper text */}
        <div className="text-xs text-gray-500 text-center">
          {options.filter(opt => opt.trim().length > 0).length}/10 options • 
          {question.length}/200 characters
        </div>
      </CardContent>
    </Card>
  );
}