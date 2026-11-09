import React, { useState, useEffect } from 'react';
import { 
  extractIndianNationalNumber, 
  validateIndianMobile, 
  normalizeIndianMobile 
} from '../../shared/lib/phoneUtils';

export interface IndianPhoneInputProps {
  id?: string;
  name?: string;
  value?: string;
  onChange: (canonicalValue: string, nationalNumber?: string, isValid?: boolean) => void;
  onBlur?: () => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  helperText?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const IndianPhoneInput: React.FC<IndianPhoneInputProps> = ({
  id = 'phone-input',
  name = 'phone',
  value = '',
  onChange,
  onBlur,
  label = 'Mobile Number',
  required = false,
  disabled = false,
  error: externalError,
  helperText,
  placeholder = '98765 43210',
  autoFocus = false,
  className = ''
}) => {
  // Store 10-digit national number in local state
  const [nationalNumber, setNationalNumber] = useState<string>(() => {
    return extractIndianNationalNumber(value);
  });
  const [touched, setTouched] = useState<boolean>(false);

  // Sync when external value changes
  useEffect(() => {
    const extracted = extractIndianNationalNumber(value);
    if (extracted !== nationalNumber) {
      setNationalNumber(extracted);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = extractIndianNationalNumber(raw);
    setNationalNumber(digits);

    const canonical = digits.length === 10 ? normalizeIndianMobile(digits) : digits ? `+91${digits}` : '';
    const validation = validateIndianMobile(digits);
    onChange(canonical, digits, validation.valid);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = extractIndianNationalNumber(pasted);
    setNationalNumber(digits);

    const canonical = digits.length === 10 ? normalizeIndianMobile(digits) : digits ? `+91${digits}` : '';
    const validation = validateIndianMobile(digits);
    onChange(canonical, digits, validation.valid);
  };

  const handleBlur = () => {
    setTouched(true);
    if (onBlur) {
      onBlur();
    }
  };

  // Validation state
  const validation = validateIndianMobile(nationalNumber);
  const showError = Boolean(externalError || (touched && required && !validation.valid && nationalNumber.length > 0));
  const errorMessage = externalError || (showError ? validation.error : undefined);
  const isComplete = nationalNumber.length === 10 && validation.valid;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label} {required && <span className="text-violet-400">*</span>}
        </label>
      )}

      <div
        className={`flex items-center rounded-xl border transition-all duration-200 bg-slate-950/70 ${
          showError
            ? 'border-rose-500/60 ring-1 ring-rose-500/20'
            : isComplete
            ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
            : 'border-violet-500/20 hover:border-violet-500/40 focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/30'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Fixed Non-Editable Country Badge */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-violet-950/40 border-r border-violet-500/20 text-slate-300 select-none">
          <span className="text-base" role="img" aria-label="India flag">🇮🇳</span>
          <span className="text-xs font-mono font-bold text-violet-300">+91</span>
        </div>

        {/* 10-Digit National Number Input */}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={nationalNumber}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none"
        />

        {/* Status indicator icon */}
        <div className="pr-3 flex items-center">
          {isComplete && (
            <span className="text-emerald-400 text-xs font-mono flex items-center gap-1">
              ✓
            </span>
          )}
          {nationalNumber.length > 0 && !isComplete && (
            <span className="text-[10px] font-mono text-slate-400">
              {nationalNumber.length}/10
            </span>
          )}
        </div>
      </div>

      {showError && errorMessage && (
        <p className="text-xs text-rose-400 font-sans flex items-center gap-1">
          <span>⚠</span> {errorMessage}
        </p>
      )}

      {!showError && helperText && (
        <p className="text-xs text-slate-400 font-sans">{helperText}</p>
      )}
    </div>
  );
};
