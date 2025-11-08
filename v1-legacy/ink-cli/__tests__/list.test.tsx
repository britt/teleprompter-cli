jest.mock('ink', () => ({
  Text: () => null,
  render: jest.fn()
}));

const getAccessToken = jest.fn().mockResolvedValue('token');
jest.mock('../../src/index', () => {
  const actual = jest.requireActual('../../src/index');
  return {
    __esModule: true,
    ...actual,
    getAccessToken,
  };
});


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

  it('fetches the access token before rendering', async () => {
    await program.parseAsync(['list', '--url', 'https://ex.com'], { from: 'user' });
    expect(getAccessToken).toHaveBeenCalledWith('https://ex.com');
  });
});
