import { cn } from "@/lib/utils";

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('should handle conditional classes', () => {
    expect(cn('btn', true && 'btn-primary')).toBe('btn btn-primary');
    expect(cn('btn', false && 'btn-primary')).toBe('btn');
  });

  it('should handle undefined and null values', () => {
    expect(cn('btn', undefined, null, 'btn-primary')).toBe('btn btn-primary');
  });

  it('should override conflicting Tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle complex combinations', () => {
    const result = cn(
      'base-class',
      {
        'conditional-class': true,
        'another-class': false
      },
      'final-class'
    );
    expect(result).toBe('base-class conditional-class final-class');
  });
});