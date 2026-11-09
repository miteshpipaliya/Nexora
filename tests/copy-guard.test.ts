import { describe, it, expect } from 'vitest';
import { isAllowedElement } from '../src/components/common/CopyGuard';

describe('CopyGuard Element Classification (WP8 / R8)', () => {
  it('allows interactive form inputs', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');

    expect(isAllowedElement(input)).toBe(true);
    expect(isAllowedElement(textarea)).toBe(true);
    expect(isAllowedElement(select)).toBe(true);
  });

  it('allows contenteditable elements and their children', () => {
    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    const innerSpan = document.createElement('span');
    editableDiv.appendChild(innerSpan);

    expect(isAllowedElement(editableDiv)).toBe(true);
    expect(isAllowedElement(innerSpan)).toBe(true);
  });

  it('allows elements with .allow-select and code blocks', () => {
    const container = document.createElement('div');
    container.className = 'allow-select';
    const child = document.createElement('p');
    container.appendChild(child);

    const pre = document.createElement('pre');
    const code = document.createElement('code');

    expect(isAllowedElement(container)).toBe(true);
    expect(isAllowedElement(child)).toBe(true);
    expect(isAllowedElement(pre)).toBe(true);
    expect(isAllowedElement(code)).toBe(true);
  });

  it('blocks selection/copying on regular content elements', () => {
    const div = document.createElement('div');
    const h1 = document.createElement('h1');
    const p = document.createElement('p');
    const span = document.createElement('span');

    expect(isAllowedElement(div)).toBe(false);
    expect(isAllowedElement(h1)).toBe(false);
    expect(isAllowedElement(p)).toBe(false);
    expect(isAllowedElement(span)).toBe(false);
    expect(isAllowedElement(null)).toBe(false);
  });
});
