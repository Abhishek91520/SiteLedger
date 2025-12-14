# Supabase Storage Setup Guide

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"**
5. Fill in the details:
   - **Name:** `flat-images`
   - **Public bucket:** ❌ **NO** (keep it private)
   - **File size limit:** 5MB (recommended)
   - **Allowed MIME types:** Leave empty (or specify: image/jpeg, image/png, image/webp)
6. Click **"Create bucket"**

## Step 2: Apply Storage Policies

1. After creating the bucket, go to **Storage** → **Policies**
2. Click on **"New policy"** for the `flat-images` bucket
3. Click **"Create policy"** and select **"For full customization"**
4. Go to the **SQL Editor** in Supabase Dashboard
5. Copy and paste the contents of `sql/storage_setup.sql`
6. Click **"Run"**

## Step 3: Verify Setup

Run this query in SQL Editor to verify policies are created:

```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

You should see 4 policies for flat-images bucket:
- Authenticated users can upload flat images
- Authenticated users can view flat images
- Authenticated users can delete flat images
- Authenticated users can update flat images

## Storage Path Structure

Images will be stored with this path pattern:
```
flat-images/{flat_id}/{timestamp}_{filename}
```

Example:
```
flat-images/123e4567-e89b-12d3-a456-426614174000/1702540800000_bathroom.jpg
```

## Testing Upload

Once setup is complete, you can test by:
1. Go to **Bulk Update** page
2. Select a wing and work item
3. Click on any flat card
4. The enhanced modal will open
5. Try uploading an image (max 10 images per flat)

---

**Important:** Make sure your Supabase URL and anon key are correctly set in your `.env` file before testing uploads!
