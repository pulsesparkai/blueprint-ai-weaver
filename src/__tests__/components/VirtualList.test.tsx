import { render, screen } from '@testing-library/react';
import { VirtualList } from '@/components/ui/virtual-list';

describe('VirtualList Component', () => {
  const mockItems = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`
  }));

  const renderItem = (item: typeof mockItems[0], index: number) => (
    <div key={item.id} data-testid={`item-${index}`}>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
    </div>
  );

  it('should render only visible items', () => {
    render(
      <VirtualList
        items={mockItems}
        height={400}
        itemHeight={80}
        renderItem={renderItem}
      />
    );

    // Should only render visible items (approximately 5-7 items for 400px height with 80px item height)
    const visibleItems = screen.getAllByTestId(/item-/);
    expect(visibleItems.length).toBeLessThan(20); // Much less than 1000
    expect(visibleItems.length).toBeGreaterThan(3);
  });

  it('should handle empty items array', () => {
    render(
      <VirtualList
        items={[]}
        height={400}
        itemHeight={80}
        renderItem={renderItem}
      />
    );

    const items = screen.queryAllByTestId(/item-/);
    expect(items).toHaveLength(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VirtualList
        items={mockItems.slice(0, 10)}
        height={400}
        itemHeight={80}
        renderItem={renderItem}
        className="custom-virtual-list"
      />
    );

    const virtualList = container.firstChild as HTMLElement;
    expect(virtualList).toHaveClass('custom-virtual-list');
  });

  it('should set correct container height', () => {
    const { container } = render(
      <VirtualList
        items={mockItems.slice(0, 10)}
        height={300}
        itemHeight={80}
        renderItem={renderItem}
      />
    );

    const virtualList = container.firstChild as HTMLElement;
    expect(virtualList).toHaveStyle({ height: '300px' });
  });

  it('should calculate total scroll height correctly', () => {
    const { container } = render(
      <VirtualList
        items={mockItems.slice(0, 100)}
        height={400}
        itemHeight={50}
        renderItem={renderItem}
      />
    );

    const scrollContainer = container.querySelector('div > div') as HTMLElement;
    expect(scrollContainer).toHaveStyle({ height: '5000px' }); // 100 items * 50px
  });

  it('should handle different item heights', () => {
    render(
      <VirtualList
        items={mockItems.slice(0, 10)}
        height={400}
        itemHeight={120}
        renderItem={renderItem}
      />
    );

    const items = screen.getAllByTestId(/item-/);
    items.forEach(item => {
      const parent = item.parentElement as HTMLElement;
      expect(parent).toHaveStyle({ height: '120px' });
    });
  });

  it('should render items with correct content', () => {
    const smallItems = mockItems.slice(0, 5);
    
    render(
      <VirtualList
        items={smallItems}
        height={400}
        itemHeight={80}
        renderItem={renderItem}
      />
    );

    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.getByText('Description for item 0')).toBeInTheDocument();
  });

  it('should respect overscan prop', () => {
    render(
      <VirtualList
        items={mockItems}
        height={400}
        itemHeight={80}
        renderItem={renderItem}
        overscan={10}
      />
    );

    // With higher overscan, should render more items
    const visibleItems = screen.getAllByTestId(/item-/);
    expect(visibleItems.length).toBeGreaterThan(5);
  });
});