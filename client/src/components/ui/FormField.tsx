import React, { type ReactElement, type ReactNode } from "react";

interface BaseFormFieldProps {
  label?: string;
  error?: string;
  icon?: string;
  className?: string;
}

export function FormField({
  label,
  error,
  icon,
  children,
  className = "",
}: BaseFormFieldProps & { children: ReactNode }): ReactElement {
  const fieldId = React.useId();

  // Normaliza children para array e filtra nodos React válidos
  const childArray = React.Children.toArray(children);

  // Encontrar índice do primeiro ReactElement
  const firstElementIndex = childArray.findIndex((c) => React.isValidElement(c));

  // Se encontrou um ReactElement, clone só ele com a prop id
  let clonedChildren: ReactNode[] = [];

  if (firstElementIndex >= 0) {
    childArray.forEach((child, idx) => {
      if (idx === firstElementIndex && React.isValidElement(child)) {
        // clone e injeta id (Partial para evitar conflito com props do elemento)
        const cloned = React.cloneElement(child as ReactElement, { id: fieldId } as Partial<Record<string, unknown>>);
        clonedChildren.push(cloned);
      } else {
        // mantém o child como está (string, element, fragment, etc.)
        clonedChildren.push(child);
      }
    });
  } else {
    // Nenhum filho ReactElement (apenas texto etc.) — renderiza children sem alteração
    clonedChildren = childArray;
  }

  return (
    <div className={`form-field ${error ? "error" : ""} ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {icon && <span className="field-icon">{icon}</span>}
          {label}
        </label>
      )}

      <div className="field-input">{clonedChildren}</div>

      {error && (
        <div className="field-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
    </div>
  );
}
