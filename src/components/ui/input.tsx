import * as React from "react"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        style={{
          border: '0.5px solid #e8e4df',
          borderRadius: 7,
          outline: 'none',
          fontSize: 13,
          color: '#1a1a1a',
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#d3ad6b';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e8e4df';
          props.onBlur?.(e);
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
