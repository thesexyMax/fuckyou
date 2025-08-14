-- Add check-in tracking to event registrations
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS check_in_code TEXT UNIQUE;

-- Create index for faster QR code lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_qr_code ON event_registrations(qr_code);
CREATE INDEX IF NOT EXISTS idx_event_registrations_check_in_code ON event_registrations(check_in_code);

-- Function to generate unique check-in codes
CREATE OR REPLACE FUNCTION generate_check_in_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 12-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 12));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM event_registrations WHERE check_in_code = code) INTO exists;
        
        -- Exit loop if code is unique
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update existing registrations with QR codes and check-in codes
UPDATE event_registrations 
SET 
    qr_code = 'QR_' || id::text,
    check_in_code = generate_check_in_code()
WHERE qr_code IS NULL OR check_in_code IS NULL;

-- Trigger to automatically generate codes for new registrations
CREATE OR REPLACE FUNCTION generate_registration_codes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_code IS NULL THEN
        NEW.qr_code := 'QR_' || NEW.id::text;
    END IF;
    
    IF NEW.check_in_code IS NULL THEN
        NEW.check_in_code := generate_check_in_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_registration_codes ON event_registrations;
CREATE TRIGGER trigger_generate_registration_codes
    BEFORE INSERT ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION generate_registration_codes();
