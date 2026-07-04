import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'csv';
    const businessAccountId = url.searchParams.get('business_account_id');

    // Build query: user's own deliveries or business account deliveries
    let query = { customer_email: user.email };
    if (businessAccountId) {
      const account = await base44.asServiceRole.entities.BusinessAccount.get(businessAccountId);
      if (account && (account.account_owner_email === user.email || account.business_email === user.email || user.role === 'admin')) {
        query = { business_account_id: businessAccountId };
      }
    }

    const moves = await base44.asServiceRole.entities.MoveRequest.filter(query, '-created_date', 500);

    // Fetch proof of delivery for completed moves
    const moveIds = moves.map(m => m.id);
    const proofs = await base44.asServiceRole.entities.ProofOfDelivery.filter({
      move_request_id: { $in: moveIds }
    }).catch(() => []);
    const proofMap = {};
    for (const p of proofs) proofMap[p.move_request_id] = p;

    if (format === 'csv') {
      const headers = ['Date', 'Status', 'Category', 'Pickup', 'Dropoff', 'Items', 'Distance (mi)', 'Total Price', 'Driver', 'Requires Signature', 'Temperature Controlled', 'Proof of Delivery', 'Recipient'];
      const rows = moves.map(m => [
        m.created_date ? new Date(m.created_date).toLocaleDateString() : '',
        m.status || '',
        m.delivery_category || '',
        (m.pickup_address || '').replace(/,/g, ';'),
        (m.dropoff_address || '').replace(/,/g, ';'),
        (m.items_summary || '').replace(/,/g, ';'),
        m.distance_miles || 0,
        m.total_price || 0,
        (m.assigned_driver_name || '').replace(/,/g, ';'),
        m.requires_signature ? 'Yes' : 'No',
        m.temperature_controlled ? 'Yes' : 'No',
        proofMap[m.id] ? 'Yes' : 'No',
        proofMap[m.id]?.recipient_name || ''
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=delivery-history.csv'
        }
      });
    }

    return Response.json({ moves: moves, proofs: proofMap });
  } catch (error) {
    console.error('export-delivery-history error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});