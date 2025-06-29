jest.mock('ink', () => ({
  Text: () => null,
  render: jest.fn()
}));

import program from '../index';

describe('CLI program', () => {
  it('should export a commander program', () => {
    expect(typeof program.parse).toBe('function');
  });
});
