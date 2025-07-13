import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should not have accessibility violations in Button component', async () => {
    const { container } = render(
      <Button>Click me</Button>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have accessibility violations in Input component', async () => {
    const { container } = render(
      <div>
        <label htmlFor="test-input">Test Input</label>
        <Input id="test-input" placeholder="Enter text" />
      </div>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have accessibility violations in Card component', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is test content</p>
        </CardContent>
      </Card>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels', () => {
    const { getByRole } = render(
      <Button aria-label="Save document">
        Save
      </Button>
    );
    
    const button = getByRole('button', { name: /save document/i });
    expect(button).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    const { getByRole } = render(
      <Button>Keyboard accessible</Button>
    );
    
    const button = getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
  });

  it('should have proper color contrast', async () => {
    const { container } = render(
      <div className="bg-background text-foreground p-4">
        <h1 className="text-2xl font-bold">High Contrast Text</h1>
        <p className="text-muted-foreground">Secondary text content</p>
      </div>
    );
    
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });

  it('should handle focus management properly', () => {
    const { getByRole } = render(
      <div>
        <Button>First button</Button>
        <Button>Second button</Button>
      </div>
    );
    
    const firstButton = getByRole('button', { name: /first button/i });
    const secondButton = getByRole('button', { name: /second button/i });
    
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);
    
    // Simulate Tab key
    secondButton.focus();
    expect(document.activeElement).toBe(secondButton);
  });

  it('should provide alternative text for images', async () => {
    const { container } = render(
      <img src="/test-image.jpg" alt="Test image description" />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = render(
      <div>
        <h1>Main Title</h1>
        <h2>Section Title</h2>
        <h3>Subsection Title</h3>
      </div>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support screen readers', () => {
    const { getByText } = render(
      <div>
        <span className="sr-only">This text is for screen readers only</span>
        <span aria-hidden="true">👍</span>
        <span>Visible content</span>
      </div>
    );
    
    expect(getByText('This text is for screen readers only')).toBeInTheDocument();
    expect(getByText('Visible content')).toBeInTheDocument();
  });
});