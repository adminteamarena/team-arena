import { FC, useState, ChangeEvent } from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const Input: FC<InputProps> = ({
  type = 'text',
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasValue(!!newValue);
    onChange(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const isLabelFloating = isFocused || hasValue;

  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`input-field w-full ${error ? 'border-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      <label
        className={`floating-label ${isLabelFloating ? 'focused' : ''}`}
      >
        {label}
      </label>
      {error && (
        <p className="text-red-400 text-sm mt-1 ml-1">{error}</p>
      )}
    </div>
  );
};

export default Input; 