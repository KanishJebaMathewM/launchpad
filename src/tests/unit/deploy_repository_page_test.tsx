import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
  type MockInstance,
} from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import DeployRepositoryPage from '@/features/deployments/pages/DeployRepositoryPage';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import userEvent from '@testing-library/user-event';

let mockOnReady: ((d: unknown) => void) | undefined;
let mockOnFailed: ((m: string) => void) | undefined;

vi.mock('@/lib/api-client', () => ({
  api: {
    add: vi.fn(),
    deploy: vi.fn(),
    branchList: vi.fn().mockResolvedValue(['main']),
    listSubscriptions: vi.fn().mockResolvedValue({}),
    inspect: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/features/deployments/hooks/useDeploymentMonitor', () => ({
  useDeploymentMonitor: ({
    onReady,
    onFailed,
  }: {
    onReady?: (d: unknown) => void;
    onFailed?: (m: string) => void;
  }) => {
    if (onReady) mockOnReady = onReady;
    if (onFailed) mockOnFailed = onFailed;
    return { status: 'create' };
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DeployRepositoryPage Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReady = undefined;
    mockOnFailed = undefined;
  });

  it('calls toast.success on successful deploy', async () => {
    render(
      <MemoryRouter>
        <DeployRepositoryPage />
      </MemoryRouter>,
    );

    // Simulate the monitor calling onReady
    if (mockOnReady) {
      act(() => {
        mockOnReady!({ suffix: 'test-dep' });
      });
    }

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Repository deployed successfully!');
    });
  });

  it('calls toast.error on failed deploy', async () => {
    render(
      <MemoryRouter>
        <DeployRepositoryPage />
      </MemoryRouter>,
    );

    if (mockOnFailed) {
      act(() => {
        mockOnFailed!('Build failed');
      });
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Deploy failed: Build failed');
    });
  });
});

describe('DeployRepositoryPage', () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    (api.listSubscriptions as Mock).mockResolvedValue({ Free: 1, Pro: 1 });
    (api.inspect as Mock).mockResolvedValue([]);
    fetchMock = vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter initialEntries={['/deploy?plan=Pro']}>
        <DeployRepositoryPage />
      </MemoryRouter>,
    );
  };

  it('LP-0005: handles GitHub URLs correctly', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('api.github.com/repos/metacall/core/branches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ name: 'main' }]),
        });
      }
      if (url.includes('api.github.com/repos/metacall/core')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ default_branch: 'main' }),
        });
      }
      if (url.includes('metacall.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.reject(new Error('unhandled'));
    });

    renderComponent();

    const input = screen.getByPlaceholderText('https://github.com/user/repo');
    await userEvent.type(input, 'https://github.com/metacall/core');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/metacall/core');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/metacall/core/branches?per_page=100',
      );
    });
  });

  it('LP-0006: handles GitLab URLs correctly', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('gitlab.com/api/v4/projects/metacall%2Fcore/repository/branches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ name: 'main' }]),
        });
      }
      if (url.includes('gitlab.com/api/v4/projects/metacall%2Fcore')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ default_branch: 'main' }),
        });
      }
      if (url.includes('metacall.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.reject(new Error('unhandled'));
    });

    renderComponent();

    const input = screen.getByPlaceholderText('https://github.com/user/repo');
    await userEvent.type(input, 'https://gitlab.com/metacall/core');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://gitlab.com/api/v4/projects/metacall%2Fcore');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/projects/metacall%2Fcore/repository/branches?per_page=100',
      );
    });
  });

  it('LP-0007: switches branches and detects languages accordingly', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('api.github.com/repos/metacall/core/branches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ name: 'dev' }, { name: 'main' }]),
        });
      }
      if (url.includes('api.github.com/repos/metacall/core')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ default_branch: 'main' }),
        });
      }
      if (url.includes('main/metacall.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ language: 'node' }),
        });
      }
      if (url.includes('dev/metacall.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ language: 'python' }),
        });
      }
      return Promise.reject(new Error('unhandled: ' + url));
    });

    renderComponent();

    const input = screen.getByPlaceholderText('https://github.com/user/repo');
    await userEvent.type(input, 'https://github.com/metacall/core');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });

    const branchSelect = await screen.findByDisplayValue('main');
    await userEvent.selectOptions(branchSelect, 'dev');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
    });
  });

  it('LP-0008: ensures stale requests do not overwrite language state', async () => {
    let resolveMain: () => void;
    let resolveDev: () => void;

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('api.github.com/repos/metacall/core/branches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ name: 'dev' }, { name: 'main' }]),
        });
      }
      if (url.includes('api.github.com/repos/metacall/core')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ default_branch: 'main' }),
        });
      }
      if (url.includes('main/metacall.json')) {
        return new Promise(res => {
          resolveMain = () =>
            res({
              ok: true,
              json: () => Promise.resolve({ language: 'node' }),
            });
        });
      }
      if (url.includes('dev/metacall.json')) {
        return new Promise(res => {
          resolveDev = () =>
            res({
              ok: true,
              json: () => Promise.resolve({ language: 'python' }),
            });
        });
      }
      return Promise.reject(new Error('unhandled: ' + url));
    });

    renderComponent();

    const input = screen.getByPlaceholderText('https://github.com/user/repo');
    await userEvent.type(input, 'https://github.com/metacall/core');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    const branchSelect = await screen.findByDisplayValue('main');

    await userEvent.selectOptions(branchSelect, 'dev');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await act(async () => {
      resolveDev();
    });

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    await act(async () => {
      resolveMain();
    });

    await new Promise(r => setTimeout(r, 50));
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.queryByText('Node.js')).not.toBeInTheDocument();
  });
});
