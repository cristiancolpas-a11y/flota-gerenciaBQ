import React from 'react';
import { Vehicle, AvailabilityRecord, FleetComposition, AvailabilitySummary } from '../types';
import AvailabilityModule from './AvailabilityModule';

interface AvailabilityIndicatorsProps {
  vehicles: Vehicle[];
  availabilityRecords: AvailabilityRecord[];
  availabilitySummary: AvailabilitySummary[];
  fleetComposition: FleetComposition[];
}

export const AvailabilityIndicators: React.FC<AvailabilityIndicatorsProps> = ({
  availabilityRecords,
  availabilitySummary
}) => {
  return (
    <AvailabilityModule 
      availability={availabilityRecords}
      availabilityPct={availabilitySummary}
    />
  );
};

export default AvailabilityIndicators;
