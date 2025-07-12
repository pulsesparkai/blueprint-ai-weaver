import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradePrompt: () => void;
}

const steps: Step[] = [
  {
    target: '.blueprint-canvas',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Welcome to Context Engine!</h3>
        <p className="text-sm text-muted-foreground mb-3">
          This is your canvas where you'll build powerful AI pipelines by connecting nodes.
        </p>
        <div className="bg-primary/10 p-3 rounded-lg">
          <p className="text-xs font-medium">💡 Pro Tip: Start with our template gallery for quick setups!</p>
        </div>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.node-sidebar',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Node Library</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Drag and drop these powerful AI components to build your pipeline.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Prompt Template - Define AI instructions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>RAG Retriever - Search knowledge base</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Memory Store - Remember context</span>
          </div>
        </div>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.template-gallery-trigger',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Template Gallery</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Skip the setup with our pre-built templates for common use cases.
        </p>
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-3 rounded-lg">
          <p className="text-xs font-medium">🚀 Templates include: HR Q&A, Sales Chatbot, Document Assistant</p>
        </div>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.simulator-pane',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Test Your Pipeline</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Run simulations to test your AI pipeline before deployment.
        </p>
        <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            ⏰ Free trial: 3 days unlimited access, then $19/month Pro
          </p>
        </div>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.metrics-overview',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Track Performance</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Monitor token usage, cost savings, and optimization metrics.
        </p>
        <Button 
          size="sm" 
          className="w-full mt-2"
          onClick={() => {}}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Upgrade to Pro for Unlimited
        </Button>
      </div>
    ),
    placement: 'top',
  },
];

export function OnboardingTour({ isOpen, onClose, onUpgradePrompt }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      onClose();
    } else if (action === 'next') {
      setStepIndex(index + 1);
      
      // Show upgrade prompt on final step
      if (index === steps.length - 2) {
        setTimeout(() => onUpgradePrompt(), 1000);
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={isOpen}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--background))',
          textColor: 'hsl(var(--foreground))',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
          spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          fontSize: '14px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '8px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish Tour',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}