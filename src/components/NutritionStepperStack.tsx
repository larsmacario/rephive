import { SetValueStepper } from "./SetValueStepper";

export interface NutritionStepperField {
  id: string;
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
}

export interface NutritionStepperStackProps {
  fields: NutritionStepperField[];
}

export function NutritionStepperStack({ fields }: NutritionStepperStackProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 18,
        width: "min(300px, 100%)",
        margin: "0 auto",
      }}
    >
      {fields.map((field) => (
        <div key={field.id} style={{ width: "100%" }}>
          <SetValueStepper
            label={field.label}
            value={field.value}
            step={field.step}
            min={field.min}
            onChange={field.onChange}
            size="lg"
            fullWidth
            labelOnTop
            editable
          />
        </div>
      ))}
    </div>
  );
}
