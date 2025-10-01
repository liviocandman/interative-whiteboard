interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'active' | 'danger';
  children: React.ReactNode;
}

export function Button({ variant = 'default', className = '', children, ...props }: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const classes = `${baseClass} ${variantClass} ${className}`.trim();

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}