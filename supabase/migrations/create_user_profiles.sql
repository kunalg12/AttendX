-- Create profile entry for existing admin user
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT 
  id,
  'admin.attendx@yopmail.com',
  'Admin User',
  'teacher',
  NOW()
FROM auth.users
WHERE email = 'admin.attendx@yopmail.com';

-- Create profile entry for existing teacher user (if exists)
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT 
  id,
  'teacher.attendx@yopmail.com',
  'Teacher User',
  'teacher',
  NOW()
FROM auth.users
WHERE email = 'teacher.attendx@yopmail.com';
