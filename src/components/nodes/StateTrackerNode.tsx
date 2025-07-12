import React from 'react';
import { BaseNode } from './BaseNode';
import { Activity, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraph } from '@/contexts/GraphContext';

export function StateTrackerNode({ id, data, selected }: any) {
  const { dispatch } = useGraph();

  const handleConfigure = () => {
    dispatch({ type: 'SELECT_NODE', payload: { id, data, type: 'state-tracker' } });
  };

  return (
    <BaseNode 
      id={id}
      data={{
        ...data,
        icon: <Activity className="w-4 h-4" />,
        type: 'State Tracker',
        variant: 'state'
      }}
      selected={selected}
    >
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Type: {data.trackingType || 'Not configured'}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleConfigure}
              className="h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          <div>Max History: {data.maxHistory || 10}</div>
        </div>
      </div>
    </BaseNode>
  );
}