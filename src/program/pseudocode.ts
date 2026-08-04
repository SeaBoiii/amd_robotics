/**
 * Read-only pseudocode view for advanced students.
 *
 * The visual rule list is the source of truth; this renders the same JSON as
 * something that looks like code, which helps students bridge from blocks to
 * text programming without introducing a parser (and its error messages).
 */

import type { Action, Condition, StudentProgram } from '@/types';

function conditionToCode(condition: Condition): string {
  switch (condition.type) {
    case 'always':
      return 'true';
    case 'sensor': {
      const symbol = { lt: '<', lte: '<=', gt: '>', gte: '>=', eq: '==' }[condition.operator];
      return `sensors.${condition.sensor} ${symbol} ${condition.value}`;
    }
    case 'ai_prediction':
      return `ai.label == "${condition.label}" and ai.confidence > ${condition.confidenceAbove.toFixed(2)}`;
    case 'ai_uncertain':
      return `ai.confidence < ${condition.confidenceBelow.toFixed(2)}`;
    case 'battery': {
      const symbol = { lt: '<', lte: '<=', gt: '>', gte: '>=', eq: '==' }[condition.operator];
      return `rover.battery ${symbol} ${condition.value}`;
    }
    case 'carrying': {
      const symbol = { lt: '<', lte: '<=', gt: '>', gte: '>=', eq: '==' }[condition.operator];
      return `rover.carrying ${symbol} ${condition.value}`;
    }
    case 'timer': {
      const symbol = { lt: '<', lte: '<=', gt: '>', gte: '>=', eq: '==' }[condition.operator];
      return `mission.seconds ${symbol} ${condition.value}`;
    }
    case 'and':
      return `(${conditionToCode(condition.left)}) and (${conditionToCode(condition.right)})`;
    case 'or':
      return `(${conditionToCode(condition.left)}) or (${conditionToCode(condition.right)})`;
    case 'not':
      return `not (${conditionToCode(condition.inner)})`;
    default:
      return 'false';
  }
}

function actionToCode(action: Action): string {
  switch (action.type) {
    case 'forward':
      return `rover.forward(speed=${action.speed ?? 100})`;
    case 'reverse':
      return `rover.reverse(speed=${action.speed ?? 60})`;
    case 'turn_left':
      return 'rover.turn_left()';
    case 'turn_right':
      return 'rover.turn_right()';
    case 'stop':
      return 'rover.stop()';
    case 'wait':
      return 'rover.wait()';
    case 'deliver_supply':
      return 'rover.deliver_supply()';
    case 'pick_up_target':
      return 'rover.pick_up_target()';
    case 'scan':
      return 'rover.scan()';
    case 'request_human_help':
      return `rover.request_human_help(${JSON.stringify(action.note ?? 'not sure what I am seeing')})`;
    case 'return_to_base':
      return 'rover.return_to_base()';
    default:
      return 'rover.stop()';
  }
}

/** Python-flavoured pseudocode. Deliberately not executable. */
export function toPseudocode(program: StudentProgram): string {
  const enabled = program.rules.filter((rule) => rule.enabled);
  const lines: string[] = [
    '# Auto-generated from your rule blocks. Read-only.',
    '# The rover runs this once per decision step.',
    '',
    'def decide(sensors, ai, rover, mission):',
  ];

  if (enabled.length === 0) {
    lines.push('    rover.stop()  # no active rules');
    return lines.join('\n');
  }

  enabled.forEach((rule, index) => {
    const keyword = index === 0 ? 'if' : 'elif';
    lines.push(`    # ${rule.name}`);
    lines.push(`    ${keyword} ${conditionToCode(rule.condition)}:`);
    lines.push(`        ${actionToCode(rule.action)}`);
  });

  lines.push('    else:');
  lines.push('        rover.stop()  # nothing matched — fail safe');
  return lines.join('\n');
}

/** JavaScript-flavoured variant for students who prefer that syntax. */
export function toJavaScript(program: StudentProgram): string {
  const enabled = program.rules.filter((rule) => rule.enabled);
  const lines: string[] = [
    '// Auto-generated from your rule blocks. Read-only.',
    'function decide(sensors, ai, rover, mission) {',
  ];

  enabled.forEach((rule, index) => {
    const keyword = index === 0 ? '  if' : '  } else if';
    const code = conditionToCode(rule.condition)
      .replace(/ and /g, ' && ')
      .replace(/ or /g, ' || ')
      .replace(/not /g, '!')
      .replace(/==/g, '===');
    lines.push(`${index === 0 ? '' : ''}${keyword} (${code}) {`);
    lines.push(`    // ${rule.name}`);
    lines.push(`    ${actionToCode(rule.action).replace(/speed=/, 'speed: ')};`);
  });

  if (enabled.length > 0) {
    lines.push('  } else {');
    lines.push('    rover.stop(); // nothing matched — fail safe');
    lines.push('  }');
  } else {
    lines.push('  rover.stop(); // no active rules');
  }
  lines.push('}');
  return lines.join('\n');
}

/** The exact JSON the simulator executes. Shown so the mapping is not magic. */
export function toJson(program: StudentProgram): string {
  return JSON.stringify(
    program.rules.filter((rule) => rule.enabled).map(({ condition, action }) => ({ condition, action })),
    null,
    2,
  );
}
