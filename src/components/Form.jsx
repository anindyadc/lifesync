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
  <label {...props} className="text-sm font-medium text-gray-700">
    {children}
  </label>
);

export const Input = React.forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
  />
));

export const Textarea = React.forwardRef((props, ref) => (
  <textarea
    ref={ref}
    {...props}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
  />
));

export const Select = React.forwardRef((props, ref) => (
  <select
    ref={ref}
    {...props}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
  />
));

export const Button = ({ children, ...props }) => (
  <button
    {...props}
    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    {children}
  </button>
);
