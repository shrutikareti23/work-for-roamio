import { fireEvent, render, screen } from '@testing-library/react-native';

import AccountScreen from '@/app/(tabs)/account';
import PlanScreen from '@/app/(tabs)/index';
import TripsScreen from '@/app/(tabs)/trips';
import SignUpScreen from '@/app/auth/sign-up';
import { useAuth } from '@/lib/session';

jest.mock('@/lib/session', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/profile', () => ({
  getProfile: jest.fn(async () => ({ ok: true, data: { id: 'u1', displayName: 'Shrutika' } })),
  updateDisplayName: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissAll: jest.fn() },
  Link: ({ children }: { children: unknown }) => children,
}));

const mockAuth = useAuth as jest.Mock;
const signedOut = { session: null, loading: false, recovering: false, setRecovering: jest.fn() };
const signedIn = {
  ...signedOut,
  session: { user: { id: 'u1', email: 'shrutika@example.com' } },
};

beforeEach(() => mockAuth.mockReturnValue(signedOut));

describe('tab screens render', () => {
  it('Plan shows its heading and a disabled start button', async () => {
    await render(<PlanScreen />);
    expect(screen.getByText('Where to next?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start planning' })).toBeDisabled();
  });

  it('Trips shows the empty state', async () => {
    await render(<TripsScreen />);
    expect(screen.getByText('No trips yet')).toBeTruthy();
  });
});

describe('Account tab', () => {
  it('signed out: offers sign in and create account, plus attributions', async () => {
    await render(<AccountScreen />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete my account' })).toBeNull();
    expect(await screen.findByText('Server not configured yet.')).toBeTruthy();
    expect(screen.getByText(/Open-Meteo\.com \(CC BY 4\.0\)/)).toBeTruthy();
  });

  it('signed in: shows the email, sign out and delete account', async () => {
    mockAuth.mockReturnValue(signedIn);
    await render(<AccountScreen />);
    expect(screen.getByText('shrutika@example.com')).toBeTruthy();
    expect(await screen.findByText('Hi, Shrutika')).toBeTruthy();
    expect(screen.getByLabelText('Your name').props.value).toBe('Shrutika');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeTruthy();
  });
});

describe('Sign-up form', () => {
  it('explains what is wrong before contacting the server', async () => {
    await render(<SignUpScreen />);
    expect(screen.getByLabelText('Your name (optional)')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Please enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
  });
});
