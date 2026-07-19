import { UpcomingLedger } from './UpcomingLedger';
import { Metrics } from './Metrics';

export function Dashboard() {
  return (
    <>
      <Metrics />
      <UpcomingLedger />
    </>
  );
}
