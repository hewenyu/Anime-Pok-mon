import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatBar from './StatBar';

describe('StatBar', () => {
  it('renders the label, current, and max values', () => {
    render(<StatBar label="Stamina" current={80} max={100} barColorClass="bg-green-500" />);
    expect(screen.getByText('Stamina:')).toBeInTheDocument();
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
  });

  it('calculates the bar width correctly', () => {
    const { container } = render(<StatBar label="Energy" current={50} max={200} barColorClass="bg-blue-500" />);
    const bar = container.querySelector('.bg-blue-500');
    expect(bar).toHaveStyle('width: 25%');
  });

  it('applies the correct bar color class', () => {
    const { container } = render(<StatBar label="Health" current={90} max={100} barColorClass="bg-red-500" />);
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('applies the optional text color class', () => {
    render(<StatBar label="Stamina" current={80} max={100} barColorClass="bg-green-500" textColorClass="text-yellow-300" />);
    const labelElement = screen.getByText('Stamina:');
    const valueElement = screen.getByText('80 / 100');
    expect(labelElement).toHaveClass('text-yellow-300');
    expect(valueElement).toHaveClass('text-yellow-300');
  });

  it('does not apply a text color class if not provided', () => {
    render(<StatBar label="Stamina" current={80} max={100} barColorClass="bg-green-500" />);
    const labelElement = screen.getByText('Stamina:');
    const valueElement = screen.getByText('80 / 100');
    // Assuming no default text color class is applied by the component itself
    expect(labelElement).not.toHaveClass('text-yellow-300');
    expect(valueElement).not.toHaveClass('text-yellow-300');
  });

  it('handles zero max value gracefully to avoid division by zero', () => {
    const { container } = render(<StatBar label="Mana" current={0} max={0} barColorClass="bg-purple-500" />);
    const bar = container.querySelector('.bg-purple-500');
    expect(bar).toHaveStyle('width: 0%');
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});