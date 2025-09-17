import React from "react";
import { Bot } from "lucide-react";

function AgentBuilderPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Builder</h1>
            <p className="text-muted-foreground">
              Create and customize AI agents using our visual builder interface
            </p>
          </div>
        </div>

        {/* Simplified Interface for Testing */}
        <div className="min-h-[calc(100vh-12rem)] bg-background border rounded-lg p-8">
          <p>Agent Builder component will go here...</p>
          <p>Navigation test successful!</p>
        </div>
      </div>
    </div>
  );
}

export default AgentBuilderPage;
