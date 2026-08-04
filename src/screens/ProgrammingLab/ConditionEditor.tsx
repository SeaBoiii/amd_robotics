/**
 * Editor for a single rule's condition.
 *
 * Composite conditions (and / or / not) can be produced by mission templates but
 * are not editable in the MVP builder — they are shown as read-only plain
 * English so a student is never confronted with a control they cannot use.
 */

import type { ComparisonOperator, Condition, LabelId, SensorType } from '@/types';
import { LABELS } from '@/types';
import { LABEL_INFO } from '@/ai/labels';
import { describeCondition } from '@/program/ruleEngine';
import { CONDITION_PRESETS } from '@/program/templates';
import { humanise } from '@/utils/format';

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
  { value: 'gt', label: 'is more than' },
  { value: 'gte', label: 'is at least' },
  { value: 'eq', label: 'equals' },
];

const SENSORS: SensorType[] = ['distance', 'line', 'colour', 'temperature', 'light', 'sound'];

/** Maps a condition back to the preset that produced it, for the type picker. */
function presetIdFor(condition: Condition): string {
  switch (condition.type) {
    case 'always':
      return 'always';
    case 'sensor':
      return condition.sensor === 'line' ? 'line_detected' : 'distance_close';
    case 'ai_prediction':
      return 'ai_sees';
    case 'ai_uncertain':
      return 'ai_unsure';
    case 'battery':
      return 'battery_low';
    case 'carrying':
      return 'carrying';
    case 'timer':
      return 'timer';
    default:
      return 'composite';
  }
}

export function ConditionEditor({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (condition: Condition) => void;
}) {
  const presetId = presetIdFor(condition);

  const typePicker = (
    <select
      className="select"
      value={presetId}
      aria-label="Condition type"
      onChange={(event) => {
        const preset = CONDITION_PRESETS.find((item) => item.id === event.target.value);
        if (preset) onChange(preset.build());
      }}
    >
      {CONDITION_PRESETS.map((preset) => (
        <option key={preset.id} value={preset.id} title={preset.hint}>
          {preset.label}
        </option>
      ))}
      {presetId === 'composite' ? <option value="composite">Combined condition</option> : null}
    </select>
  );

  if (condition.type === 'and' || condition.type === 'or' || condition.type === 'not') {
    return (
      <>
        {typePicker}
        <span className="text-sm text-muted">{describeCondition(condition)}</span>
      </>
    );
  }

  return (
    <>
      {typePicker}

      {condition.type === 'sensor' ? (
        <>
          <select
            className="select"
            aria-label="Sensor"
            value={condition.sensor}
            onChange={(event) => onChange({ ...condition, sensor: event.target.value as SensorType })}
          >
            {SENSORS.map((sensor) => (
              <option key={sensor} value={sensor}>
                {humanise(sensor)} sensor
              </option>
            ))}
          </select>
          <OperatorPicker
            value={condition.operator}
            onChange={(operator) => onChange({ ...condition, operator })}
          />
          <NumberBox
            label="Sensor threshold"
            value={condition.value}
            step={0.5}
            onChange={(value) => onChange({ ...condition, value })}
          />
        </>
      ) : null}

      {condition.type === 'ai_prediction' ? (
        <>
          <select
            className="select"
            aria-label="Predicted label"
            value={condition.label}
            onChange={(event) => onChange({ ...condition, label: event.target.value as LabelId })}
          >
            {LABELS.map((label) => (
              <option key={label} value={label}>
                {LABEL_INFO[label].name}
              </option>
            ))}
          </select>
          <span className="text-sm">with confidence above</span>
          <PercentBox
            label="Confidence threshold"
            value={condition.confidenceAbove}
            onChange={(confidenceAbove) => onChange({ ...condition, confidenceAbove })}
          />
        </>
      ) : null}

      {condition.type === 'ai_uncertain' ? (
        <>
          <span className="text-sm">confidence below</span>
          <PercentBox
            label="Uncertainty threshold"
            value={condition.confidenceBelow}
            onChange={(confidenceBelow) => onChange({ ...condition, confidenceBelow })}
          />
        </>
      ) : null}

      {condition.type === 'battery' || condition.type === 'carrying' || condition.type === 'timer' ? (
        <>
          <OperatorPicker
            value={condition.operator}
            onChange={(operator) => onChange({ ...condition, operator })}
          />
          <NumberBox
            label={condition.type === 'battery' ? 'Battery percent' : condition.type === 'timer' ? 'Seconds' : 'Packages'}
            value={condition.value}
            step={1}
            onChange={(value) => onChange({ ...condition, value })}
          />
          <span className="text-sm text-muted">
            {condition.type === 'battery' ? '% charge' : condition.type === 'timer' ? 'seconds' : 'packages'}
          </span>
        </>
      ) : null}
    </>
  );
}

function OperatorPicker({
  value,
  onChange,
}: {
  value: ComparisonOperator;
  onChange: (operator: ComparisonOperator) => void;
}) {
  return (
    <select
      className="select"
      aria-label="Comparison"
      value={value}
      onChange={(event) => onChange(event.target.value as ComparisonOperator)}
    >
      {OPERATORS.map((operator) => (
        <option key={operator.value} value={operator.value}>
          {operator.label}
        </option>
      ))}
    </select>
  );
}

function NumberBox({
  value,
  onChange,
  step,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step: number;
  label: string;
}) {
  return (
    <input
      className="input"
      type="number"
      aria-label={label}
      value={value}
      step={step}
      style={{ width: '5.5rem' }}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(next);
      }}
    />
  );
}

function PercentBox({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <span className="row" style={{ gap: 'var(--sp-1)' }}>
      <input
        className="input"
        type="number"
        aria-label={label}
        value={Math.round(value * 100)}
        min={1}
        max={99}
        step={5}
        style={{ width: '5rem' }}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(0.99, Math.max(0.01, next / 100)));
        }}
      />
      <span className="text-sm">%</span>
    </span>
  );
}
