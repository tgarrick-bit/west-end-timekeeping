import * as React from "react"

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', style, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={className}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#555',
          display: 'block',
          marginBottom: 4,
          ...style,
        }}
        {...props}
      />
    )
  }
)
Label.displayName = "Label"

export { Label }
