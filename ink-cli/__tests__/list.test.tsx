jest.mock('ink', () => ({
  Text: () => null,
  render: jest.fn()
}));

import program from '../index';

describe('CLI program', () => {
  it('should export a commander program', () => {
    expect(typeof program.parse).toBe('function');
  });

  it('should include all expected commands', () => {
    const names = program.commands.map(c => c.name());
    expect(names).toEqual(
      expect.arrayContaining([
        'list',
        'put',
        'versions',
        'rollback',
        'get',
        'import',
        'export',
      ])
    );
  });
});
