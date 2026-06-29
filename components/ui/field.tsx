import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  textarea?: false;
};

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  textarea: true;
};

export function Field(props: FieldProps | TextareaFieldProps) {
  const { label, name } = props;
  const controlClass =
    "mt-1 w-full rounded-md border border-border bg-white px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm";

  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {props.textarea ? (
        <TextareaControl props={props} className={controlClass} />
      ) : (
        <InputControl props={props} className={controlClass} />
      )}
    </label>
  );
}

function InputControl({
  props,
  className
}: {
  props: FieldProps;
  className: string;
}) {
  const { label: _label, textarea: _textarea, ...inputProps } = props;
  return <input {...inputProps} className={className} id={props.id ?? props.name} />;
}

function TextareaControl({
  props,
  className
}: {
  props: TextareaFieldProps;
  className: string;
}) {
  const { label: _label, textarea: _textarea, ...textareaProps } = props;
  return (
    <textarea
      {...textareaProps}
      className={className}
      id={props.id ?? props.name}
      rows={props.rows ?? 4}
    />
  );
}
