import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DAY_MS = 86400000;

function computeNextTrigger(frequency, dayOfWeek, fromTime) {
  const now = new Date(fromTime);
  const today = new Date(now);
  today.setHours(6, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      return new Date(today.getTime() + DAY_MS).toISOString();
    case 'weekly': {
      const targetDay = dayOfWeek || 1;
      let diff = (targetDay - today.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      return new Date(today.getTime() + diff * DAY_MS).toISOString();
    }
    case 'biweekly':
      return new Date(today.getTime() + 14 * DAY_MS).toISOString();
    case 'monthly': {
      const next = new Date(today);
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
    default:
      return new Date(today.getTime() + 7 * DAY_MS).toISOString();
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const recurring = await base44.asServiceRole.entities.RecurringDelivery.filter({
      active: true
    }, '-created_date', 200);

    let created = 0;
    for (const r of recurring) {
      const nextTrigger = r.next_trigger ? new Date(r.next_trigger) : null;
      if (nextTrigger && nextTrigger > now) continue;
      if (r.last_triggered && new Date(r.last_triggered) > now) continue;

      // Create MoveRequest from recurring schedule
      const moveData = {
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        pickup_address: r.pickup_address,
        dropoff_address: r.dropoff_address,
        multi_stop_addresses: r.multi_stop_addresses || undefined,
        move_date: now.toISOString().split('T')[0],
        move_time: r.time_slot,
        job_type: 'courier',
        delivery_category: r.delivery_category,
        items_summary: r.item_description,
        total_weight_lbs: 50,
        truck_size_needed: 'small',
        service_level: 'standard',
        distance_miles: 10,
        country_code: 'US',
        currency: 'USD',
        distance_unit: 'mi',
        base_cost: 20,
        fuel_cost: 5,
        tolls: 0,
        tax_rate: 0.06,
        tax_amount: 1.5,
        app_fee: 8,
        driver_fee: 0,
        total_price: 34.5,
        driver_payout: 15,
        requires_signature: r.requires_signature,
        temperature_controlled: r.temperature_controlled,
        recurring_delivery_id: r.id,
        business_account_id: r.business_account_id || undefined,
        liability_signed: true,
        liability_signed_date: now.toISOString(),
        status: 'pending'
      };

      const move = await base44.asServiceRole.entities.MoveRequest.create(moveData);
      base44.asServiceRole.functions.invoke('auto-dispatch-driver', { move_request_id: move.id }).catch(() => {});
      created++;

      await base44.asServiceRole.entities.RecurringDelivery.update(r.id, {
        last_triggered: now.toISOString(),
        next_trigger: computeNextTrigger(r.frequency, r.day_of_week, now.getTime())
      });
    }

    return Response.json({ processed: true, created, checked: recurring.length });
  } catch (error) {
    console.error('process-recurring-deliveries error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});