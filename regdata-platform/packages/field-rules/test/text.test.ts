import { describe, expect, it } from 'vitest';
import { classifyBnppFields, cleanCondition, matchActionType, normalizeForCompare, normalizeKeyPart, parseErrorCodes, parseStatus } from '../src';

describe('text helpers', () => {
  it('normalizes dashes, spaces and case for comparisons only', () => {
    expect(normalizeForCompare('Section 2b – Contract  information')).toBe(normalizeForCompare('section 2b - contract information'));
  });

  it('normalizes numeric key parts', () => {
    expect(normalizeKeyPart(' 2 ')).toBe('2');
    expect(normalizeKeyPart('2.0')).toBe('2');
    expect(normalizeKeyPart('151')).toBe('151');
  });

  it('numbers multi-line conditions only when the source has no numbering', () => {
    expect(cleanCondition('First rule.\nSecond rule.')).toBe('1. First rule. 2. Second rule.');
    expect(cleanCondition('1. First.\n   continues here.\n2. Second.')).toBe('1. First. continues here. 2. Second.');
    expect(cleanCondition('- Only one bullet')).toBe('Only one bullet');
    expect(cleanCondition('')).toBe('');
  });

  it('parses error codes in several layouts', () => {
    expect(parseErrorCodes('1. EX-VR-1-01\n2. EX-VR-1-02')).toEqual(['EX-VR-1-01', 'EX-VR-1-02']);
    expect(parseErrorCodes('EX-VR-1-01, EX-VR-1-02; EX-VR-1-01')).toEqual(['EX-VR-1-01', 'EX-VR-1-02']);
    expect(parseErrorCodes('1.EX-VR-1-01')).toEqual(['EX-VR-1-01']);
    expect(parseErrorCodes('')).toEqual([]);
  });

  it('parses statuses strictly', () => {
    expect(parseStatus('M').status).toBe('M');
    expect(parseStatus(' – ').status).toBe('NA');
    expect(parseStatus('Not relevant').status).toBe('NA');
    expect(parseStatus('').problem).toBe('empty');
    expect(parseStatus('X').problem).toBe('invalid');
  });

  it('matches action type headers', () => {
    expect(matchActionType('NEW')).toBe('NEWT');
    expect(matchActionType('MOD')).toBe('MODI');
    expect(matchActionType('REV')).toBe('REVI');
    expect(matchActionType('Position component')).toBe('POSC');
    expect(matchActionType('Format')).toBeNull();
    expect(matchActionType('Conditions')).toBeNull();
  });

  it('classifies party fields without hard-coded prefixes', () => {
    const result = classifyBnppFields(['AB1_X', 'AB2_X', 'AB1_SETTLEMENT_1', 'AB2_SETTLEMENT_1', 'C_PRIMARY', 'UTI']);
    expect(result.fields.map((field) => field.role)).toEqual(['party_1', 'party_2', 'party_1', 'party_2', 'other', 'other']);
    expect(result.unpaired).toEqual([]);
    expect(classifyBnppFields(['AB1_ONLY']).unpaired).toEqual(['AB1_ONLY']);
  });
});
