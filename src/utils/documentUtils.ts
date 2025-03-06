import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';

export async function checkDocumentDeadlines() {
  try {
    // Fetch documents past their expiry date
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id, 
        name, 
        studio_id, 
        expires_at, 
        requires_signature,
        document_recipients (
          id, 
          user_id, 
          signed_at, 
          viewed_at,
          user:users(id, name, email)
        )
      `)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;

    // Process each document
    for (const doc of documents) {
      // Find unprocessed recipients
      const unprocessedRecipients = doc.document_recipients.filter(
        (recipient) => 
          !recipient.signed_at && 
          (!doc.requires_signature && !recipient.viewed_at)
      );

      // Notify studio owners
      const { data: owners } = await supabase
        .from('users')
        .select('id')
        .eq('studio_id', doc.studio_id)
        .eq('role', 'owner');

      // Send notifications to owners
      for (const owner of owners) {
        await notificationService.createNotification({
          user_id: owner.id,
          studio_id: doc.studio_id,
          type: 'document_deadline_missed',
          title: 'Document Deadline Passed',
          message: `${unprocessedRecipients.length} recipient(s) did not ${doc.requires_signature ? 'sign' : 'view'} "${doc.name}"`,
          priority: 'high',
          entity_id: doc.id,
          entity_type: 'document',
          requires_action: true,
          email_required: true
        });
      }

      // Notify individual recipients
      for (const recipient of unprocessedRecipients) {
        await notificationService.createNotification({
          user_id: recipient.user_id,
          studio_id: doc.studio_id,
          type: 'document_deadline_missed',
          title: 'Document Deadline Passed',
          message: `The deadline for "${doc.name}" has passed. Please ${doc.requires_signature ? 'sign' : 'view'} the document.`,
          priority: 'high',
          entity_id: doc.id,
          entity_type: 'document',
          requires_action: true,
          email_required: true
        });
      }
    }
  } catch (err) {
    console.error('Document deadline check error:', err);
  }
}