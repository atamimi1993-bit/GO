import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.error('match-lead-vehicles auth failed:', authErr.message);
      return Response.json({ error: 'Authentication required', code: 'AUTH_FAILED' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let trustedUser;
    try {
      trustedUser = await base44.entities.User.get(user.id);
    } catch (lookupErr) {
      console.error('match-lead-vehicles user lookup failed:', lookupErr.message);
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    if (!trustedUser || trustedUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'assign') {
      const { lead_id, vehicle_rental_id, driver_id } = body;
      if (!lead_id || !vehicle_rental_id || !driver_id) {
        return Response.json({ error: 'lead_id, vehicle_rental_id, and driver_id are required' }, { status: 400 });
      }

      const [lead, vehicle, driver] = await Promise.all([
        base44.asServiceRole.entities.Lead.get(lead_id),
        base44.asServiceRole.entities.VehicleRental.get(vehicle_rental_id),
        base44.asServiceRole.entities.DriverProfile.get(driver_id),
      ]);

      if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });
      if (!vehicle) return Response.json({ error: 'Vehicle not found' }, { status: 404 });
      if (!driver) return Response.json({ error: 'Driver not found' }, { status: 404 });

      // Verify driver is certified for heavy vehicles
      const HEAVY_TYPES = ['box_truck', 'flatbed', 'semi', 'bus', 'trailer'];
      const isHeavy = HEAVY_TYPES.includes(vehicle.vehicle_type);
      if (isHeavy && !driver.cdl_certified) {
        return Response.json({ error: `This vehicle (${vehicle.vehicle_type}) requires a CDL-certified driver` }, { status: 400 });
      }

      const vehicleTitle = `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim();

      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, {
        matched_vehicle_rental_id: vehicle_rental_id,
        matched_vehicle_title: vehicleTitle,
        matched_driver_id: driver_id,
        matched_driver_name: driver.full_name,
        assignment_status: 'assigned',
      });

      return Response.json({ success: true, lead: updated });
    }

    // Default action: match
    const { lead_id } = body;
    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const lead = await base44.asServiceRole.entities.Lead.get(lead_id);
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const [vehicles, drivers] = await Promise.all([
      base44.asServiceRole.entities.VehicleRental.filter({ status: 'active', available: true }, '-created_date', 500),
      base44.asServiceRole.entities.DriverProfile.filter({ status: 'approved', available: true }, '-created_date', 500),
    ]);

    // Parse lead location into searchable tokens
    const leadLocation = (lead.location || '').trim().toLowerCase();
    const leadTokens = leadLocation.split(/[,\s]+/).filter((t) => t.length > 1);

    const locationMatch = (vehicleLoc) => {
      if (!vehicleLoc) return false;
      const loc = vehicleLoc.toLowerCase();
      // Direct match on any token
      if (leadTokens.some((t) => loc.includes(t))) return true;
      // State abbreviation match (e.g., "GA" in "Atlanta, GA")
      const leadParts = leadLocation.split(',').map((p) => p.trim());
      const leadState = leadParts.length > 1 ? leadParts[leadParts.length - 1] : '';
      if (leadState.length >= 2 && loc.includes(leadState)) return true;
      return false;
    };

    const HEAVY_TYPES = ['box_truck', 'flatbed', 'semi', 'bus', 'trailer'];

    // Find drivers whose service area matches the lead location
    const matchedDrivers = drivers.filter((d) => {
      if (!d.service_area) return false;
      const area = d.service_area.toLowerCase();
      return leadTokens.some((t) => area.includes(t)) ||
        (leadLocation.split(',').length > 1 && area.includes(leadLocation.split(',').pop().trim()));
    });

    // Find vehicles whose city/state matches the lead location
    const matchedVehicles = vehicles.filter((v) => {
      const vehicleLoc = `${v.city || ''} ${v.state || ''}`.trim();
      return locationMatch(vehicleLoc);
    });

    // Build vehicle → driver pairings
    // For each vehicle, find certified drivers who can operate it
    const pairings = matchedVehicles.map((vehicle) => {
      const isHeavy = HEAVY_TYPES.includes(vehicle.vehicle_type);
      const eligibleDrivers = matchedDrivers.filter((d) => {
        if (isHeavy && !d.cdl_certified) return false;
        return true;
      });

      return {
        vehicle: {
          id: vehicle.id,
          title: `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim(),
          vehicle_type: vehicle.vehicle_type,
          capacity_lbs: vehicle.capacity_lbs || 0,
          daily_rate: vehicle.daily_rate || 0,
          city: vehicle.city || '',
          state: vehicle.state || '',
          owner_name: vehicle.owner_name || '',
          owner_email: vehicle.owner_email || '',
          is_heavy: isHeavy,
          requires_cdl: isHeavy,
        },
        drivers: eligibleDrivers.map((d) => ({
          id: d.id,
          full_name: d.full_name,
          company_name: d.company_name || null,
          cdl_certified: d.cdl_certified || false,
          cdl_class: d.cdl_class || 'None',
          rating: d.rating || 5.0,
          total_jobs: d.total_jobs || 0,
          phone: d.phone || '',
          email: d.email || '',
          service_area: d.service_area || '',
        })),
      };
    }).filter((p) => p.drivers.length > 0); // Only show vehicles that have at least one eligible driver

    // Sort: heavy vehicles with CDL drivers first, then by capacity
    pairings.sort((a, b) => {
      if (a.vehicle.requires_cdl && !b.vehicle.requires_cdl) return -1;
      if (!a.vehicle.requires_cdl && b.vehicle.requires_cdl) return 1;
      return (b.vehicle.capacity_lbs || 0) - (a.vehicle.capacity_lbs || 0);
    });

    return Response.json({
      lead: {
        id: lead.id,
        lead_name: lead.lead_name,
        location: lead.location,
        moving_reason: lead.moving_reason,
        assignment_status: lead.assignment_status || 'unassigned',
        matched_vehicle_title: lead.matched_vehicle_title || null,
        matched_driver_name: lead.matched_driver_name || null,
      },
      pairings,
      total_vehicles: pairings.length,
      total_drivers: matchedDrivers.length,
    });
  } catch (error) {
    console.error('match-lead-vehicles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});