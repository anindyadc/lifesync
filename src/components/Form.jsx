import React from "react";

export const Form = ({ children, ...props }) => (
  <form {...props} className="space-y-4">
    {children}
  </form>
);

export const FormGroup = ({ children }) => (
  <div className="flex flex-col space-y-2">{children}</div>
);

export const Label = ({ children, ...props }) => (
  <label {...props} className="text-sm font-medium text-foreground">
    {children}
  </label>
);

export const Input = React.forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="w-full text-foreground sm:text-sm focus:outline-none"
  />
));

export const Textarea = React.forwardRef((props, ref) => (
  <textarea
    ref={ref}
    {...props}
    className="w-full px-3 py-2 border border-input bg-card rounded-md shadow-sm focus:ring-ring focus:border-primary sm:text-sm text-foreground"
  />
));

export const Select = React.forwardRef((props, ref) => (
  <select
    ref={ref}
    {...props}
    className="w-full px-3 py-2 border border-input bg-card rounded-md shadow-sm focus:ring-ring focus:border-primary sm:text-sm text-foreground"
  />
));

export const Button = ({ children, variant = "default", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ` +
               `${variant === "default" ? "text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-primary" : "text-foreground bg-secondary hover:bg-secondary/80 focus:ring-secondary"}`}
  >
    {children}
  </button>
);
