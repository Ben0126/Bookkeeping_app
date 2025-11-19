import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock services to avoid side effects
vi.mock('./services/pwaService', () => ({
    PWAService: {
        initialize: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('./services/offlineSyncService', () => ({
    OfflineSyncService: {
        initialize: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('./services/memoryOptimizationService', () => ({
    MemoryOptimizationService: {
        initialize: vi.fn(),
    },
}));

vi.mock('./services/queryOptimizationService', () => ({
    QueryOptimizationService: {
        preloadCommonData: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('./services/notificationService', () => ({
    NotificationService: {
        startNotificationSystem: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock lazy loaded components to speed up tests and avoid suspense issues if any
vi.mock('./pages/Dashboard', () => ({
    default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', async () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        );

        // Check if the layout is rendered (assuming AppLayout renders some identifiable content or the dashboard)
        // Since AppLayout is not mocked, it should render.
        // The default route is '/', which renders DashboardPage.

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        });
    });
});
