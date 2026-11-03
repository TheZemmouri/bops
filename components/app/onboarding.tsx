"use client";

import { useState } from "react";
import { getAllTemplates, type IndustryTemplate } from "@/lib/industry-templates";

export type OnboardingData = {
  businessName: string;
  industry?: string;
  website?: string;
  description?: string;
  templateId?: string;
};

type OnboardingProps = {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
};

export function OnboardingFlow({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    industry: "",
    website: "",
    description: "",
  });
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const templates = getAllTemplates();

  const handleNext = () => {
    if (step === 1 && !data.businessName.trim()) {
      alert("Please enter your business name");
      return;
    }
    if (step === 2 && !selectedTemplate) {
      alert("Please select a template or skip to customize later");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({
        ...data,
        templateId: selectedTemplate?.id,
      });
    }
  };

  const handleTemplateSelect = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    setData({ ...data, industry: template.name });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Welcome to Bops</h2>
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip setup
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      s <= step
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        s < step ? "bg-blue-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Business Info</span>
              <span>Choose Template</span>
              <span>Review</span>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">
                Tell us about your business
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={data.businessName}
                  onChange={(e) =>
                    setData({ ...data, businessName: e.target.value })
                  }
                  placeholder="Acme Auto Sales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Website (optional)
                </label>
                <input
                  type="url"
                  value={data.website}
                  onChange={(e) => setData({ ...data, website: e.target.value })}
                  placeholder="https://acmeauto.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Brief Description (optional)
                </label>
                <textarea
                  value={data.description}
                  onChange={(e) =>
                    setData({ ...data, description: e.target.value })
                  }
                  placeholder="We sell used cars and provide financing..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">
                Choose your bot team template
              </h3>
              <p className="text-gray-600 mb-4">
                Select the template that best matches your business. Each comes with
                pre-configured bots and routines.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`text-left p-4 border rounded-lg hover:shadow-md transition ${
                      selectedTemplate?.id === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="text-3xl mr-3">{template.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {template.description}
                        </p>
                        <div className="text-xs text-gray-500">
                          Includes {template.bots.length} specialized bots
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && selectedTemplate && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Ready to set up</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="font-medium">Business:</span> {data.businessName}
                </div>
                {data.website && (
                  <div>
                    <span className="font-medium">Website:</span> {data.website}
                  </div>
                )}
                <div>
                  <span className="font-medium">Template:</span>{" "}
                  {selectedTemplate.icon} {selectedTemplate.name}
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Your bot team:</h4>
                <div className="space-y-3">
                  {selectedTemplate.bots.map((bot, i) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="font-medium">{bot.name}</div>
                      <div className="text-sm text-gray-600">{bot.role}</div>
                      {bot.suggestedRoutines && (
                        <div className="text-xs text-gray-500 mt-1">
                          {bot.suggestedRoutines.length} suggested routines
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  💡 After setup, you can customize each bot&apos;s instructions,
                  add routines, and connect your apps.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {step === 3 ? "Create Team" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
