/*
  # Fix Messages Schema and Relationships

  1. Changes
    - Drop and recreate messages table with proper foreign key relationships
    - Add RLS policies
    - Add performance indexes
    - Add trigger for conversation updates

  2. Security
    - Enable RLS
    - Add policies for conversation participants
*/

-- Drop existing messages table if it exists
DROP TABLE IF EXISTS messages CASCADE;

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  is_deleted boolean DEFAULT false,
  CONSTRAINT valid_content CHECK (length(content) > 0)
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for conversation participants to read messages
CREATE POLICY "Users can read messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Create policy for conversation participants to insert messages
CREATE POLICY "Users can insert messages in their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Create policy for message senders to update their own messages
CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Create policy for message senders to delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Create function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating conversation last message
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();