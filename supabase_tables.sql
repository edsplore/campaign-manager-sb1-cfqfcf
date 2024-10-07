-- Modify the existing campaigns table to add the hasRun column
ALTER TABLE campaigns
ADD COLUMN hasRun BOOLEAN DEFAULT false;

-- Create the contacts table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    campaignId INTEGER REFERENCES campaigns(id),
    phoneNumber TEXT NOT NULL,
    firstName TEXT NOT NULL,
    callId TEXT
);

-- Create the call_logs table
CREATE TABLE call_logs (
    id SERIAL PRIMARY KEY,
    campaignId INTEGER REFERENCES campaigns(id),
    phoneNumber TEXT NOT NULL,
    firstName TEXT NOT NULL,
    callId TEXT NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_contacts_campaignId ON contacts(campaignId);
CREATE INDEX idx_call_logs_campaignId ON call_logs(campaignId);