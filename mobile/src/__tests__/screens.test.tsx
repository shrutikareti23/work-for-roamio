import { render, screen } from '@testing-library/react-native';

import AccountScreen from '@/app/account';
import PlanScreen from '@/app/index';
import TripsScreen from '@/app/trips';

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

  it('Account shows server status and attributions', async () => {
    await render(<AccountScreen />);
    expect(await screen.findByText('Server not configured yet.')).toBeTruthy();
    expect(screen.getByText(/OpenStreetMap contributors \(ODbL\)/)).toBeTruthy();
    expect(screen.getByText(/Open-Meteo\.com \(CC BY 4\.0\)/)).toBeTruthy();
  });
});
