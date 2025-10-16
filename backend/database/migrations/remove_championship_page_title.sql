-- Remove championship_page_title setting from text_settings table
-- This setting is no longer needed as we removed the championship page title display

DELETE FROM text_settings WHERE setting_key = 'championship_page_title';
