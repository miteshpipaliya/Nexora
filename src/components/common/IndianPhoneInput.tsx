import React, { useState, useEffect } from 'react';
import {
  extractIndianNationalNumber,
  validateIndianMobile,
  normalizeIndianMobile
} from '../../shared/lib/phoneUtils';

interface IndianPhoneInputProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange: (canonicalValue: string, nationalNumber: string, isValid: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string | null;
  helperText?: string;
  className?: string;
  autoFocus?: boolean;
}

export const IndianPhoneInput: React.FC<IndianPhoneInputProps> = ({
  id = 'indian-phone-input',
  name = 'phone',
  label = 'Mobile Number',
  value = '',
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Enter 10-digit mobile number',
  error,
  helperText,
  className = '',
  autoFocus = false,
}) => {
  const [nationalNumber, setNationalNumber] = useState<string>(() =>
    extractIndianNationalNumber(value)
  );
  const [touched, setTouched] = useState<boolean>(false);

  // Sync external value updates
  useEffect(() => {
    const extracted = extractIndianNationalNumber(value);
    if (extracted !== nationalNumber) {
      setNationalNumber(extracted);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only digits, maximum 10 digits
    const raw = e.target.value.replace(/\D/g, '');
    const truncated = raw.slice(0, 10);
    setNationalNumber(truncated);

    const validation = validateIndianMobile(truncated);
    const canonical = truncated.length === 10 && validation.valid
      ? normalizeIndianMobile(truncated)
      : (truncated ? `+91${truncated}` : '');

    onChange(canonical, truncated, validation.valid);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  // Determine validation message
  const validationResult = validateIndianMobile(nationalNumber);
  const displayError = error || (touched && nationalNumber.length > 0 && !validationResult.valid ? validationResult.error : null);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-300">
          {label} {required && <span className="text-violet-400">*</span>}
        </label>
      )}

      <div
        className={`flex items-center rounded-xl bg-slate-900/80 border transition-all duration-200 overflow-hidden ${
          displayError
            ? 'border-red-500/80 ring-1 ring-red-500/30'
            : 'border-violet-500/30 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-950' : ''}`}
      >
        {/* Fixed Non-removable India Country Code Badge */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800/80 border-r border-violet-500/20 select-none text-slate-200 text-sm font-medium">
          <span role="img" aria-label="India Flag" className="text-base leading-none">
            🇮🇳
          </span>
          <span className="font-mono text-xs tracking-wider text-violet-300">+91</span>
        </div>

        {/* National 10-digit Input Box */}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          value={nationalNumber}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-500 placeholder:font-sans focus:outline-none tracking-wider"
          aria-invalid={Boolean(displayError)}
          aria-describedby={displayError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        />

        {/* Digit count pill */}
        <div className="pr-3 text-[10px] font-mono select-none text-slate-500">
          <span className={nationalNumber.length === 10 ? 'text-emerald-400 font-bold' : ''}>
            {nationalNumber.length}
          </span>
          /10
        </div>
      </div>

      {/* Validation / Helper text */}
      {displayError ? (
        <p id={`${id}-error`} className="text-[11px] text-red-400 font-medium">
          {displayError}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-[11px] text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
