import React, { memo } from 'react';
import { Activity, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StateTrackerNodeProps {
  id: string;
  data: {
    label: string;
    trackingType?: string;
    maxHistory?: number;
  };
  selected?: boolean;
}

export const StateTrackerNode = memo(({ id, data, selected }: StateTrackerNodeProps) => {
  return (
    <BaseNode
      id={id}
      data={{
        label: data.label,
        type: 'State Tracker',
        icon: <Activity className="w-4 h-4" />,
        variant: 'state'
      }}
      selected={selected}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Tracking Type
          </label>
          <Select defaultValue={data.trackingType || 'conversation'}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conversation">Conversation</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="user">User Context</SelectItem>
              <SelectItem value="workflow">Workflow State</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Max History
          </label>
          <input
            type="number"
            defaultValue={data.maxHistory || 10}
            className="w-full h-8 px-2 text-xs rounded border border-border bg-background"
            min="1"
            max="100"
          />
        </div>
        
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">State Variables</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="px-2 py-1 bg-primary/10 text-primary rounded">user_id</div>
            <div className="px-2 py-1 bg-primary/10 text-primary rounded">session_id</div>
            <div className="px-2 py-1 bg-primary/10 text-primary rounded">turn_count</div>
            <div className="px-2 py-1 bg-primary/10 text-primary rounded">context</div>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Settings className="w-3 h-3 mr-1" />
          Configure
        </Button>
      </div>
    </BaseNode>
  );
});

StateTrackerNode.displayName = 'StateTrackerNode';