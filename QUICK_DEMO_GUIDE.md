# Quick Demo Guide - Vani-Chitra

## Current Status
✅ Frontend: Working at http://localhost:3000
✅ AWS Backend: Deployed and functional
✅ Image Upload: Working
⚠️ Audio Transcription: May have issues

## For Your Prototype Demo TODAY

### Option 1: Use Current AWS Setup (Recommended if working)
1. Test the app now
2. If it works end-to-end, you're done!
3. API URL: https://b5jozygvm9.execute-api.us-east-1.amazonaws.com/prod

### Option 2: Use Mock Server (Guaranteed to work)
If AWS has any issues, immediately switch to mock:

1. Keep frontend running
2. Update `frontend/.env`:
   ```
   REACT_APP_API_GATEWAY_URL=http://localhost:3001/api
   ```
3. Restart frontend: `cd frontend && npm start`
4. The mock will return sample data for demo

## Demo Flow
1. Open http://localhost:3000
2. Select language (Hindi)
3. Click camera icon → capture/upload image
4. Click microphone → record 2-3 seconds
5. Click "Create Story" button
6. Show the 3-panel storyboard result

## If Something Breaks
- Browser console (F12) will show errors
- Most common: CORS or Lambda timeout
- Quick fix: Use mock server (see Option 2)

## Files Location
- Frontend: `D:\vani\frontend`
- Backend: `D:\vani\Backend` (new SAM template)
- AWS: Already deployed

## Important
- Don't try to redeploy during demo
- Test once before submission
- Have mock server ready as backup

Good luck! 🚀
