import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lead_id, message_type, channel, additional_context } = body;

    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const validMessageTypes = ['initial_outreach', 'follow_up', 'referral', 'qualifier'];
    const validChannels = ['email', 'sms', 'phone_script', 'social_dm', 'general'];

    const msgType = message_type || 'initial_outreach';
    const ch = channel || 'email';

    if (!validMessageTypes.includes(msgType)) {
      return Response.json({ error: `Invalid message_type. Must be one of: ${validMessageTypes.join(', ')}` }, { status: 400 });
    }
    if (!validChannels.includes(ch)) {
      return Response.json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` }, { status: 400 });
    }

    // Fetch the lead
    const lead = await base44.entities.Lead.get(lead_id);
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const messageTypeLabels = {
      initial_outreach: 'an initial outreach message to introduce GO and gauge interest',
      follow_up: 'a follow-up message for a lead that hasn\'t responded yet',
      referral: 'a referral message directing the lead to book on the GO platform',
      qualifier: 'a message with qualifying questions to determine move details',
    };

    const channelLabels = {
      email: 'email (include a subject line and body)',
      sms: 'SMS text message (concise, under 160 characters if possible)',
      phone_script: 'phone call script with conversation flow and talking points',
      social_dm: 'social media direct message (casual and friendly)',
      general: 'general message suitable for any channel',
    };

    const isBusiness = lead.lead_type === 'business';

    const prompt = `You are a lead outreach specialist for GO, a moving & logistics marketplace platform. GO connects customers who need things moved (residential moves, freight, corporate logistics, courier deliveries) with verified drivers.

Task: Generate ${messageTypeLabels[msgType]} for the following lead.

Lead details:
- Name: ${lead.lead_name}
- Type: ${lead.lead_type || 'person'}
- Location: ${lead.location}
- Moving reason: ${lead.moving_reason || 'Not specified'}
- Move timeline: ${lead.move_timeline || 'Not specified'}
- Contact info: ${lead.contact_info || 'Not specified'}
- Source: ${lead.source || 'Not specified'}

Channel: ${channelLabels[ch]}

${additional_context ? `Additional context from the admin: ${additional_context}` : ''}

Use web search to research:
1. Best practices for lead outreach in the moving/logistics industry in 2026
2. What messaging resonates with ${isBusiness ? 'businesses' : 'individuals'} looking for moving services
3. Current competitive positioning and value propositions

GO platform links to include:
- For residential/freight moves: /new-move
- For courier/delivery: /quick-delivery
- For business accounts: /business-account
- For business plans: /business-plans

GO's key benefits for leads:
- Instant driver dispatch — matched with a verified driver quickly
- Transparent upfront pricing — no hidden fees
- Real-time GPS tracking of the move
- Verified, background-checked drivers
- Supports residential moves, freight, corporate logistics, and courier deliveries
- Business accounts with subscription plans (Starter $49/mo, Professional $199/mo, Enterprise $499/mo)
- Recurring delivery scheduling for businesses
- Storage facility finder
- Insurance options available

${isBusiness ? 'This is a business lead — emphasize reliability, tracking, recurring deliveries, and enterprise solutions.' : 'This is a personal lead — emphasize affordability, speed, and ease of booking.'}

Make the message personalized using the lead's specific details. Include a clear call to action directing them to the GO platform.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          subject_line: { type: 'string', description: 'Email subject line (empty for non-email channels)' },
          content: { type: 'string', description: 'The full outreach message text, ready to copy and paste' },
          key_points: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key selling points used in the message'
          },
          next_steps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recommended next steps for the admin'
          },
        },
        required: ['content'],
      },
    });

    const message = await base44.entities.LeadMessage.create({
      lead_id: lead.id,
      lead_name: lead.lead_name,
      message_type: msgType,
      channel: ch,
      content: result.content,
      subject_line: result.subject_line || '',
      status: 'draft',
    });

    // Update lead status to 'contacted' if this was initial outreach and lead is still 'new'
    if (msgType === 'initial_outreach' && lead.status === 'new') {
      await base44.entities.Lead.update(lead.id, { status: 'contacted' });
    }

    return Response.json({
      message,
      key_points: result.key_points || [],
      next_steps: result.next_steps || [],
      lead_updated: msgType === 'initial_outreach' && lead.status === 'new',
    });
  } catch (error) {
    console.error('Lead outreach generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});