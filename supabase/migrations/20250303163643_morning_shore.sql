/*
  # Messages Schema Update

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `sender_id` (uuid, foreign key)
      - `content` (text)
      - `created_at` (timestamp)
      - `edited_at` (timestamp)
      - `is_deleted` (boolean)

  2. Security
    - Enable RLS on messages table
    - Add policies for conversation participants
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
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